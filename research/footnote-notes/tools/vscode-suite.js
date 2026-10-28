const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
exports.run = async function () {
  const inDir = process.env.NB_IN, outDir = process.env.NB_OUT;
  fs.mkdirSync(outDir, { recursive: true });
  const md = vscode.extensions.getExtension('vscode.markdown-language-features');
  await md.activate();
  const exts = vscode.extensions.all.filter(e => !e.id.startsWith('vscode.')).map(e => e.id + '@' + e.packageJSON.version);
  fs.writeFileSync(path.join(outDir, '_extensions.txt'), exts.join('\n') + '\n');
  const files = [path.join(inDir, 'proposal.md'), ...fs.readdirSync(path.join(inDir, 'cases')).map(f => path.join(inDir, 'cases', f))];
  for (const f of files) {
    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(f));
    const html = await vscode.commands.executeCommand('markdown.api.render', doc);
    fs.writeFileSync(path.join(outDir, path.basename(f, '.md') + '.html'), html);
  }
  // Diagnostics of the Markdown language server for the proposal
  await vscode.workspace.getConfiguration('markdown').update('validate.enabled', true, vscode.ConfigurationTarget.Global);
  const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(files[0]));
  await vscode.window.showTextDocument(doc);
  await new Promise(r => setTimeout(r, 8000));
  const diags = vscode.languages.getDiagnostics(doc.uri).map(d => `${d.range.start.line + 1}:${d.range.start.character + 1} ${d.source} ${d.code && (d.code.value || d.code)} ${d.message}`);
  fs.writeFileSync(path.join(outDir, '_diagnostics.txt'), diags.join('\n') + '\n');
};
