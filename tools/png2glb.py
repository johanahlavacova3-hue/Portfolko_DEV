"""
PNG (bílé tvary na průhledném pozadí) -> 3D model .glb

Obrys vezme 1:1 z alfa kanálu obrázku a „nafoukne“ ho do oboustranného
reliéfu (polštářky / diamanty). Každý samostatný kus je vlastní objekt,
takže na webu může reagovat na myš zvlášť.

Použití:
    pip install numpy scipy pillow trimesh
    python3 tools/png2glb.py vstup.png assets/models/vystup.glb [--step 6] [--depth 1.0]
"""
import argparse
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
import trimesh

ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('dst')
ap.add_argument('--step', type=int, default=6, help='hustota sítě v px obrázku (menší = jemnější)')
ap.add_argument('--depth', type=float, default=1.0, help='hloubka vůči šířce (1 = čtvercový půdorys)')
ap.add_argument('--noise', type=float, default=1.0, help='hliněná nerovnost povrchu (px)')
a = ap.parse_args()

img = np.array(Image.open(a.src).convert('RGBA')).astype(np.float32)
alpha = img[..., 3] / 255.0
if alpha.min() > 0.99:  # bez průhlednosti -> ber jas
    alpha = np.clip((img[..., :3].mean(-1) - 60) / 60, 0, 1)

# ořez na obsah (+ okraj)
ys, xs = np.where(alpha > 0.5)
pad = 4 * a.step
y0, y1 = max(ys.min() - pad, 0), min(ys.max() + pad, alpha.shape[0])
x0, x1 = max(xs.min() - pad, 0), min(xs.max() + pad, alpha.shape[1])
alpha = alpha[y0:y1, x0:x1]
H, W = alpha.shape

solid = alpha > 0.5
labels, n = ndi.label(solid, structure=np.ones((3, 3)))
dist = ndi.distance_transform_edt(solid)            # vzdálenost od okraje (px)
smooth = ndi.gaussian_filter(alpha, a.step * 0.5)   # pro hladký obrys

# Výškový profil = „čtvercový půdorys“: diamant má stejnou hloubku jako šířku.
# U kosočtverce je vzdálenost od středu k hraně w/√2, takže h = √2·d dává
# přesně osmistěn (hloubka = šířka). Kde se diamanty dotýkají, vzdálenostní
# pole se plynule slije -> díly se samy spojí do sloupců a tvarů.
# Odmocninová složka zakulatí hrany (hliněný vzhled).
def height(d):
    return a.depth * (1.2 * d + 2.1 * np.sqrt(d))

s = a.step
gy = np.arange(0, H, s); gx = np.arange(0, W, s)
GX, GY = np.meshgrid(gx, gy)
S = smooth[GY, GX]
D = ndi.gaussian_filter(dist, s * 0.6)[GY, GX]
L = labels[GY, GX]
Sy, Sx = np.gradient(smooth, s)[0][GY, GX], np.gradient(smooth, s)[1][GY, GX]

rng = np.random.default_rng(7)
noise = ndi.gaussian_filter(rng.standard_normal(dist.shape).astype(np.float32), s * 1.2)[GY, GX]
noise *= a.noise / (noise.std() + 1e-6)

inside = (S >= 0.5) & (L > 0)
Hn = height(D) + noise * np.clip(D / 12, 0, 1)
Hn[~inside] = 0

scale = 1 / 256.0  # px -> jednotky
cx_all, cy_all = W / 2, H / 2
mat = trimesh.visual.material.PBRMaterial(
    name='clay', baseColorFactor=[233, 231, 227, 255], roughnessFactor=0.85, metallicFactor=0.0)

scene = trimesh.Scene()
gh, gw = inside.shape
neigh = [(-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1)]
for lab in range(1, n + 1):
    ins = inside & (L == lab)
    if ins.sum() < 6:
        continue
    # okrajové uzly = sousedé vnitřních uzlů
    border = np.zeros_like(ins)
    for dy, dx in neigh:
        border |= np.roll(np.roll(ins, dy, 0), dx, 1)
    border &= ~inside
    use = ins | border
    # pozice uzlů, okraj přitáhni na izolinii 0.5 (hladký obrys místo schodů)
    px = GX.astype(np.float64).copy(); py = GY.astype(np.float64).copy()
    g2 = Sx ** 2 + Sy ** 2 + 1e-9
    t = (0.5 - S) / g2
    ox, oy = t * Sx, t * Sy
    mag = np.sqrt(ox ** 2 + oy ** 2) + 1e-9
    k = np.minimum(1.0, s / mag)
    px[border] += (ox * k)[border]
    py[border] += (oy * k)[border]

    idx_f = -np.ones(ins.shape, np.int64); idx_b = -np.ones(ins.shape, np.int64)
    verts = []
    yy, xx = np.where(use)
    for k, (i, j) in enumerate(zip(yy, xx)):
        idx_f[i, j] = k
    verts_f = np.stack([px[use] - cx_all, -(py[use] - cy_all), Hn[use]], 1)
    yi, xi = np.where(ins)
    base = len(verts_f)
    for k, (i, j) in enumerate(zip(yi, xi)):
        idx_b[i, j] = base + k
    verts_b = np.stack([px[ins] - cx_all, -(py[ins] - cy_all), -Hn[ins]], 1)
    idx_b[border & use] = idx_f[border & use]  # okraj je společný -> uzavřené těleso

    faces = []
    a_ = use[:-1, :-1] & use[:-1, 1:] & use[1:, :-1] & use[1:, 1:]
    a_ &= ins[:-1, :-1] | ins[:-1, 1:] | ins[1:, :-1] | ins[1:, 1:]
    ci, cj = np.where(a_)
    for i, j in zip(ci, cj):
        for idx, flip in ((idx_f, False), (idx_b, True)):
            v00, v01, v10, v11 = idx[i, j], idx[i, j + 1], idx[i + 1, j], idx[i + 1, j + 1]
            # y obrázku roste dolů, ve 3D nahoru -> pořadí pro normálu +z
            t1, t2 = (v00, v10, v11), (v00, v11, v01)
            if flip:
                t1, t2 = t1[::-1], t2[::-1]
            faces += [t1, t2]
    V = np.vstack([verts_f, verts_b]) * scale
    m = trimesh.Trimesh(V, np.array(faces), process=True)
    m.remove_unreferenced_vertices()
    c = m.bounds.mean(0)
    m.apply_translation(-c)
    m.visual = trimesh.visual.TextureVisuals(material=mat)
    _ = m.vertex_normals  # hladké normály do souboru
    tf = np.eye(4); tf[:3, 3] = c
    scene.add_geometry(m, node_name=f'dil_{lab:02d}', geom_name=f'dil_{lab:02d}', transform=tf)

scene.export(a.dst)
print(f'{n} dílů, {sum(len(g.vertices) for g in scene.geometry.values())} vrcholů ->', a.dst)
