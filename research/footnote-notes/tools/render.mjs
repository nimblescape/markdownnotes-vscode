// Usage: node render.mjs <engine> <file>
import fs from 'node:fs';
import MarkdownIt from 'markdown-it';
import fn4 from 'markdown-it-footnote';
import fn3 from 'markdown-it-footnote3';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
const [engine, file] = process.argv.slice(2);
const src = fs.readFileSync(file, 'utf8');
let html;
if (engine === 'mdit') html = MarkdownIt({ html: true }).render(src);
else if (engine === 'mdit-fn3') html = MarkdownIt({ html: true }).use(fn3).render(src);
else if (engine === 'mdit-fn4') html = MarkdownIt({ html: true }).use(fn4).render(src);
else if (engine === 'remark') html = String(await unified().use(remarkParse).use(remarkGfm).use(remarkRehype, { allowDangerousHtml: true }).use(rehypeStringify, { allowDangerousHtml: true }).process(src));
process.stdout.write(html);
