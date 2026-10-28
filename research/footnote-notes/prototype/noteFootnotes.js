// Prototype: notes stored as footnotes. A footnote is a note when its label is a
// note ID (a letter and digits) and its first line is the header of an answer
// ("**login** · YYYY-MM-DD HH:MM"). The plugin takes only these footnotes; every
// other footnote stays for markdown-it-footnote (Bierner's extension) or stays text.

const labelPattern = /^[a-z][0-9]+$/;
const headerPattern = /^\*\*([A-Za-z0-9-]+)\*\* · (\d{4}-\d{2}-\d{2} \d{2}:\d{2})\s*$/;
const definitionPattern = /^\[\^([^\]\s]+)\]:[ \t]*(.*)$/;
const startMarkerPattern = /^<!--\[([a-z][0-9]+)-->$/;

function noteDefinition(state, startLine, endLine, silent) {
  const start = state.bMarks[startLine] + state.tShift[startLine];
  if (state.sCount[startLine] - state.blkIndent >= 4) return false;
  const first = state.src.slice(start, state.eMarks[startLine]);
  const match = definitionPattern.exec(first);
  if (!match || !labelPattern.test(match[1]) || !headerPattern.test(match[2])) return false;
  if (silent) return true;
  // The note ends before the first line that is not blank and not indented by
  // 4 spaces, unless it directly follows a text line (lazy continuation).
  const lines = [match[2]];
  let line = startLine + 1;
  let previousBlank = false;
  for (; line < endLine; line++) {
    const blank = state.bMarks[line] + state.tShift[line] >= state.eMarks[line];
    const indented = state.sCount[line] - state.blkIndent >= 4;
    if (!blank && !indented && previousBlank) break;
    const raw = state.src.slice(state.bMarks[line], state.eMarks[line]);
    lines.push(indented ? raw.replace(/^( {4}|\t)/, '') : raw.trimStart());
    previousBlank = blank;
  }
  while (lines.length > 1 && lines[lines.length - 1].trim() === '') { lines.pop(); line--; }
  const env = state.env;
  env.nimblescapeNotes = env.nimblescapeNotes || {};
  env.nimblescapeNotes[match[1]] = true;
  const token = state.push('nimblescape_note', 'aside', 0);
  token.block = true;
  token.map = [startLine, line];
  token.meta = { label: match[1], source: lines.join('\n') };
  state.line = line;
  return true;
}

function noteReference(state, silent) {
  const src = state.src.slice(state.pos);
  const match = /^\[\^([a-z][0-9]+)\]/.exec(src);
  if (!match || !state.env.nimblescapeNotes || !state.env.nimblescapeNotes[match[1]]) return false;
  if (!silent) {
    const token = state.push('nimblescape_note_ref', 'sup', 0);
    token.meta = { label: match[1] };
  }
  state.pos += match[0].length;
  return true;
}

// The bodies of the notes are parsed with the block and inline rules only, not
// with the core rules: the core rule of markdown-it-footnote would add a list
// of footnotes to each note.
function parseFragment(md, src, env) {
  const tokens = [];
  md.block.parse(src, md, env, tokens);
  for (const token of tokens) {
    if (token.type === 'inline') {
      token.children = [];
      md.inline.parse(token.content, md, env, token.children);
    }
  }
  return tokens;
}

function parseBodies(state) {
  for (const token of state.tokens) {
    if (token.type === 'nimblescape_note') {
      token.children = parseFragment(state.md, token.meta.source, state.env);
    }
  }
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

module.exports = function noteFootnotes(md) {
  // Before markdown-it-footnote when it exists, so that it never sees a note.
  const blockRules = md.block.ruler.__rules__.map((rule) => rule.name);
  const blockAnchor = blockRules.includes('footnote_def') ? 'footnote_def' : 'reference';
  md.block.ruler.before(blockAnchor, 'nimblescape_note', noteDefinition, { alt: ['paragraph', 'reference'] });
  const inlineRules = md.inline.ruler.__rules__.map((rule) => rule.name);
  const inlineAnchor = inlineRules.includes('footnote_ref') ? 'footnote_ref' : 'link';
  md.inline.ruler.before(inlineAnchor, 'nimblescape_note_ref', noteReference);
  md.core.ruler.after('inline', 'nimblescape_note_bodies', parseBodies);

  md.renderer.rules.nimblescape_note_ref = (tokens, idx) => {
    const label = tokens[idx].meta.label;
    return `<sup class="nimblescape-note-ref"><a href="#nimblescape-note-${label}" title="Note ${label}">&#x1F4AC;</a></sup>`;
  };
  md.renderer.rules.nimblescape_note = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    const body = self.render(token.children, options, env);
    const line = token.map ? ` data-line="${token.map[0]}"` : '';
    return `<aside class="nimblescape-note" id="nimblescape-note-${token.meta.label}"${line}>${body}</aside>\n`;
  };
  const defaultHtmlInline = md.renderer.rules.html_inline || ((tokens, idx) => tokens[idx].content);
  md.renderer.rules.html_inline = (tokens, idx, options, env, self) => {
    const match = startMarkerPattern.exec(tokens[idx].content);
    if (match) return `<span class="nimblescape-selection-start" data-note="${escapeHtml(match[1])}"></span>`;
    return defaultHtmlInline(tokens, idx, options, env, self);
  };
};
