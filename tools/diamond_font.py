"""
Diamantové písmo z nápisu .jH·026: skládá nápisy z původních dílů 1:1.

Stavební prvky (vyříznuté z assets/source/jh026.png):
  - sloupec n spojených diamantů (z levého sloupce H; spodní špička = zrcadlo horní),
  - samostatný diamant (příčka H).
Mřížka jako v originále: řádky po 257 px, půlkrok 270 px (střed příčky H),
rozestup písmen 441 px (od sloupce ke sloupci).

Použití:
  python3 tools/diamond_font.py "portfolio" assets/source/portfolio.png --scatter 0.9 --seed 3
  python3 tools/diamond_font.py "404" assets/source/404b.png          # bez rozházení
"""
import argparse
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

SRC = 'assets/source/jh026.png'
ROW = 257          # svislý krok diamantů ve sloupci
HALF = 270         # vodorovný půlkrok (sloupec → příčka)
GAP = 441          # sloupec posledního písmene → první sloupec dalšího
UP, DOWN, DOT = -89, 75, -126   # posuny samostatných diamantů jako u „0“ a tečky nad „j“

_alpha = np.array(Image.open(SRC).convert('RGBA'))[..., 3].astype(np.float32)
_labels, _ = ndi.label(_alpha > 127, np.ones((3, 3)))

def _part(x, y, pad=6):
    m = ndi.binary_dilation(_labels == _labels[y, x], iterations=3)
    ys, xs = np.where(m)
    y0, y1, x0, x1 = ys.min() - pad, ys.max() + pad, xs.min() - pad, xs.max() + pad
    return (_alpha * m)[y0:y1, x0:x1], (y0, x0)

# samostatný diamant (příčka H) – kotva = střed
_d, (_dy0, _dx0) = _part(1671, 1612)
_ys, _xs = np.where(_d > 127)
LONE = (_d, (_ys.mean(), _xs.mean()))

# sloupec H (5 diamantů): středy řádků a horní špička
_col, (_cy0, _cx0) = _part(1398, 1638)
_C = [1123, 1375, 1634, 1892, 2150]
_TOP = 1006

def column(n):
    """sloupec n (1–5) spojených diamantů, kotva = střed horního diamantu"""
    c = _col
    end = _C[n - 1] - _cy0
    half = _C[0] - _TOP
    out = np.zeros((end + half + 8, c.shape[1]), np.float32)
    out[:end] = c[:end]
    k = np.arange(half + 1)
    out[end:end + half + 1] = c[_C[0] - _cy0 - k]
    return out, (_C[0] - _cy0, 1398 - _cx0)

def row(k):
    return (k - 1) * ROW

# Písmena: (typ, x v půlkrocích, y v px vůči 1. řádku, počet diamantů)
GLYPHS = {
    'p': (2, [('c', 0, row(2), 5), ('c', 2, row(2), 3), ('d', 1, row(2) + UP), ('d', 1, row(4) + DOWN)]),
    'o': (2, [('c', 0, row(2), 4), ('c', 2, row(2), 4), ('d', 1, row(2) + UP), ('d', 1, row(5) + DOWN)]),
    'r': (2, [('c', 0, row(2), 4), ('d', 1, row(2) + UP), ('d', 2, row(2))]),
    't': (2, [('c', 1, row(1), 5), ('d', 0, row(2)), ('d', 2, row(2)), ('d', 2, row(5) + DOWN)]),
    'f': (2, [('c', 1, row(1), 5), ('d', 0, row(2)), ('d', 2, row(2)), ('d', 2, row(1) + UP)]),
    'l': (1, [('c', 0, row(1), 5), ('d', 1, row(5) + DOWN)]),
    'i': (0, [('c', 0, row(2), 4), ('d', 0, row(1) + DOT)]),
    '0': (2, [('c', 0, row(1), 5), ('c', 2, row(1), 5), ('d', 1, row(1) + UP), ('d', 1, row(5) + DOWN)]),
    '4': (2, [('c', 0, row(1), 3), ('d', 1, row(3)), ('c', 2, row(1), 5)]),
}

def render(text, scatter=0.0, seed=1, jitter=60):
    rng = np.random.default_rng(seed)
    stamps, x = [], 0
    for ch in text:
        w, parts = GLYPHS[ch]
        dy = rng.uniform(-1, 1) * scatter * ROW * 1.6 if scatter else 0
        dx = rng.uniform(-1, 1) * jitter * scatter if scatter else 0
        for p in parts:
            px = x + p[1] * HALF + dx
            py = p[2] + dy
            stamps.append((column(p[3]) if p[0] == 'c' else LONE, px, py))
        x += w * HALF + GAP + (rng.uniform(-0.5, 0.8) * 180 * scatter if scatter else 0)
    # plátno
    pad = 400
    xs = [s[1] for s in stamps]; ys = [s[2] for s in stamps]
    W = int(max(xs) - min(xs) + 2 * pad); H = int(max(ys) - min(ys) + ROW * 5 + 2 * pad)
    ox, oy = pad - min(xs), pad - min(ys)
    out = np.zeros((H, W), np.float32)
    for (img, (ay, ax)), px, py in stamps:
        y0 = int(round(py + oy - ay)); x0 = int(round(px + ox - ax))
        h, w = img.shape
        out[y0:y0 + h, x0:x0 + w] = np.maximum(out[y0:y0 + h, x0:x0 + w], img)
    return out

if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('text'); ap.add_argument('dst')
    ap.add_argument('--scatter', type=float, default=0.0, help='0 = na účaří, 1 = hodně rozházené')
    ap.add_argument('--seed', type=int, default=1, help='jiné číslo = jiné rozházení')
    a = ap.parse_args()
    out = render(a.text, a.scatter, a.seed)
    rgba = np.zeros(out.shape + (4,), np.uint8); rgba[..., :3] = 235
    rgba[..., 3] = np.clip(out, 0, 255).astype(np.uint8)
    Image.fromarray(rgba).save(a.dst)
    print('uloženo', a.dst, out.shape[::-1])
