// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The start of the command line tool of the formatter in Node.js ([R-FMT-004](../../docs/requirements.md#r-fmt-004)):
 * it runs [cli.ts](cli.ts) with the arguments of the command line, the files of the disk in UTF-8 and the standard
 * streams, and ends with its exit code.
 */

import * as fs from 'node:fs';
import { run } from './cli';

process.exitCode = run(process.argv.slice(2), {
  readFile: (path) => fs.readFileSync(path, 'utf8'),
  writeFile: (path, text) => fs.writeFileSync(path, text, 'utf8'),
  readStdin: () => fs.readFileSync(0, 'utf8'),
  writeStdout: (text) => process.stdout.write(text),
  out: (line) => process.stdout.write(`${line}\n`),
  err: (line) => process.stderr.write(`${line}\n`),
});
