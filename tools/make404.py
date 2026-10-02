"""
Sestaví PNG „404“ z dílů nápisu .jH·026 (stejné písmo, stejné měřítko 1:1).
  - „0“ je převzatá beze změny,
  - „4“ = H, jehož levý sloupec končí ve 3. řádku diamantem se špičkou.
Použití: python3 tools/make404.py assets/source/jh026.png assets/source/404.png
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

src, dst = sys.argv[1], sys.argv[2]
alpha = np.array(Image.open(src).convert('RGBA'))[..., 3].astype(np.float32)
labels, _ = ndi.label(alpha > 127, np.ones((3, 3)))

def part_at(x, y):
    """alfa jednoho dílu (vybraného bodem uvnitř), s měkkou hranou"""
    lab = labels[y, x]
    m = ndi.binary_dilation(labels == lab, iterations=3)
    return alpha * m

# body uvnitř dílů (px v původním obrázku 5760×3240)
H_left, H_bar, H_right = part_at(1398, 1638), part_at(1671, 1612), part_at(1937, 1638)
zero = sum(part_at(x, y) for x, y in [(2620, 1638), (2878, 1034), (3152, 1638), (2889, 2226)])

# „4“: levý sloupec H jen do 3. řádku. Spodní špička = zrcadlo horní špičky
# téhož sloupce (diamanty ve spojených sloupcích jsou o kus větší než samostatné).
TOP, ROW1_C, ROW3_C = 1006, 1123, 1634   # horní špička, střed 1. a 3. diamantu (px)
left = H_left.copy()
left[ROW3_C:, :] = 0
half = ROW1_C - TOP
left[ROW3_C:ROW3_C + half + 1, :] = H_left[ROW1_C - np.arange(half + 1), :]
four = np.maximum.reduce([left, H_bar, H_right])

# rozestupy jako v původním nápisu (střed sloupce → střed dalšího: 441 px)
GAP = 441
H_L, H_R, Z_L, Z_R = 1398, 1937, 2620, 3152
dx4a = 400 - 1272
dx0 = (H_R + dx4a + GAP) - Z_L
dx4b = (Z_R + dx0 + GAP) - H_L

out = np.zeros_like(alpha)
def paste(a, dx):
    global out
    out = np.maximum(out, np.roll(a, dx, 1) if dx >= 0 else np.pad(a, ((0, 0), (0, -dx)))[:, -dx:])
paste(four, dx4a); paste(zero, dx0); paste(four, dx4b)

rgba = np.zeros(out.shape + (4,), np.uint8)
rgba[..., :3] = 235
rgba[..., 3] = np.clip(out, 0, 255).astype(np.uint8)
Image.fromarray(rgba).save(dst)
print('uloženo', dst)
