/**
 * Interaktivní 3D logo JH (Three.js).
 *
 * Dokud není v config.js nastavený vlastní model, poskládá se zástupné JH
 * z „diamantů“ podle rozložení z návrhu. Celé logo se natáčí za myší,
 * diamant pod kurzorem se roztočí. Na stránce 404 (mode: 'broken')
 * se diamanty navíc rozutíkají před kurzorem.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { CONFIG } from './config.js';

/* ---------- Rozložení diamantů (středy změřené z návrhu v px) ---------- */
const LAYOUT_PX = [
  // tečka nad j
  [1449, 153],
  // dřík j
  [1448, 298], [1448, 395], [1448, 493], [1448, 590],
  // háček j
  [1347, 645], [1247, 590], [1247, 493],
  // levý dřík H
  [1612, 200], [1612, 298], [1612, 395], [1612, 493], [1612, 590],
  // příčka H
  [1715, 386],
  // pravý dřík H
  [1816, 200], [1816, 298], [1816, 395], [1816, 493], [1816, 590],
];
const UNIT = 97;             // rozteč diamantů v px
const CENTER = [1532, 399];  // střed loga v px

/* ---------- Pomocné funkce pro „hliněný“ povrch ---------- */
function hash(x, y, z) {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
}
function noise3(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const l = (a, b, t) => a + (b - a) * t;
  const c = (dx, dy, dz) => hash(xi + dx, yi + dy, zi + dz);
  return l(
    l(l(c(0, 0, 0), c(1, 0, 0), u), l(c(0, 1, 0), c(1, 1, 0), u), v),
    l(l(c(0, 0, 1), c(1, 0, 1), u), l(c(0, 1, 1), c(1, 1, 1), u), v),
    w,
  );
}

/** Zaoblený „polštářkový“ osmistěn = jeden diamant. */
function diamondGeometry(seed) {
  let g = new THREE.IcosahedronGeometry(1, 28);
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  g = mergeVertices(g);
  const pos = g.attributes.position;
  const v = new THREE.Vector3();
  const P = 1.22; // 1 = ostrý osmistěn, 2 = koule
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    const n = Math.pow(
      Math.pow(Math.abs(v.x), P) + Math.pow(Math.abs(v.y), P) + Math.pow(Math.abs(v.z), P),
      1 / P,
    );
    v.divideScalar(n);
    const f = 3.2;
    const d = noise3(v.x * f + seed, v.y * f, v.z * f) * 0.7 +
              noise3(v.x * f * 3 + seed, v.y * f * 3, v.z * f * 3) * 0.3;
    v.multiplyScalar(1 + (d - 0.5) * 0.09);
    pos.setXYZ(i, v.x * 0.49, v.y * 0.54, v.z * 0.49); // čtvercový půdorys: hloubka = šířka
  }
  g.computeVertexNormals();
  return g;
}

/* ---------- Hlavní třída ---------- */
export class JH3D {
  constructor(container, { mode = 'default', modelUrl } = {}) {
    this.container = container;
    this.mode = mode;
    // data-model na prvku přebije config.js ('none' = zástupné JH z diamantů)
    this.modelUrl = modelUrl === undefined ? (CONFIG.model || {}).url : (modelUrl === 'none' ? null : modelUrl);
    this.items = [];
    this.pointer = new THREE.Vector2(0, 0);   // -1..1 vůči oknu
    this.ndc = new THREE.Vector2(-10, -10);   // pro raycasting
    this.hovered = null;
    this.clock = new THREE.Clock();
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.95;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.22;

    const key = new THREE.DirectionalLight(0xffffff, 2.6);
    key.position.set(-5, 6, 4);
    const rim = new THREE.DirectionalLight(0xffffff, 0.6);
    rim.position.set(5, -2, 3);
    this.scene.add(key, rim, new THREE.AmbientLight(0xffffff, 0.15));

    this.camera = new THREE.PerspectiveCamera(24, 1, 0.1, 200);
    this.root = new THREE.Group();   // natáčí se za myší
    this.model = new THREE.Group();  // obsah (placeholder nebo GLB)
    this.root.add(this.model);
    this.scene.add(this.root);

    this.raycaster = new THREE.Raycaster();
    this.plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

    this._bind();
    this._resize();
    this._load().then(() => {
      this._fit();
      this._assemble();
      container.classList.add('is-ready');
    });
    this.renderer.setAnimationLoop(() => this._tick());
  }

