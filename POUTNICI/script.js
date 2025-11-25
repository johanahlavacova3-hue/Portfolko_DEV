// script.js

const modelViewer = document.querySelector('model-viewer');

if (modelViewer) {
    
    modelViewer.addEventListener('load', () => {
        console.log('Model CHATA.glb byl úspěšně načten!');
    });
    
} else {
    console.error('Element <model-viewer> nebyl na stránce nalezen.');
}
