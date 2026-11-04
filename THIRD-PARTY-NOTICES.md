<!--
SPDX-License-Identifier: MIT
© 2026 Hannes Stauss (scalarion@nimblescape.com)
Licensed under the MIT License. See LICENSE in the repository root for details.
-->

# Third-party notices

The script of nimblescape Markdown Notes, `dist/extension.js`, contains the
Markdown parser markdown-it with the packages that it uses. The extension
finds the notes of a Markdown file with it, as the Markdown preview of
VS Code does. For the adapter of VS Code of the editor of rendered
Markdown, the script also contains the packages `@nimblescape/markdowntext`
and `@nimblescape/markdownrender` of nimblescape Markdown, with the
packages that they use. The command `markdownnotes` of the npm package
`@nimblescape/markdownnotes`, `cli/dist/markdownnotes.js`, contains
markdown-it with the packages that it uses, and the npm package holds this
file. This file names each of these packages, its
license and the place of its source code. The code of the extension itself is under the
[MIT License](https://github.com/nimblescape/markdownnotes-vscode/blob/main/LICENSE).

The Markdown preview renders the callouts of the notes with its own copy of
markdown-it, which is part of VS Code, not of this package.

The visual editor of the side view, `dist/visualEditor.js` with its styles
`dist/visualEditor.css`, contains the editor of rendered Markdown of
nimblescape Markdown, the packages `@nimblescape/markdowneditor`,
`@nimblescape/markdownrender` and `@nimblescape/markdowntext`, with the
packages that they use; the page of the editor of a whole file,
`dist/editor.js`, contains the same packages. The npm
package `@nimblescape/markdownnotes` holds none of them.

| Package in `dist/extension.js` | Version | License |
| --- | --- | --- |
| [markdown-it](#markdown-it) | 14.3.3 | MIT |
| [entities](#entities) | 4.5.0 | BSD-2-Clause |
| [linkify-it](#linkify-it) | 5.0.2 | MIT |
| [mdurl](#mdurl) | 2.1.0 | MIT |
| [punycode.js](#punycodejs) | 2.3.1 | MIT |
| [uc.micro](#ucmicro) | 2.1.0 | MIT |
| [@nimblescape/markdowntext](#nimblescapemarkdowntext) | 0.1.0 | MIT |
| [@nimblescape/markdownrender](#nimblescapemarkdownrender) | 0.1.0 | MIT |
| [markdown-it-footnote](#markdown-it-footnote) | 4.0.0 | MIT |
| [markdown-it-task-lists](#markdown-it-task-lists) | 2.1.1 | ISC |
| [@decimalturn/toml-patch](#decimalturntoml-patch) | 3.3.2 | MIT |
| [jsonc-parser](#jsonc-parser) | 3.3.1 | MIT |
| [yaml](#yaml) | 2.9.1 | ISC |
| [@cfworker/json-schema](#cfworkerjson-schema) | 4.1.3 | MIT |
| [diff](#diff) | 9.0.0 | BSD-3-Clause |

| Package in `dist/visualEditor.js` and `dist/visualEditor.css` | Version | License |
| --- | --- | --- |
| [@nimblescape/markdowntext](#nimblescapemarkdowntext) | 0.1.0 | MIT |
| [@nimblescape/markdownrender](#nimblescapemarkdownrender) | 0.1.0 | MIT |
| [@nimblescape/markdowneditor](#nimblescapemarkdowneditor) | 0.1.0 | MIT |
| [@tiptap/core](#tiptapcore) | 3.32.2 | MIT |
| [orderedmap](#orderedmap) | 2.1.1 | MIT |
| [prosemirror-model](#prosemirror-model) | 1.25.12 | MIT |
| [prosemirror-transform](#prosemirror-transform) | 1.12.4 | MIT |
| [@tiptap/pm](#tiptappm) | 3.32.2 | MIT |
| [prosemirror-state](#prosemirror-state) | 1.4.4 | MIT |
| [prosemirror-commands](#prosemirror-commands) | 1.7.2 | MIT |
| [prosemirror-schema-list](#prosemirror-schema-list) | 1.6.0 | MIT |
| [prosemirror-view](#prosemirror-view) | 1.42.9 | MIT |
| [w3c-keyname](#w3c-keyname) | 2.2.8 | MIT |
| [prosemirror-keymap](#prosemirror-keymap) | 1.2.3 | MIT |
| [rope-sequence](#rope-sequence) | 1.3.4 | MIT |
| [prosemirror-history](#prosemirror-history) | 1.5.1 | MIT |
| [prosemirror-inputrules](#prosemirror-inputrules) | 1.5.1 | MIT |
| [@tiptap/extension-bold](#tiptapextension-bold) | 3.32.2 | MIT |
| [@tiptap/extension-code](#tiptapextension-code) | 3.32.2 | MIT |
| [@tiptap/extension-code-block](#tiptapextension-code-block) | 3.32.2 | MIT |
| [@tiptap/extension-horizontal-rule](#tiptapextension-horizontal-rule) | 3.32.2 | MIT |
| [@tiptap/extension-image](#tiptapextension-image) | 3.32.2 | MIT |
| [@tiptap/extension-italic](#tiptapextension-italic) | 3.32.2 | MIT |
| [linkifyjs](#linkifyjs) | 4.4.0 | MIT |
| [@tiptap/extension-link](#tiptapextension-link) | 3.32.2 | MIT |
| [@tiptap/extension-strike](#tiptapextension-strike) | 3.32.2 | MIT |
| [@tiptap/extension-underline](#tiptapextension-underline) | 3.32.2 | MIT |
| [@tiptap/extension-list](#tiptapextension-list) | 3.32.2 | MIT |
| [prosemirror-tables](#prosemirror-tables) | 1.8.5 | MIT |
| [@tiptap/extension-table](#tiptapextension-table) | 3.32.2 | MIT |
| [@tiptap/extension-blockquote](#tiptapextension-blockquote) | 3.32.2 | MIT |
| [@tiptap/extension-document](#tiptapextension-document) | 3.32.2 | MIT |
| [@tiptap/extension-hard-break](#tiptapextension-hard-break) | 3.32.2 | MIT |
| [@tiptap/extension-heading](#tiptapextension-heading) | 3.32.2 | MIT |
| [@tiptap/extension-paragraph](#tiptapextension-paragraph) | 3.32.2 | MIT |
| [@tiptap/extension-text](#tiptapextension-text) | 3.32.2 | MIT |
| [prosemirror-dropcursor](#prosemirror-dropcursor) | 1.8.4 | MIT |
| [prosemirror-gapcursor](#prosemirror-gapcursor) | 1.4.1 | MIT |
| [@tiptap/extensions](#tiptapextensions) | 3.32.2 | MIT |
| [@tiptap/starter-kit](#tiptapstarter-kit) | 3.32.2 | MIT |
| [mdurl](#mdurl) | 2.1.0 | MIT |
| [uc.micro](#ucmicro) | 2.1.0 | MIT |
| [entities](#entities) | 4.5.0 | BSD-2-Clause |
| [markdown-it](#markdown-it) | 14.3.3 | MIT |
| [linkify-it](#linkify-it) | 5.0.2 | MIT |
| [punycode.js](#punycodejs) | 2.3.1 | MIT |
| [markdown-it-footnote](#markdown-it-footnote) | 4.0.0 | MIT |
| [markdown-it-task-lists](#markdown-it-task-lists) | 2.1.1 | ISC |
| [@decimalturn/toml-patch](#decimalturntoml-patch) | 3.3.2 | MIT |
| [jsonc-parser](#jsonc-parser) | 3.3.1 | MIT |
| [yaml](#yaml) | 2.9.1 | ISC |
| [@cfworker/json-schema](#cfworkerjson-schema) | 4.1.3 | MIT |
| [diff](#diff) | 9.0.0 | BSD-3-Clause |
| [prosemirror-markdown](#prosemirror-markdown) | 1.13.9 | MIT |
| [ansi-regex](#ansi-regex) | 6.4.0 | MIT |
| [strip-ansi](#strip-ansi) | 7.2.0 | MIT |
| [get-east-asian-width](#get-east-asian-width) | 1.7.0 | MIT |
| [string-width](#string-width) | 8.3.0 | MIT |
| [@tiptap/extension-code-block-lowlight](#tiptapextension-code-block-lowlight) | 3.32.2 | MIT |
| [lowlight](#lowlight) | 3.3.0 | MIT |
| [devlop](#devlop) | 1.1.0 | MIT |
| [highlight.js](#highlightjs) | 11.11.2 | BSD-3-Clause |

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

Source code: <https://github.com/fb55/entities>. Its license:

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

## @nimblescape/markdowntext

Source code: <https://github.com/nimblescape/markdown>. Its license:

```text
MIT License

© 2026 Hannes Stauss (scalarion@nimblescape.com)

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

## @nimblescape/markdownrender

Source code: <https://github.com/nimblescape/markdown>. Its license is the same text as the license of [@nimblescape/markdowntext](#nimblescapemarkdowntext).

## @nimblescape/markdowneditor

Source code: <https://github.com/nimblescape/markdown>. Its license is the same text as the license of [@nimblescape/markdowntext](#nimblescapemarkdowntext).

## @tiptap/core

Source code: <https://github.com/ueberdosis/tiptap>. Its license:

```text
MIT License

Copyright (c) 2025, Tiptap GmbH

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

## orderedmap

Source code: <https://github.com/marijnh/orderedmap>. Its license:

```text
Copyright (C) 2016 by Marijn Haverbeke <marijn@haverbeke.berlin> and others

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

## prosemirror-model

Source code: <https://code.haverbeke.berlin/prosemirror/prosemirror-model>. Its license:

```text
Copyright (C) 2015-2017 by Marijn Haverbeke <marijn@haverbeke.berlin> and others

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

## prosemirror-transform

Source code: <https://code.haverbeke.berlin/prosemirror/prosemirror-transform>. Its license is the same text as the license of [prosemirror-model](#prosemirror-model).

## @tiptap/pm

Source code: <https://github.com/ueberdosis/tiptap>. Its license is the same text as the license of [@tiptap/core](#tiptapcore).

## prosemirror-state

Source code: <https://github.com/prosemirror/prosemirror-state>. Its license is the same text as the license of [prosemirror-model](#prosemirror-model).

## prosemirror-commands

Source code: <https://code.haverbeke.berlin/prosemirror/prosemirror-commands>. Its license is the same text as the license of [prosemirror-model](#prosemirror-model).

## prosemirror-schema-list

Source code: <https://code.haverbeke.berlin/prosemirror/prosemirror-schema-list>. Its license is the same text as the license of [prosemirror-model](#prosemirror-model).

## prosemirror-view

Source code: <https://code.haverbeke.berlin/prosemirror/prosemirror-view>. Its license is the same text as the license of [prosemirror-model](#prosemirror-model).

## w3c-keyname

Source code: <https://github.com/marijnh/w3c-keyname>. Its license is the same text as the license of [orderedmap](#orderedmap).

## prosemirror-keymap

Source code: <https://github.com/prosemirror/prosemirror-keymap>. Its license is the same text as the license of [prosemirror-model](#prosemirror-model).

## rope-sequence

Source code: <https://github.com/marijnh/rope-sequence>. Its license:

```text
Copyright (C) 2016 by Marijn Haverbeke <marijn@haverbeke.berlin>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

## prosemirror-history

Source code: <https://code.haverbeke.berlin/prosemirror/prosemirror-history>. Its license is the same text as the license of [prosemirror-model](#prosemirror-model).

## prosemirror-inputrules

Source code: <https://github.com/prosemirror/prosemirror-inputrules>. Its license is the same text as the license of [prosemirror-model](#prosemirror-model).

## @tiptap/extension-bold

Source code: <https://github.com/ueberdosis/tiptap>. Its license is the same text as the license of [@tiptap/core](#tiptapcore).

## @tiptap/extension-code

Source code: <https://github.com/ueberdosis/tiptap>. Its license is the same text as the license of [@tiptap/core](#tiptapcore).

## @tiptap/extension-code-block

Source code: <https://github.com/ueberdosis/tiptap>. Its license is the same text as the license of [@tiptap/core](#tiptapcore).

## @tiptap/extension-horizontal-rule

Source code: <https://github.com/ueberdosis/tiptap>. Its license is the same text as the license of [@tiptap/core](#tiptapcore).

## @tiptap/extension-image

Source code: <https://github.com/ueberdosis/tiptap>. Its license is the same text as the license of [@tiptap/core](#tiptapcore).

## @tiptap/extension-italic

Source code: <https://github.com/ueberdosis/tiptap>. Its license is the same text as the license of [@tiptap/core](#tiptapcore).

## linkifyjs

Source code: <https://github.com/nfrasser/linkifyjs>. Its license:

```text
Copyright (c) 2024 Nick Frasser

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

## @tiptap/extension-link

Source code: <https://github.com/ueberdosis/tiptap>. Its license is the same text as the license of [@tiptap/core](#tiptapcore).

## @tiptap/extension-strike

Source code: <https://github.com/ueberdosis/tiptap>. Its license is the same text as the license of [@tiptap/core](#tiptapcore).

## @tiptap/extension-underline

Source code: <https://github.com/ueberdosis/tiptap>. Its license is the same text as the license of [@tiptap/core](#tiptapcore).

## @tiptap/extension-list

Source code: <https://github.com/ueberdosis/tiptap>. Its license is the same text as the license of [@tiptap/core](#tiptapcore).

## prosemirror-tables

Source code: <https://github.com/ProseMirror/prosemirror-tables>. Its license:

```text
Copyright (C) 2015-2016 by Marijn Haverbeke <marijnh@gmail.com> and others

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

## @tiptap/extension-table

Source code: <https://github.com/ueberdosis/tiptap>. Its license is the same text as the license of [@tiptap/core](#tiptapcore).

## @tiptap/extension-blockquote

Source code: <https://github.com/ueberdosis/tiptap>. Its license is the same text as the license of [@tiptap/core](#tiptapcore).

## @tiptap/extension-document

Source code: <https://github.com/ueberdosis/tiptap>. Its license is the same text as the license of [@tiptap/core](#tiptapcore).

## @tiptap/extension-hard-break

Source code: <https://github.com/ueberdosis/tiptap>. Its license is the same text as the license of [@tiptap/core](#tiptapcore).

## @tiptap/extension-heading

Source code: <https://github.com/ueberdosis/tiptap>. Its license is the same text as the license of [@tiptap/core](#tiptapcore).

## @tiptap/extension-paragraph

Source code: <https://github.com/ueberdosis/tiptap>. Its license is the same text as the license of [@tiptap/core](#tiptapcore).

## @tiptap/extension-text

Source code: <https://github.com/ueberdosis/tiptap>. Its license is the same text as the license of [@tiptap/core](#tiptapcore).

## prosemirror-dropcursor

Source code: <https://code.haverbeke.berlin/prosemirror/prosemirror-dropcursor>. Its license is the same text as the license of [prosemirror-model](#prosemirror-model).

## prosemirror-gapcursor

Source code: <https://github.com/prosemirror/prosemirror-gapcursor>. Its license is the same text as the license of [prosemirror-model](#prosemirror-model).

## @tiptap/extensions

Source code: <https://github.com/ueberdosis/tiptap>. Its license is the same text as the license of [@tiptap/core](#tiptapcore).

## @tiptap/starter-kit

Source code: <https://github.com/ueberdosis/tiptap>. Its license is the same text as the license of [@tiptap/core](#tiptapcore).

## markdown-it-footnote

Source code: <https://github.com/markdown-it/markdown-it-footnote>. Its license:

```text
Copyright (c) 2014-2015 Vitaly Puzrin, Alex Kocharin.

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

## markdown-it-task-lists

Source code: <https://github.com/revin/markdown-it-task-lists>. Its license:

```text
Copyright (c) 2016, Revin Guillen

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
```

## @decimalturn/toml-patch

Source code: <https://github.com/DecimalTurn/toml-patch>. Its license:

```text
MIT License

Copyright (c) 2019–2025 Tim Hall
Copyright (c) 2025 Martin Leduc

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

## jsonc-parser

Source code: <https://github.com/microsoft/node-jsonc-parser>. Its license:

```text
The MIT License (MIT)

Copyright (c) Microsoft

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

## yaml

Source code: <https://github.com/eemeli/yaml>. Its license:

```text
Copyright Eemeli Aro <eemeli@gmail.com>

Permission to use, copy, modify, and/or distribute this software for any purpose
with or without fee is hereby granted, provided that the above copyright notice
and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS
OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER
TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF
THIS SOFTWARE.
```

## @cfworker/json-schema

Source code: <https://github.com/cfworker/cfworker>. Its package names the MIT License, and the package holds no text of the license.

## diff

Source code: <https://github.com/kpdecker/jsdiff>. Its license:

```text
BSD 3-Clause License

Copyright (c) 2009-2015, Kevin Decker <kpdecker@gmail.com>
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its
   contributors may be used to endorse or promote products derived from
   this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

## prosemirror-markdown

Source code: <https://code.haverbeke.berlin/prosemirror/prosemirror-markdown>. Its license is the same text as the license of [prosemirror-model](#prosemirror-model).

## ansi-regex

Source code: <https://github.com/chalk/ansi-regex>. Its license:

```text
MIT License

Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (https://sindresorhus.com)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

## strip-ansi

Source code: <https://github.com/chalk/strip-ansi>. Its license is the same text as the license of [ansi-regex](#ansi-regex).

## get-east-asian-width

Source code: <https://github.com/sindresorhus/get-east-asian-width>. Its license is the same text as the license of [ansi-regex](#ansi-regex).

## string-width

Source code: <https://github.com/sindresorhus/string-width>. Its license is the same text as the license of [ansi-regex](#ansi-regex).

## @tiptap/extension-code-block-lowlight

Source code: <https://github.com/ueberdosis/tiptap>. Its license is the same text as the license of [@tiptap/core](#tiptapcore).

## lowlight

Source code: <https://github.com/wooorm/lowlight>. Its license:

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

## devlop

Source code: <https://github.com/wooorm/devlop>. Its license:

```text
(The MIT License)

Copyright (c) 2023 Titus Wormer <tituswormer@gmail.com>

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

## highlight.js

Source code: <https://github.com/highlightjs/highlight.js>. Its license:

```text
BSD 3-Clause License

Copyright (c) 2006, Ivan Sagalaev.
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice, this
  list of conditions and the following disclaimer.

* Redistributions in binary form must reproduce the above copyright notice,
  this list of conditions and the following disclaimer in the documentation
  and/or other materials provided with the distribution.

* Neither the name of the copyright holder nor the names of its
  contributors may be used to endorse or promote products derived from
  this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```
