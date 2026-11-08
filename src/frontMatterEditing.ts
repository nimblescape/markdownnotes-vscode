// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The schema of the front matter in the text editor of the clean editing view
 * ([R-TEXT-009](../docs/requirements.md#r-text-009), decision 75): each
 * problem of the front matter against the schema of its rules shows as a
 * warning, with its quick fixes, and the schema gives the suggestions of the
 * keys and of their values. A colon or a space after a key opens the
 * suggestions of its values, and Tab or Enter takes the selected one. The
 * logic is in [src/notes/frontMatterRules.ts](notes/frontMatterRules.ts).
 */

import * as vscode from 'vscode';
import { frontMatterCompletions, frontMatterIssues, type FrontMatterRules, type Place } from './notes/frontMatterRules';

/** RulesSource gives the rules of the front matter of the documents of the clean editing view. */
export interface RulesSource {
  /**
   * rulesOf returns the rules of the front matter of a clean document, or undefined without rules or while they load.
   * @param document - The URI of the clean document.
   */
  rulesOf(document: vscode.Uri): FrontMatterRules | undefined;
  /** onDidChangeRules tells the clean document whose rules changed. */
  onDidChangeRules: vscode.Event<vscode.Uri>;
}

/**
 * positionOf returns the position of a place.
 * @param place - The place.
 */
const positionOf = (place: Place): vscode.Position => new vscode.Position(place.line, place.character);

/**
 * rangeOf returns the range between two places.
 * @param from - The first place.
 * @param to - The second place.
 */
const rangeOf = (from: Place, to: Place): vscode.Range => new vscode.Range(positionOf(from), positionOf(to));

/** source is the name of the extension in the problems. */
const source = 'Markdown Notes';

/**
 * registerFrontMatterEditing registers the problems, the quick fixes and the suggestions of the schema of the front
 * matter for the documents of a scheme.
 * @param scheme - The scheme of the documents of the clean editing view.
 * @param rules - The rules of the documents.
 */
export function registerFrontMatterEditing(scheme: string, rules: RulesSource): vscode.Disposable[] {
  const collection = vscode.languages.createDiagnosticCollection('markdownNotes.frontMatter');
  const check = (document: vscode.TextDocument): void => {
    if (document.uri.scheme !== scheme) {
      return;
    }
    const found = rules.rulesOf(document.uri);
    collection.set(
      document.uri,
      found
        ? frontMatterIssues(document.getText(), found).map((issue) => {
            const diagnostic = new vscode.Diagnostic(rangeOf(issue.from, issue.to), issue.message, vscode.DiagnosticSeverity.Warning);
            diagnostic.source = source;
            return diagnostic;
          })
        : [],
    );
  };
  for (const document of vscode.workspace.textDocuments) {
    check(document);
  }
  return [
    collection,
    vscode.workspace.onDidOpenTextDocument(check),
    vscode.workspace.onDidChangeTextDocument((event) => check(event.document)),
    vscode.workspace.onDidCloseTextDocument((document) => collection.delete(document.uri)),
    rules.onDidChangeRules((uri) => {
      const document = vscode.workspace.textDocuments.find((candidate) => candidate.uri.toString() === uri.toString());
      if (document) {
        check(document);
      }
    }),
    vscode.languages.registerCodeActionsProvider(
      { scheme },
      {
        provideCodeActions: (document, range, context) => {
          const found = rules.rulesOf(document.uri);
          if (!found) {
            return [];
          }
          return frontMatterIssues(document.getText(), found)
            .filter((issue) => {
              const place = rangeOf(issue.from, issue.to);
              return place.contains(range.start) || range.contains(place.start);
            })
            .flatMap((issue) =>
              issue.fixes.map((fix) => {
                const action = new vscode.CodeAction(fix.title, vscode.CodeActionKind.QuickFix);
                action.edit = new vscode.WorkspaceEdit();
                action.edit.replace(document.uri, rangeOf(fix.from, fix.to), fix.text);
                action.diagnostics = context.diagnostics.filter((diagnostic) => diagnostic.message === issue.message && diagnostic.range.start.line === issue.from.line);
                action.isPreferred = fix.preferred;
                return action;
              }),
            );
        },
      },
      { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] },
    ),
    vscode.languages.registerCompletionItemProvider(
      { scheme },
      {
        provideCompletionItems: (document, position) => {
          const found = rules.rulesOf(document.uri);
          if (!found) {
            return undefined;
          }
          return frontMatterCompletions(document.getText(), { line: position.line, character: position.character }, found).map((completion, index) => {
            const item = new vscode.CompletionItem(completion.label, completion.kind === 'key' ? vscode.CompletionItemKind.Property : vscode.CompletionItemKind.EnumMember);
            item.insertText = completion.snippet ? new vscode.SnippetString(completion.snippet) : completion.text;
            item.range = rangeOf(completion.from, completion.to);
            item.filterText = completion.filter;
            item.sortText = String(index).padStart(4, '0');
            item.preselect = completion.preferred;
            if (completion.detail) {
              item.detail = completion.detail;
            }
            if (completion.documentation) {
              item.documentation = completion.documentation;
            }
            return item;
          });
        },
      },
      ':',
      ' ',
    ),
  ];
}
