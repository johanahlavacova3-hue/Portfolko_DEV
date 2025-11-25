// script.js

// Najdeme náš model na stránce
const modelViewer = document.querySelector('model-viewer');

// Zkontrolujeme, jestli existuje
if (modelViewer) {
    
    // Můžeme například poslouchat událost 'load',
    // která se spustí, až bude model plně načten.
    modelViewer.addEventListener('load', () => {
        console.log('Model CHATA.glb byl úspěšně načten!');
    });

    // Pro samotné otáčení a ovládání myší není potřeba žádný JS kód,
    // vše je již nastaveno v HTML (auto-rotate a camera-controls).
    
} else {
    console.error('Element <model-viewer> nebyl na stránce nalezen.');
}
