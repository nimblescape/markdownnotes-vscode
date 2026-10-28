# Test files: notes as footnotes

Test input and tools for the research on notes of nimblescape Markdown Notes
stored as Markdown footnotes. None of these files is part of the extension.

- [proposal.md](proposal.md): the proposed syntax.
- [cases](cases): one edge case per file.
- [prototype/noteFootnotes.js](prototype/noteFootnotes.js): a prototype
  markdown-it plugin that turns note footnotes into callouts in the VS Code
  preview and leaves every other footnote to markdown-it-footnote.
- [pandoc/remove-notes.lua](pandoc/remove-notes.lua): a Pandoc filter that
  removes the notes and keeps the real footnotes, for a clean copy.
- [tools](tools): the scripts that rendered the files.

Renderers used on 2026-10-28: GitHub file view (contents API with the HTML
media type), VS Code 1.143.1 (`markdown.api.render`) with and without
bierner.markdown-footnotes 0.1.1, Pandoc 3.9 (HTML, LaTeX PDF, Typst PDF),
Python-Markdown 3.11.2, kramdown 2.5.2 with kramdown-parser-gfm 1.1.0,
goldmark 1.8.6, remark-gfm 4.0.1, markdown-it 14.3.3 with
markdown-it-footnote 3.0.3 and 4.0.0, markdownlint-cli2 0.24.0 and
Prettier 3.9.10.
