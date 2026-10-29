# SPDX-License-Identifier: MIT
# © 2026 Hannes Stauss (scalarion@nimblescape.com)
# Licensed under the MIT License. See LICENSE in the repository root for details.

# Builds the icon font resources/notes-icons.ttf of the buttons "Show Highlights" and "Hide Highlights" from
# resources/icons/highlighter.svg. The extension contributes the two characters as the icons
# nimblescape-highlights-show and nimblescape-highlights-hide (contributes.icons in package.json), so that VS Code draws
# them in the icon color of the theme, as it draws its codicons. A font holds no strokes: the script turns the strokes of
# the image into outlines, adds the stroke of "Hide Highlights" with its gap, and writes the font with the metrics of
# codicon.ttf (300 units for 16 pixels, the baseline at the bottom of the icon). The font is in the repository; run the
# script after a change of the image:
#
#   python3 -m pip install fonttools picosvg skia-pathops
#   python3 scripts/icon-font.py
#
# The same image gives the same font: the script writes a fixed date into the font.
from pathlib import Path

import pathops
from fontTools.fontBuilder import FontBuilder
from fontTools.misc.timeTools import timestampFromString
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.svgLib.path import parse_path
from picosvg.svg import SVG

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'resources' / 'icons' / 'highlighter.svg'
FONT = ROOT / 'resources' / 'notes-icons.ttf'
# The characters of the icons, in the Private Use Area; package.json names them as fontCharacter.
SHOW = 0xE001
HIDE = 0xE002
# As codicon.ttf: 16 pixels of the image are 300 units of the font.
SIZE = 16
UNITS = 300
# The stroke of "Hide Highlights" from the top left to the bottom right, 1 pixel wide, with a gap of 1 pixel on both sides.
SLASH = 'M1.5 1.5L14.5 14.5'


def outline(svg: str) -> pathops.Path:
    """The filled outline of an image, in the units of the font, with the y axis upwards."""
    scale = UNITS / SIZE
    result = pathops.Path()
    # Each shape on its own: the outline of a stroke has an inner contour, which would cut a hole into a filled shape
    # under it if all shapes shared one path.
    for shape in SVG.fromstring(svg).topicosvg().shapes():
        path = pathops.Path()
        parse_path(shape.d, TransformPen(path.getPen(), (scale, 0, 0, -scale, 0, UNITS)))
        path.simplify()
        result = pathops.op(result, path, pathops.PathOp.UNION)
    return result


def stroke(width: int) -> pathops.Path:
    """The outline of the stroke of "Hide Highlights" at a width in pixels."""
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
    pen = outline(SOURCE.read_text(encoding='utf-8'))
    hidden = pathops.op(pathops.op(pen, stroke(3), pathops.PathOp.DIFFERENCE), stroke(1), pathops.PathOp.UNION)
    glyphs = {'.notdef': TTGlyphPen(None).glyph(), 'highlights-show': glyph(pen), 'highlights-hide': glyph(hidden)}
    font = FontBuilder(UNITS, isTTF=True)
    font.setupGlyphOrder(list(glyphs))
    font.setupCharacterMap({SHOW: 'highlights-show', HIDE: 'highlights-hide'})
    font.setupGlyf(glyphs)
    table = font.font['glyf']
    font.setupHorizontalMetrics({name: (UNITS, getattr(table[name], 'xMin', 0)) for name in glyphs})
    font.setupHorizontalHeader(ascent=UNITS, descent=0)
    font.setupNameTable({'familyName': 'nimblescape Markdown Notes icons', 'styleName': 'Regular'})
    font.setupOS2(sTypoAscender=UNITS, sTypoDescender=0, sTypoLineGap=0, usWinAscent=UNITS, usWinDescent=0)
    font.setupPost()
    date = timestampFromString('Thu Oct 29 00:00:00 2026')
    font.font['head'].created = date
    font.font['head'].modified = date
    font.font.recalcTimestamp = False
    font.save(FONT)
    print(f'Wrote {FONT.relative_to(ROOT)}: U+{SHOW:04X} Show Highlights, U+{HIDE:04X} Hide Highlights.')


if __name__ == '__main__':
    main()
