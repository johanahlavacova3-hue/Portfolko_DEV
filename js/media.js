/**
 * Média v galerii podle přípony souboru:
 *   obrázek  .jpg .jpeg .png .webp .gif .avif .svg
 *   video    .mp4 .webm .mov .m4v        → běží samo, ztlumené, ve smyčce
 *   3D       .obj .glb .gltf .stl        → otáčí se a natáčí za myší
 *
 * U .obj se automaticky zkusí načíst stejnojmenný .mtl (materiály/textury).
 * Bez něj dostane model „hliněný“ materiál jako 3D logo.
 */
const VIDEO = ['mp4', 'webm', 'mov', 'm4v'];
const MODEL = ['obj', 'glb', 'gltf', 'stl'];

export function extOf(src) {
  const m = String(src).match(/[?&]format=(\w+)/); // ruční určení typu, např. soubor.bin?format=obj
  if (m) return m[1].toLowerCase();
  return String(src).split(/[?#]/)[0].split('.').pop().toLowerCase();
}
export function kindOf(src) {
  const e = extOf(src);
  return VIDEO.includes(e) ? 'video' : MODEL.includes(e) ? 'model' : 'image';
}

const withTimeout = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(r, ms))]);

/** Vytvoří prvek pro slide. Vrací { el, kind, ready, show(), hide(), dispose() } */
export function createMedia(src, alt = '') {
  const kind = kindOf(src);

  if (kind === 'video') {
    const v = document.createElement('video');
    Object.assign(v, { src, muted: true, loop: true, playsInline: true, autoplay: true, preload: 'auto' });
    v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
    v.setAttribute('aria-label', alt);
    const ready = new Promise((res) => {
      if (v.readyState >= 2) res();
      v.addEventListener('loadeddata', res, { once: true });
      v.addEventListener('error', res, { once: true });
    });
    return {
      el: v, kind, ready: withTimeout(ready, 5000),
      show() { v.play().catch(() => {}); },
      hide() { v.pause(); },
      dispose() { v.pause(); v.removeAttribute('src'); v.load(); },
    };
  }

  if (kind === 'model') return modelViewer(src, alt);

  const img = document.createElement('img');
  img.src = src; img.alt = alt; img.draggable = false; img.decoding = 'async';
  return {
    el: img, kind, ready: withTimeout(img.decode().catch(() => {}), 5000),
    show() {}, hide() {}, dispose() {},
  };
}

/** Přednačtení na pozadí (obrázky a 3D soubory do cache prohlížeče). */
const warm = new Set();
export function prefetch(src) {
  if (warm.has(src)) return;
  warm.add(src);
  const kind = kindOf(src);
  if (kind === 'image') { const i = new Image(); i.decoding = 'async'; i.src = src; }
  else if (kind === 'model') fetch(src).catch(() => {});
}

/* ---------- 3D prohlížeč ---------- */
function modelViewer(src, alt) {
  const box = document.createElement('div');
  box.className = 'pf-model';
  box.setAttribute('role', 'img');
  box.setAttribute('aria-label', alt);

  let raf = 0, renderer = null, ro = null, disposed = false, visible = true;
  const target = { x: 0, y: 0 }, rot = { x: 0, y: 0 };
  const onMove = (e) => {
    const r = box.getBoundingClientRect();
    target.y = ((e.clientX - r.left) / r.width - 0.5) * 1.2;
    target.x = ((e.clientY - r.top) / r.height - 0.5) * 0.6;
  };

  const ready = (async () => {
    const THREE = await import('three');
    const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');
    const ext = extOf(src);
    let obj, hasMaterials = false;

    if (ext === 'obj') {
      const { OBJLoader } = await import('three/addons/loaders/OBJLoader.js');
      const loader = new OBJLoader();
      const mtlUrl = src.split('?')[0].replace(/\.obj$/i, '.mtl');
      if (mtlUrl !== src.split('?')[0]) {
        const head = await fetch(mtlUrl, { method: 'HEAD' }).catch(() => null);
        if (head && head.ok) {
          const { MTLLoader } = await import('three/addons/loaders/MTLLoader.js');
          const base = mtlUrl.slice(0, mtlUrl.lastIndexOf('/') + 1);
          const mtl = await new MTLLoader().setPath(base).loadAsync(mtlUrl.slice(base.length));
          mtl.preload();
          loader.setMaterials(mtl);
          hasMaterials = true;
        }
      }
      obj = await loader.loadAsync(src);
    } else if (ext === 'stl') {
      const { STLLoader } = await import('three/addons/loaders/STLLoader.js');
      obj = new THREE.Mesh(await new STLLoader().loadAsync(src));
    } else {
      const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
      const { MeshoptDecoder } = await import('three/addons/libs/meshopt_decoder.module.js');
      obj = (await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(src)).scene;
      hasMaterials = true;
    }
    if (disposed) return;

    const clay = new THREE.MeshStandardMaterial({ color: 0xd9d7d3, roughness: 0.85, metalness: 0 });
    obj.traverse((o) => {
      if (!o.isMesh) return;
      if (!o.geometry.attributes.normal) o.geometry.computeVertexNormals();
      if (!hasMaterials) o.material = clay;
    });

    // vycentrovat a zmenšit na jednotkovou velikost
    const bb = new THREE.Box3().setFromObject(obj);
    const size = bb.getSize(new THREE.Vector3());
    obj.position.sub(bb.getCenter(new THREE.Vector3()));
    const pivot = new THREE.Group();
    pivot.add(obj);
    const k = 2 / Math.max(size.x, size.y, size.z, 1e-6);
    pivot.scale.setScalar(k);
    const half = size.clone().multiplyScalar(k / 2);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    box.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.35;
    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(-4, 5, 4);
    scene.add(key, new THREE.AmbientLight(0xffffff, 0.15), pivot);

    const cam = new THREE.PerspectiveCamera(28, 1, 0.01, 100);
    const fit = () => {
      const w = box.clientWidth || 1, h = box.clientHeight || 1;
      renderer.setSize(w, h, false);
      cam.aspect = w / h;
      // model vyplní rám i při otáčení (vodorovně počítá s rotací kolem svislé osy)
      const t = Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2);
      const rXZ = Math.hypot(half.x, half.z), rY = half.y;
      const d = Math.max((rY * 1.25) / t, (rXZ * 1.08) / (t * cam.aspect)) + rXZ;
      cam.position.set(0, 0, d);
      cam.updateProjectionMatrix();
    };
    fit();
    ro = new ResizeObserver(fit);
    ro.observe(box);
    window.addEventListener('pointermove', onMove, { passive: true });

    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let last = performance.now(), auto = 0;
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      if (!visible) return;
      const dt = Math.min((now - last) / 1000, 0.1); last = now;
      if (!reduced) auto += dt * 0.25;
      rot.x += (target.x - rot.x) * Math.min(1, dt * 4);
      rot.y += (target.y - rot.y) * Math.min(1, dt * 4);
      pivot.rotation.set(rot.x, auto + rot.y, 0);
      renderer.render(scene, cam);
    };
    raf = requestAnimationFrame(loop);
  })().catch((err) => {
    console.warn('[galerie] 3D model se nepodařilo načíst:', src, err);
    box.innerHTML = '<p class="pf-msg">3D model se nepodařilo načíst.</p>';
  });

  return {
    el: box, kind: 'model', ready: withTimeout(ready, 6000),
    show() { visible = true; }, hide() { visible = false; },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      ro?.disconnect();
      if (renderer) { renderer.dispose(); renderer.forceContextLoss(); }
    },
  };
}
