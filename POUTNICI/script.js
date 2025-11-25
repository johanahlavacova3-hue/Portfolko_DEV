// script.js

const modelViewer = document.querySelector('model-viewer');

if (modelViewer) {
    
    modelViewer.addEventListener('load', () => {
        console.log('Model CHATA.glb byl úspěšně načten!');
    });

    // Všechno (otáčení, responzivita) je řízeno 
    // HTML atributy a CSS souborem.
    
} else {
    console.error('Element <model-viewer> nebyl na stránce nalezen.');
}