  async _load() {
    const cfg = CONFIG.model || {};
    if (this.modelUrl) {
      try {
        const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(this.modelUrl);
        const obj = gltf.scene;
        const box = new THREE.Box3().setFromObject(obj);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        obj.position.sub(center);
        const wrap = new THREE.Group();
        wrap.add(obj);
        wrap.scale.setScalar((6 / (size.y || 1)) * (cfg.scale || 1));
        if (cfg.rotation) wrap.rotation.set(...cfg.rotation);
        this.model.add(wrap);

        // Model z více dílů → každý díl reaguje na myš zvlášť (jako diamanty)
        const meshes = [];
        obj.traverse((o) => { if (o.isMesh) meshes.push(o); });
        if (cfg.interactiveParts !== false && meshes.length > 1) {
          this.model.updateMatrixWorld(true);
          meshes.forEach((m, i) => {
            this.model.attach(m); // zachová polohu, díl je teď přímo v modelu
            m.userData = {
              home: m.position.clone(),
              offset: new THREE.Vector3(),
              vel: new THREE.Vector3(),
              spin: 0,
              baseRotY: m.rotation.y,
              restStep: Math.PI * 2,
              phase: hash(i, 3, 7) * Math.PI * 2,
            };
            this.items.push(m);
          });
          this.model.remove(wrap);
        }
        return;
      } catch (err) {
        console.warn('[JH3D] Model se nepodařilo načíst, používám placeholder.', err);
      }
    }
    this._buildPlaceholder();
  }

  _buildPlaceholder() {
    const geos = [0, 1, 2, 3].map((s) => diamondGeometry(s * 17.3));
    const mat = new THREE.MeshStandardMaterial({ color: 0xdcdad6, roughness: 0.9, metalness: 0 });
    LAYOUT_PX.forEach(([px, py], i) => {
      const mesh = new THREE.Mesh(geos[i % geos.length], mat);
      const home = new THREE.Vector3((px - CENTER[0]) / UNIT, -(py - CENTER[1]) / UNIT, 0);
      mesh.position.copy(home);
      mesh.rotation.y = (hash(i, 1, 2) - 0.5) * 0.4;
      mesh.userData = {
        home,
        offset: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        spin: 0,
        baseRotY: mesh.rotation.y,
        phase: hash(i, 3, 7) * Math.PI * 2,
      };
      this.model.add(mesh);
      this.items.push(mesh);
    });
  }

  /** Úvodní animace: díly přiletí z různých stran a spojí se do nápisu. */
  _assemble() {
    if (this.reducedMotion || !this.items.length) return;
    const xs = this.items.map((m) => m.userData.home.x);
    const minX = Math.min(...xs), spanX = Math.max(...xs) - minX || 1;
    this.items.forEach((m, i) => {
      const u = m.userData;
      const a = hash(i, 9, 4) * Math.PI * 2;
      const r = 2.5 + hash(i, 5, 1) * 3.5;
      u.offset.set(Math.cos(a) * r, Math.sin(a) * r, 4 + hash(i, 2, 8) * 6);
      u.vel.set(0, 0, 0);
      u.spin = (hash(i, 7, 3) - 0.5) * 16;
      // zleva doprava, s lehkou náhodou → nápis se „skládá“
      u.hold = 0.15 + ((u.home.x - minX) / spanX) * 0.9 + hash(i, 1, 1) * 0.25;
    });
  }

  _fit() {
    const box = new THREE.Box3().setFromObject(this.model);
    const size = box.getSize(new THREE.Vector3());
    const fov = THREE.MathUtils.degToRad(this.camera.fov);
    const aspect = this.camera.aspect;
    const pad = 1.12;
    this.tiltScale = Math.min(1, 1.6 / (size.x / (size.y || 1)));
    const distH = (size.y * pad) / 2 / Math.tan(fov / 2);
    const distW = (size.x * pad) / 2 / (Math.tan(fov / 2) * aspect);
    this.camera.position.set(0, 0, Math.max(distH, distW) + size.z / 2);
    this.camera.lookAt(0, 0, 0);
  }

  _bind() {
    this._onMove = (e) => {
      this.pointer.set(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1,
      );
      const r = this.renderer.domElement.getBoundingClientRect();
      this.ndc.set(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        -((e.clientY - r.top) / r.height) * 2 + 1,
      );
    };
    this._onLeave = () => { this.pointer.set(0, 0); this.ndc.set(-10, -10); };
    window.addEventListener('pointermove', this._onMove, { passive: true });
    document.addEventListener('pointerleave', this._onLeave);

    this._ro = new ResizeObserver(() => { this._resize(); this._fit(); });
    this._ro.observe(this.container);

    this._visible = true;
    this._io = new IntersectionObserver(([e]) => { this._visible = e.isIntersecting; });
    this._io.observe(this.container);
  }

