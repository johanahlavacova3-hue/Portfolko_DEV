// Importujeme potřebné části z knihovny Three.js (načítáme je z CDN)
import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';
import { GLTFLoader } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/controls/OrbitControls.js';

// --- 1. Základní nastavení scény ---

// Najdeme kontejner v HTML
const container = document.getElementById('scene-container');

// Scéna
const scene = new THREE.Scene();
// Nastavíme průhledné pozadí, aby bylo vidět pozadí z CSS
scene.background = null; 

// Kamera (perspektivní)
const camera = new THREE.PerspectiveCamera(
    75, // Zorný úhel (FOV)
    container.clientWidth / container.clientHeight, // Poměr stran
    0.1, // Blízká rovina
    1000 // Vzdálená rovina
);
camera.position.z = 5; // Posuneme kameru dozadu, aby byl model vidět

// Renderer (vykreslovač)
const renderer = new THREE.WebGLRenderer({ 
    antialias: true, // Vyhlazování hran
    alpha: true // Povolí průhledné pozadí
});
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(window.devicePixelRatio); // Ostré vykreslení na HiDPI displejích
container.appendChild(renderer.domElement); // Přidáme renderer do našeho HTML kontejneru

// --- 2. Osvětlení ---

// Ambientní (okolní) světlo - osvětlí model ze všech stran
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);

// Směrové světlo (jako slunce)
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7.5); // Pozice světla
scene.add(directionalLight);

// --- 3. Ovládání myší (OrbitControls) ---
// Umožňuje uživateli otáčet modelem myší (i když se točí sám)
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // Plynulé dobrzdění

// --- 4. Načtení 3D modelu (GLB) ---

const loader = new GLTFLoader();
let model = null; // Zde si uložíme model pro animaci

loader.load(
    'CHATA.glb', // Název vašeho souboru
    
    // Funkce volaná po úspěšném načtení
    (gltf) => {
        model = gltf.scene;

        // Automatické centrování a škálování modelu
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        // Přesuneme model do středu scény
        model.position.sub(center); 

        // Změníme měřítko, aby se model vešel do kamery
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 3 / maxDim; // '3' je konstanta, můžete upravit
        model.scale.set(scale, scale, scale);

        // Přidáme model do scény
        scene.add(model);
    },
    
    // Funkce volaná během načítání (pro ukazatel progresu)
    (xhr) => {
        console.log((xhr.loaded / xhr.total * 100) + '% načteno');
    },
    
    // Funkce volaná při chybě
    (error) => {
        console.error('Chyba při načítání modelu:', error);
    }
);

// --- 5. Animační smyčka ---

function animate() {
    // Požádáme prohlížeč o další snímek
    requestAnimationFrame(animate);

    // Aktualizujeme ovládání myší
    controls.update();

    // Otáčení modelu (pokud už je načtený)
    if (model) {
        // Změňte hodnotu '0.005' pro rychlejší/pomalejší otáčení
        model.rotation.y += 0.005; 
    }

    // Vykreslíme scénu z pohledu kamery
    renderer.render(scene, camera);
}

// Spustíme animační smyčku
animate();

// --- 6. Responzivita (při změně velikosti okna) ---

window.addEventListener('resize', () => {
    // Aktualizujeme rozměry kontejneru
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Aktualizujeme poměr stran kamery
    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    // Aktualizujeme velikost rendereru
    renderer.setSize(width, height);
});
