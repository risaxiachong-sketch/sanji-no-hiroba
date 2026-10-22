"""Build the published WebP images, share card and icons from the full-size originals.

    python3 -m venv .venv && .venv/bin/pip install pillow
    .venv/bin/python tools/make-images.py

Originals live in art/soft/ (not published). Output goes to dist/.
"""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'art', 'soft')
OUT = os.path.join(ROOT, 'dist', 'assets', 'soft')
os.makedirs(OUT, exist_ok=True)


def save(img, name, q=82):
    path = os.path.join(OUT, name)
    kw = dict(quality=q, method=6)
    if img.mode == 'RGBA':
        kw['alpha_quality'] = 90
    img.save(path, 'WEBP', **kw)
    print(f'{name:32s} {img.size[0]}x{img.size[1]} {os.path.getsize(path) // 1024}KB')


def variants(src, base, widths, q=82):
    im = Image.open(os.path.join(SRC, src))
    im = im.convert('RGBA' if 'A' in im.getbands() else 'RGB')
    for w in widths:
        out = im if w >= im.size[0] else im.resize((w, round(im.size[1] * w / im.size[0])), Image.LANCZOS)
        save(out, f'{base}-{min(w, im.size[0])}.webp', q)
    return im


cover = variants('cover-original.png', 'cover', [1536], q=86)
sky = variants('cloud-hero.png', 'hero-sky', [2079], q=78)
# Phones only ever see the middle of the panoramic sky.
w, h = sky.size
save(sky.crop(((w - 620) // 2, 0, (w + 620) // 2, h)), 'hero-sky-620.webp', 78)
variants('alpaca-town.png', 'alpaca-town', [1536, 1024], q=80)
variants('alpaca-rest.png', 'alpaca-rest', [1536, 800])
variants('alpaca-book.png', 'alpaca-book', [1536, 800])
variants('alpaca-wave.png', 'alpaca-wave', [720])
variants('alpaca-heart.png', 'alpaca-heart', [720])
variants('alpaca-goodnight.png', 'alpaca-goodnight', [1600, 900])
variants('cloud-flowers.png', 'cloud-flowers', [1400, 800])
variants('cloud-button.png', 'cloud', [760])

# Share card: the original cover sitting in its morning sky.
og = Image.new('RGB', (1200, 630), '#fcfaf3')
sw, sh = sky.size
scale = max(1200 / sw, 630 / sh)
bg = sky.convert('RGB').resize((round(sw * scale), round(sh * scale)), Image.LANCZOS)
og.paste(bg, ((1200 - bg.size[0]) // 2, (630 - bg.size[1]) // 2))
og = Image.alpha_composite(og.convert('RGBA'), Image.new('RGBA', (1200, 630), (255, 253, 247, 70)))
s = 0.72
cs = cover.resize((round(cover.size[0] * s), round(cover.size[1] * s)), Image.LANCZOS)
# The cover's artwork spans roughly y 100..850 of 1024; centre that band.
og.alpha_composite(cs, ((1200 - cs.size[0]) // 2, round(315 - 475 * s)))
og_path = os.path.join(ROOT, 'dist', 'assets', 'og-image.jpg')
og.convert('RGB').save(og_path, 'JPEG', quality=86, optimize=True, progressive=True)
print('og-image.jpg', os.path.getsize(og_path) // 1024, 'KB')

# Icons: the sleepy alpaca's face on paper.
head = cover.crop((585, 95, 1025, 535))
for size, name in ((180, 'apple-touch-icon.png'), (48, 'favicon-48.png')):
    pad = round(size * 0.06)
    canvas = Image.new('RGBA', (size, size), (255, 251, 240, 255))
    canvas.alpha_composite(head.resize((size - pad * 2, size - pad * 2), Image.LANCZOS), (pad, pad + round(size * 0.02)))
    path = os.path.join(ROOT, 'dist', name)
    canvas.convert('RGB').save(path, 'PNG', optimize=True)
    print(name, os.path.getsize(path), 'B')
