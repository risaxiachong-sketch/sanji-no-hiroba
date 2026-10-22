"""Subset Zen Maru Gothic to the characters this site uses (plus all kana and ASCII).

Run again whenever new kanji or symbols are added to the pages:

    curl -LO https://github.com/google/fonts/raw/main/ofl/zenmarugothic/ZenMaruGothic-Bold.ttf
    curl -LO https://github.com/google/fonts/raw/main/ofl/zenmarugothic/ZenMaruGothic-Black.ttf
    python3 -m venv .venv && .venv/bin/pip install fonttools brotli
    .venv/bin/python tools/subset-fonts.py <folder with the two .ttf files>
"""
import os
import sys
from fontTools import subset

SRC = sys.argv[1]
DIST = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'dist')

text = ''
for name in ('index.html', '404.html', 'script.js', 'styles.css'):
    with open(os.path.join(DIST, name), encoding='utf-8') as fh:
        text += fh.read()
extra = ''.join(chr(c) for c in range(0x20, 0x7f))       # ASCII
extra += ''.join(chr(c) for c in range(0x3041, 0x3097))  # hiragana
extra += ''.join(chr(c) for c in range(0x30a1, 0x30fb))  # katakana
extra += '、。・ー〜「」『』（）！？：…♪　'
chars = ''.join(sorted(set(text + extra)))
print('characters:', len(chars))

for weight, out in (('Bold', 'alpaca-maru-bold.woff2'), ('Black', 'alpaca-maru-black.woff2')):
    options = subset.Options()
    options.flavor = 'woff2'
    options.layout_features = ['palt', 'kern', 'vert', 'liga']
    options.name_IDs = ['*']
    options.notdef_outline = True
    font = subset.load_font(os.path.join(SRC, f'ZenMaruGothic-{weight}.ttf'), options)
    subsetter = subset.Subsetter(options)
    subsetter.populate(text=chars)
    subsetter.subset(font)
    path = os.path.join(DIST, 'assets', 'fonts', out)
    subset.save_font(font, path, options)
    print(out, os.path.getsize(path) // 1024, 'KB')
