# SPDX-License-Identifier: MIT
# © 2026 Hannes Stauss (scalarion@nimblescape.com)
# Licensed under the MIT License. See LICENSE in the repository root for details.

# Builds the icon font resources/notes-icons.ttf of the buttons "Show Highlights" and "Hide Highlights" from
# resources/icons/highlighter.svg, of "Add Footnote" from resources/icons/footnote-add.svg, of "Show Footnotes" and
# "Hide Footnotes" from resources/icons/footnotes.svg, of the eye of the hidden notes from resources/icons/eye.svg, and of
# the selected one of the three views of a Markdown file from resources/icons/view-text.svg, view-preview.svg and
# view-editor.svg. The extension contributes the characters as the icons nimblescape-highlights-show,
# nimblescape-highlights-hide, nimblescape-footnote-add, nimblescape-footnotes-show, nimblescape-footnotes-hide,
# nimblescape-notes-shown, nimblescape-notes-hidden, nimblescape-view-text-selected, nimblescape-view-preview-selected
# and nimblescape-view-editor-selected (contributes.icons in package.json), so that VS Code draws them in the icon color
# of the theme, as it draws its codicons. A font holds no strokes: the script turns the strokes of an image into
# outlines, adds the stroke of a "Hide" button with its gap, cuts the image of a selected view out of a filled square
# with round corners, and writes the font with the metrics of codicon.ttf (300 units for 16 pixels, the baseline at the
# bottom of the icon). The images of the footnotes, of the eye and of the views are made from codicons of VS Code, under
# CC BY 4.0; the font names them in its copyright. The font is in the repository; run the script after a change of an
# image:
#
#   python3 -m pip install fonttools picosvg skia-pathops
#   python3 scripts/icon-font.py
#
# The same image gives the same font: the script writes a fixed date into the font.
from pathlib import Path
from typing import NamedTuple

import pathops
from fontTools.fontBuilder import FontBuilder
from fontTools.misc.timeTools import timestampFromString
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.svgLib.path import parse_path
from picosvg.svg import SVG

ROOT = Path(__file__).resolve().parent.parent
ICONS = ROOT / 'resources' / 'icons'
FONT = ROOT / 'resources' / 'notes-icons.ttf'


class Glyph(NamedTuple):
    """A glyph of an icon."""

    # The name of the glyph; package.json names the icon nimblescape-<name>.
    name: str
    # The character in the Private Use Area, which package.json names as fontCharacter.
    character: int
    # The image in resources/icons.
    image: str
    # The mark of the glyph: '' for the image as it is, 'hide' for the stroke of a "Hide" button, 'selected' for the image
    # cut out of a filled square with round corners, the mark of the selected view among the buttons of the three views.
    mark: str = ''
    # The size of the image in the square of a selected view, from its center: 1 keeps the size of the image.
    scale: float = 1


GLYPHS = [
    Glyph('highlights-show', 0xE001, 'highlighter.svg'),
    Glyph('highlights-hide', 0xE002, 'highlighter.svg', 'hide'),
    Glyph('footnote-add', 0xE003, 'footnote-add.svg'),
    Glyph('footnotes-show', 0xE004, 'footnotes.svg'),
    Glyph('footnotes-hide', 0xE005, 'footnotes.svg', 'hide'),
    Glyph('notes-shown', 0xE006, 'eye.svg'),
    Glyph('notes-hidden', 0xE007, 'eye.svg', 'hide'),
    # The images of the text and of the editor reach the edges of the icon, so they take 80 % of the square; the parts of
    # the preview take their place in the frame of the codicon, whose place the square takes.
    Glyph('view-text-selected', 0xE008, 'view-text.svg', 'selected', 0.8),
    Glyph('view-preview-selected', 0xE009, 'view-preview.svg', 'selected'),
    Glyph('view-editor-selected', 0xE00A, 'view-editor.svg', 'selected', 0.8),
]
COPYRIGHT = (
    '© 2026 Hannes Stauss, MIT License. The icons footnote-add, footnotes-show, footnotes-hide, notes-shown, '
    'notes-hidden, view-text-selected, view-preview-selected and view-editor-selected are made from the '
    'codicons of VS Code (https://github.com/microsoft/vscode-codicons), © Microsoft Corporation, CC BY 4.0.'
)
# As codicon.ttf: 16 pixels of the image are 300 units of the font.
SIZE = 16
UNITS = 300
# The stroke of a "Hide" button from the top left to the bottom right, 1 pixel wide, with a gap of 1 pixel on both sides.
SLASH = 'M1.5 1.5L14.5 14.5'
# The square of a selected view: the whole icon, with corners of a radius of 3 pixels.
SQUARE = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {SIZE} {SIZE}"><rect width="{SIZE}" height="{SIZE}" rx="3"/></svg>'


