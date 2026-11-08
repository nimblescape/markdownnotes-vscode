// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The keys of Go Back and Go Forward of VS Code for the way back after a jump in the Markdown Editor and in the Markdown
 * preview ([R-TEXT-011](../docs/requirements.md#r-text-011)): the keys that the user binds to the commands Go Back and
 * Go Forward, for example Option+Cmd+Left, and not only their default keys. VS Code gives an extension no API for its
 * keyboard shortcuts, so the extension reads them as VS Code shows them: the default keyboard shortcuts with those of
 * the extensions, for example of a keymap extension, from the document `vscode://defaultsettings/keybindings.json`, and
 * the keyboard shortcuts of the user from the file `keybindings.json` in the folder of the user, next to the folder
 * `globalStorage` of the extensions. In a remote window, that folder is on the other computer, so only the default
 * keyboard shortcuts apply there. The keys change when an extension comes or goes, and the file of the user is read
 * again when the window gets the focus, when the user switches a tab, for example back from the editor of the keyboard
 * shortcuts, and when the user saves the file.
 */

import * as vscode from 'vscode';
import { type JumpKeys, type VsCodeKeybinding, vscodeJumpKeysOf, vscodeKeybindingRules } from '@nimblescape/markdownrender/jumps';

/** defaultKeybindings is the document of VS Code with its default keyboard shortcuts and those of the extensions. */
export const defaultKeybindings = 'vscode://defaultsettings/keybindings.json';

/** userKeybindingsOf returns the file of the keyboard shortcuts of the user from the folder of the extension's data. */
export function userKeybindingsOf(globalStorage: vscode.Uri): vscode.Uri {
  return vscode.Uri.joinPath(globalStorage, '..', '..', 'keybindings.json');
}

/** sameKeys tells whether two sets of keys are the same. */
export function sameKeys(a: JumpKeys | undefined, b: JumpKeys | undefined): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

/** readDelay is the time in milliseconds to wait after an event before the file of the user is read again. */
const readDelay = 300;

/** VsCodeJumpKeys holds the keys of Go Back and Go Forward of VS Code and tells their changes. */
export class VsCodeJumpKeys implements vscode.Disposable {
  private defaults: readonly VsCodeKeybinding[] | undefined;
  private user: readonly VsCodeKeybinding[] = [];
  private current: JumpKeys | undefined;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private readonly changes = new vscode.EventEmitter<JumpKeys>();
  private readonly subscriptions: vscode.Disposable[] = [];
  /** onDidChange tells the new keys after a change. */
  readonly onDidChange = this.changes.event;

  /**
   * @param userFile - The file of the keyboard shortcuts of the user, or undefined when the extension cannot read it.
   */
  constructor(private readonly userFile: vscode.Uri | undefined) {
    this.subscriptions.push(
      this.changes,
      vscode.extensions.onDidChange(() => void this.read(true)),
      vscode.window.onDidChangeWindowState((state) => {
        if (state.focused) {
          this.schedule();
        }
      }),
      vscode.window.tabGroups.onDidChangeTabs(() => this.schedule()),
      vscode.workspace.onDidSaveTextDocument((document) => {
        if (this.userFile && document.uri.toString() === this.userFile.toString()) {
          this.schedule();
        }
      }),
    );
    void this.read(true);
  }

  /** keys are the keys of now, or undefined until the extension read them. */
  get keys(): JumpKeys | undefined {
    return this.current;
  }

  /** schedule reads the file of the user again after a moment, once for a series of events. */
  private schedule(): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.read(false), readDelay);
  }

  /**
   * read reads the keyboard shortcuts and tells a change of the keys.
   * @param defaults - Reads the default keyboard shortcuts again too.
   */
  private async read(defaults: boolean): Promise<void> {
    if (defaults || !this.defaults) {
      try {
        const document = await vscode.workspace.openTextDocument(vscode.Uri.parse(defaultKeybindings));
        this.defaults = vscodeKeybindingRules(document.getText());
      } catch {
        this.defaults = [];
      }
    }
    if (this.userFile) {
      try {
        this.user = vscodeKeybindingRules(new TextDecoder().decode(await vscode.workspace.fs.readFile(this.userFile)));
      } catch {
        // Without the file, the user has no keyboard shortcuts of their own.
        this.user = [];
      }
    }
    // Without the default keyboard shortcuts, the pages keep the default keys of their platform.
    const keys = this.defaults.length > 0 ? vscodeJumpKeysOf([...this.defaults, ...this.user]) : undefined;
    if (keys && !sameKeys(keys, this.current)) {
      this.current = keys;
      this.changes.fire(keys);
    }
  }

  dispose(): void {
    clearTimeout(this.timer);
    this.subscriptions.forEach((subscription) => subscription.dispose());
  }
}
