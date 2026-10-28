const { runTests } = require('@vscode/test-electron');
const path = require('path');
(async () => {
  const [name, extDir, ...dev] = process.argv.slice(2);
  process.env.NB_IN = '/home/user/nimblescape-markdown-notes/research/footnote-notes';
  process.env.NB_OUT = path.join(__dirname, '..', 'out', name);
  await runTests({
    version: '1.143.1',
    extensionDevelopmentPath: [path.join(__dirname, 'runner'), ...dev.map(d => path.join(__dirname, d))],
    extensionTestsPath: path.join(__dirname, 'runner', 'suite.js'),
    launchArgs: ['--extensions-dir=' + path.join(__dirname, extDir), '--user-data-dir=/tmp/nbv/' + name, '--disable-gpu', '--no-sandbox', '--disable-workspace-trust'],
  });
})().catch(e => { console.error('FAILED', e); process.exit(1); });