  _resize() {
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  _tick() {
    if (!this._visible) return;
    const dt = Math.min(this.clock.getDelta(), 0.1);
    const t = this.clock.elapsedTime;
    const k = 1 - Math.pow(0.001, dt); // plynulé dotahování nezávislé na FPS

    // 1) celé logo se natáčí za myší
    const tilt = CONFIG.tilt || { x: 0.28, y: 0.45 };
    // široký nápis se natáčí méně, aby nevyjel z rámečku
    this.root.rotation.y += (this.pointer.x * tilt.y * (this.tiltScale ?? 1) - this.root.rotation.y) * k * 0.6;
    this.root.rotation.x += (-this.pointer.y * tilt.x - this.root.rotation.x) * k * 0.6;

    if (this.items.length) {
      // 2) hover → diamant pod kurzorem se roztočí
      this.raycaster.setFromCamera(this.ndc, this.camera);
      const hit = this.raycaster.intersectObjects(this.items, false)[0];
      const obj = hit ? hit.object : null;
      if (obj && obj !== this.hovered) obj.userData.spin += 9;
      this.hovered = obj;
      this.container.style.cursor = obj ? 'pointer' : '';

      // 3) na 404 se diamanty rozutíkají před kurzorem
      let local = null;
      if (this.mode === 'broken') {
        const p = new THREE.Vector3();
        if (this.raycaster.ray.intersectPlane(this.plane, p)) local = this.model.worldToLocal(p);
      }

      for (const m of this.items) {
        const u = m.userData;
        if (local && this.ndc.x > -5) {
          const dx = u.home.x + u.offset.x - local.x;
          const dy = u.home.y + u.offset.y - local.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 1.8) {
            const f = (1.8 - dist) * 14 * dt;
            u.vel.x += (dx / (dist || 1)) * f;
            u.vel.y += (dy / (dist || 1)) * f;
            u.vel.z += f * 0.6;
          }
        }
        // při úvodu díl chvíli čeká mimo scénu, pak se pustí na své místo
        if (u.hold > 0) { u.hold -= dt; m.visible = false; continue; }
        m.visible = true;
        // pružina zpět na místo (jemné kroky → stejné chování při jakémkoli FPS)
        for (let left = dt; left > 0; left -= 1 / 120) {
          const h = Math.min(left, 1 / 120);
          u.vel.addScaledVector(u.offset, -18 * h);
          u.vel.multiplyScalar(Math.pow(0.004, h));
          u.offset.addScaledVector(u.vel, h * 3);
        }

        const float = this.reducedMotion ? 0 : Math.sin(t * 0.9 + u.phase) * 0.035;
        m.position.set(u.home.x + u.offset.x, u.home.y + u.offset.y + float, u.home.z + u.offset.z);

        // rotace: roztočení a návrat na nejbližší „klidovou“ polohu
        m.rotation.y += u.spin * dt;
        u.spin *= Math.pow(0.12, dt);
        if (Math.abs(u.spin) < 0.4) {
          const step = u.restStep || Math.PI; // diamant je souměrný po 180°, nesouměrné díly až po 360°
          const rest = u.baseRotY + Math.round((m.rotation.y - u.baseRotY) / step) * step;
          m.rotation.y += (rest - m.rotation.y) * k * 0.4;
        }
        m.rotation.z = u.offset.x * -0.3;
        m.rotation.x = u.offset.y * 0.35;
      }
    }

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.renderer.setAnimationLoop(null);
    window.removeEventListener('pointermove', this._onMove);
    document.removeEventListener('pointerleave', this._onLeave);
    this._ro.disconnect();
    this._io.disconnect();
    this.renderer.dispose();
  }
}

/** Připojí 3D logo ke všem prvkům s atributem data-jh3d. */
export function mountAll() {
  document.querySelectorAll('[data-jh3d]').forEach((el) => {
    try {
      new JH3D(el, { mode: el.dataset.jh3d || 'default', modelUrl: el.dataset.model });
    } catch (err) {
      console.warn('[JH3D] WebGL není k dispozici.', err);
      el.classList.add('no-webgl');
    }
  });
}
