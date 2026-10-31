<!--
SPDX-License-Identifier: MIT
© 2026 Hannes Stauss (scalarion@nimblescape.com)
Licensed under the MIT License. See LICENSE in the repository root for details.
-->

# Third-party notices

The script of nimblescape Markdown Notes, `dist/extension.js`, contains the
Markdown parser markdown-it with the packages that it uses. The extension
finds the notes of a Markdown file with it, as the Markdown preview of
VS Code does. The command `markdownnotes` of the npm package
`@nimblescape/markdownnotes`, `cli/dist/markdownnotes.js`, contains the
same packages, and the npm package holds this file. This file names each of these packages, its
license and the place of its source code. The code of the extension itself is under the
[MIT License](https://github.com/nimblescape/markdownnotes-vscode/blob/main/LICENSE).

The Markdown preview renders the callouts of the notes with its own copy of
markdown-it, which is part of VS Code, not of this package.

The visual editor of the side view, `dist/visualEditor.js` with its styles
`dist/visualEditor.css` and the icon font `dist/codicon.ttf`, contains the
editor of the mode "Markdown Editor" of VS Code, the package
`@vscode/markdown-editor`, with the packages that it uses. The npm package
`@nimblescape/markdownnotes` holds none of them.

| Package in `dist/extension.js` | Version | License |
| --- | --- | --- |
| [markdown-it](#markdown-it) | 14.3.3 | MIT |
| [entities](#entities) | 4.5.0 | BSD-2-Clause |
| [linkify-it](#linkify-it) | 5.0.2 | MIT |
| [mdurl](#mdurl) | 2.1.0 | MIT |
| [punycode.js](#punycodejs) | 2.3.1 | MIT |
| [uc.micro](#ucmicro) | 2.1.0 | MIT |

| Package in `dist/visualEditor.js`, `dist/visualEditor.css` and `dist/codicon.ttf` | Version | License |
| --- | --- | --- |
| [@vscode/markdown-editor](#vscodemarkdown-editor) | 0.0.2-162 | MIT |
| [@vscode/observables](#vscodeobservables) | 0.1.1-0 | MIT |
| [@vscode/diff](#vscodediff) | 0.0.2-0 | MIT |
| [@vscode/codicons](#vscodecodicons) | 0.0.46-36 | CC-BY-4.0 |
| [katex](#katex) | 0.16.47 | MIT |
| [entities](#entities) | 6.0.1 | BSD-2-Clause |
| [micromark](#micromark) | 4.0.3 | MIT |
| [micromark-core-commonmark](#micromark-core-commonmark) | 2.0.4 | MIT |
| [micromark-extension-frontmatter](#micromark-extension-frontmatter) | 2.0.0 | MIT |
| [micromark-extension-gfm-autolink-literal](#micromark-extension-gfm-autolink-literal) | 2.1.0 | MIT |
| [micromark-extension-gfm-strikethrough](#micromark-extension-gfm-strikethrough) | 2.1.0 | MIT |
| [micromark-extension-gfm-table](#micromark-extension-gfm-table) | 2.1.2 | MIT |
| [micromark-extension-gfm-task-list-item](#micromark-extension-gfm-task-list-item) | 2.1.0 | MIT |
| [micromark-extension-math](#micromark-extension-math) | 3.1.0 | MIT |
| [micromark-factory-destination](#micromark-factory-destination) | 2.0.1 | MIT |
| [micromark-factory-label](#micromark-factory-label) | 2.0.1 | MIT |
| [micromark-factory-space](#micromark-factory-space) | 2.1.0 | MIT |
| [micromark-factory-title](#micromark-factory-title) | 2.0.1 | MIT |
| [micromark-factory-whitespace](#micromark-factory-whitespace) | 2.0.1 | MIT |
| [micromark-util-character](#micromark-util-character) | 2.1.1 | MIT |
| [micromark-util-chunked](#micromark-util-chunked) | 2.0.1 | MIT |
| [micromark-util-classify-character](#micromark-util-classify-character) | 2.0.1 | MIT |
| [micromark-util-combine-extensions](#micromark-util-combine-extensions) | 2.0.1 | MIT |
| [micromark-util-decode-numeric-character-reference](#micromark-util-decode-numeric-character-reference) | 2.0.2 | MIT |
| [micromark-util-decode-string](#micromark-util-decode-string) | 2.0.1 | MIT |
| [micromark-util-edit-map](#micromark-util-edit-map) | 1.0.0 | MIT |
| [micromark-util-encode](#micromark-util-encode) | 2.0.1 | MIT |
| [micromark-util-html-tag-name](#micromark-util-html-tag-name) | 2.0.1 | MIT |
| [micromark-util-normalize-identifier](#micromark-util-normalize-identifier) | 2.0.1 | MIT |
| [micromark-util-resolve-all](#micromark-util-resolve-all) | 2.0.1 | MIT |
| [micromark-util-sanitize-uri](#micromark-util-sanitize-uri) | 2.0.1 | MIT |
| [micromark-util-subtokenize](#micromark-util-subtokenize) | 2.1.0 | MIT |
| [decode-named-character-reference](#decode-named-character-reference) | 1.3.0 | MIT |
| [fault](#fault) | 2.0.1 | MIT |
| [format](#format) | 0.2.2 | MIT |

## markdown-it

Source code: <https://github.com/markdown-it/markdown-it>. Its license:

```text
Copyright (c) 2014 Vitaly Puzrin, Alex Kocharin.

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.
```

## entities

Source code: <https://github.com/fb55/entities>. Version 4.5.0 of
`dist/extension.js` and version 6.0.1 of `dist/visualEditor.js` have the same
license:

```text
Copyright (c) Felix Böhm
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

THIS IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS,
EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

## linkify-it

Source code: <https://github.com/markdown-it/linkify-it>. Its license:

```text
Copyright (c) 2015 Vitaly Puzrin.

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.
```

## mdurl

Source code: <https://github.com/markdown-it/mdurl>. Its license:

```text
Copyright (c) 2015 Vitaly Puzrin, Alex Kocharin.

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.

--------------------------------------------------------------------------------

.parse() is based on Joyent's node.js `url` code:

Copyright Joyent, Inc. and other Node contributors. All rights reserved.
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to
deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
sell copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
IN THE SOFTWARE.
```

## punycode.js

Source code: <https://github.com/mathiasbynens/punycode.js>. Its license:

```text
Copyright Mathias Bynens <https://mathiasbynens.be/>

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

## uc.micro

Source code: <https://github.com/markdown-it/uc.micro>. Its license:

```text
Copyright Mathias Bynens <https://mathiasbynens.be/>

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

## @vscode/markdown-editor

Source code: <https://github.com/microsoft/vscode-packages/tree/main/vscode-team-tools/packages/markdown-editor>. Its package names the MIT License, and its repository holds the license, the same text as the license of [@vscode/observables](#vscodeobservables).

## @vscode/observables

Source code: <https://github.com/microsoft/vscode-packages/tree/main/vscode-observables/observables>. Its license:

```text
MIT License

Copyright (c) Microsoft Corporation.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## @vscode/diff

Source code: <https://github.com/microsoft/vscode-packages/tree/main/vscode-diff>. Its license:

```text
MIT License

Copyright (c) Microsoft Corporation.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE
```

## @vscode/codicons

Source code: <https://github.com/microsoft/vscode-codicons>. The icon font `dist/codicon.ttf` and the icons are under the
[Creative Commons Attribution 4.0 International License](https://creativecommons.org/licenses/by/4.0/legalcode)
(CC BY 4.0), © Microsoft Corporation, and the styles of the package
under its MIT License:

```text
MIT License

Copyright (c) Microsoft Corporation.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE
```

## katex

Source code: <https://github.com/KaTeX/KaTeX>. Its license:

```text
The MIT License (MIT)

Copyright (c) 2013-2020 Khan Academy and other contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## micromark

Source code: <https://github.com/micromark/micromark/tree/main/packages/micromark>. Its license:

```text
(The MIT License)

Copyright (c) Titus Wormer <tituswormer@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

## micromark-core-commonmark

Source code: <https://github.com/micromark/micromark/tree/main/packages/micromark-core-commonmark>. Its license is the same text as the license of
[micromark](#micromark).

## micromark-extension-frontmatter

Source code: <https://github.com/micromark/micromark-extension-frontmatter>. Its license:

```text
(The MIT License)

Copyright (c) 2020 Titus Wormer <tituswormer@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

## micromark-extension-gfm-autolink-literal

Source code: <https://github.com/micromark/micromark-extension-gfm-autolink-literal>. Its license is the same text as the license of
[micromark-extension-frontmatter](#micromark-extension-frontmatter).

## micromark-extension-gfm-strikethrough

Source code: <https://github.com/micromark/micromark-extension-gfm-strikethrough>. Its license is the same text as the license of
[micromark-extension-frontmatter](#micromark-extension-frontmatter).

## micromark-extension-gfm-table

Source code: <https://github.com/micromark/micromark-extension-gfm-table>. Its license is the same text as the license of
[micromark](#micromark).

## micromark-extension-gfm-task-list-item

Source code: <https://github.com/micromark/micromark-extension-gfm-task-list-item>. Its license is the same text as the license of
[micromark-extension-frontmatter](#micromark-extension-frontmatter).

## micromark-extension-math

Source code: <https://github.com/micromark/micromark-extension-math>. Its license is the same text as the license of
[micromark-extension-frontmatter](#micromark-extension-frontmatter).

## micromark-factory-destination

Source code: <https://github.com/micromark/micromark/tree/main/packages/micromark-factory-destination>. Its license is the same text as the license of
[micromark](#micromark).

## micromark-factory-label

Source code: <https://github.com/micromark/micromark/tree/main/packages/micromark-factory-label>. Its license is the same text as the license of
[micromark](#micromark).

## micromark-factory-space

Source code: <https://github.com/micromark/micromark/tree/main/packages/micromark-factory-space>. Its license is the same text as the license of
[micromark](#micromark).

## micromark-factory-title

Source code: <https://github.com/micromark/micromark/tree/main/packages/micromark-factory-title>. Its license is the same text as the license of
[micromark](#micromark).

## micromark-factory-whitespace

Source code: <https://github.com/micromark/micromark/tree/main/packages/micromark-factory-whitespace>. Its license is the same text as the license of
[micromark](#micromark).

## micromark-util-character

Source code: <https://github.com/micromark/micromark/tree/main/packages/micromark-util-character>. Its license is the same text as the license of
[micromark](#micromark).

## micromark-util-chunked

Source code: <https://github.com/micromark/micromark/tree/main/packages/micromark-util-chunked>. Its license is the same text as the license of
[micromark](#micromark).

## micromark-util-classify-character

Source code: <https://github.com/micromark/micromark/tree/main/packages/micromark-util-classify-character>. Its license is the same text as the license of
[micromark](#micromark).

## micromark-util-combine-extensions

Source code: <https://github.com/micromark/micromark/tree/main/packages/micromark-util-combine-extensions>. Its license is the same text as the license of
[micromark](#micromark).

## micromark-util-decode-numeric-character-reference

Source code: <https://github.com/micromark/micromark/tree/main/packages/micromark-util-decode-numeric-character-reference>. Its license is the same text as the license of
[micromark](#micromark).

## micromark-util-decode-string

Source code: <https://github.com/micromark/micromark/tree/main/packages/micromark-util-decode-string>. Its license is the same text as the license of
[micromark](#micromark).

## micromark-util-edit-map

Source code: <https://github.com/micromark/micromark/tree/main/packages/micromark-util-edit-map>. Its license is the same text as the license of
[micromark](#micromark).

## micromark-util-encode

Source code: <https://github.com/micromark/micromark/tree/main/packages/micromark-util-encode>. Its license is the same text as the license of
[micromark](#micromark).

## micromark-util-html-tag-name

Source code: <https://github.com/micromark/micromark/tree/main/packages/micromark-util-html-tag-name>. Its license is the same text as the license of
[micromark](#micromark).

## micromark-util-normalize-identifier

Source code: <https://github.com/micromark/micromark/tree/main/packages/micromark-util-normalize-identifier>. Its license is the same text as the license of
[micromark](#micromark).

## micromark-util-resolve-all

Source code: <https://github.com/micromark/micromark/tree/main/packages/micromark-util-resolve-all>. Its license is the same text as the license of
[micromark](#micromark).

## micromark-util-sanitize-uri

Source code: <https://github.com/micromark/micromark/tree/main/packages/micromark-util-sanitize-uri>. Its license is the same text as the license of
[micromark](#micromark).

## micromark-util-subtokenize

Source code: <https://github.com/micromark/micromark/tree/main/packages/micromark-util-subtokenize>. Its license is the same text as the license of
[micromark](#micromark).

## decode-named-character-reference

Source code: <https://github.com/wooorm/decode-named-character-reference>. Its license is the same text as the license of
[micromark](#micromark).

## fault

Source code: <https://github.com/wooorm/fault>. Its license:

```text
(The MIT License)

Copyright (c) 2015 Titus Wormer <tituswormer@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

## format

Source code: <https://github.com/samsonjs/format>. Its package and its README name the MIT License
(<http://sjs.mit-license.org>) with this notice: "Copyright 2010 - 2014
Sami Samhuri sami@samhuri.net". The text of the MIT License is the text of
[markdown-it](#markdown-it) with this notice.