def outline(svg: str, size: float = 1) -> pathops.Path:
    """The filled outline of an image, in the units of the font, with the y axis upwards, at a size from its center."""
    scale = UNITS / SIZE * size
    shift = UNITS * (1 - size) / 2
    result = pathops.Path()
    # Each shape on its own: the outline of a stroke has an inner contour, which would cut a hole into a filled shape
    # under it if all shapes shared one path.
    for shape in SVG.fromstring(svg).topicosvg().shapes():
        path = pathops.Path()
        parse_path(shape.d, TransformPen(path.getPen(), (scale, 0, 0, -scale, shift, UNITS - shift)))
        path.simplify()
        result = pathops.op(result, path, pathops.PathOp.UNION)
    return result


def stroke(width: int) -> pathops.Path:
    """The outline of the stroke of a "Hide" button at a width in pixels."""
    return outline(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {SIZE} {SIZE}"><path d="{SLASH}" fill="none" '
        f'stroke="#000" stroke-width="{width}" stroke-linecap="square"/></svg>'
    )


def glyph(path: pathops.Path):
    """A TrueType glyph of an outline: clockwise outer contours, quadratic curves."""
    path.simplify(clockwise=True)
    pen = TTGlyphPen(None)
    path.draw(Cu2QuPen(pen, max_err=0.5))
    return pen.glyph()


def main() -> None:
    glyphs = {'.notdef': TTGlyphPen(None).glyph()}
    for name, _, image, mark, scale in GLYPHS:
        shape = outline((ICONS / image).read_text(encoding='utf-8'), scale)
        if mark == 'hide':
            shape = pathops.op(pathops.op(shape, stroke(3), pathops.PathOp.DIFFERENCE), stroke(1), pathops.PathOp.UNION)
        elif mark == 'selected':
            shape = pathops.op(outline(SQUARE), shape, pathops.PathOp.DIFFERENCE)
        glyphs[name] = glyph(shape)
    font = FontBuilder(UNITS, isTTF=True)
    font.setupGlyphOrder(list(glyphs))
    font.setupCharacterMap({character: name for name, character, *_ in GLYPHS})
    font.setupGlyf(glyphs)
    table = font.font['glyf']
    font.setupHorizontalMetrics({name: (UNITS, getattr(table[name], 'xMin', 0)) for name in glyphs})
    font.setupHorizontalHeader(ascent=UNITS, descent=0)
    font.setupNameTable({'familyName': 'nimblescape Markdown Notes icons', 'styleName': 'Regular', 'copyright': COPYRIGHT})
    font.setupOS2(sTypoAscender=UNITS, sTypoDescender=0, sTypoLineGap=0, usWinAscent=UNITS, usWinDescent=0)
    font.setupPost()
    date = timestampFromString('Thu Oct 29 00:00:00 2026')
    font.font['head'].created = date
    font.font['head'].modified = date
    font.font.recalcTimestamp = False
    font.save(FONT)
    print(f'Wrote {FONT.relative_to(ROOT)}: ' + ', '.join(f'U+{character:04X} {name}' for name, character, *_ in GLYPHS) + '.')


if __name__ == '__main__':
    main()
