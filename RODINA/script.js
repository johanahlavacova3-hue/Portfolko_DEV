// script.js

const modelViewer = document.querySelector('model-viewer');

if (modelViewer) {
    
    modelViewer.addEventListener('load', () => {
        console.log('Model DJM.glb byl úspěšně načten!');
    });
    
} else {
    console.error('Element <model-viewer> nebyl na stránce nalezen.');
}

/**
 * Funkce pro zkopírování čísla účtu do schránky.
 * Číslo účtu je bez mezer, aby jej bylo možné snadno vložit.
 */
function copyAccount() {
    // Získáme element s číslem účtu
    const accountElement = document.getElementById('accountNumber');
    const copyMessage = document.getElementById('copyMessage');
    
    // Získání čistého textu (odstranění mezer)
    const accountNumberText = accountElement.textContent.trim().replace(/\s/g, '');

    // Použijeme moderní API pro kopírování
    navigator.clipboard.writeText(accountNumberText)
        .then(() => {
            // Zobrazíme krátkou zprávu
            copyMessage.textContent = 'Zkopírováno!';
            copyMessage.classList.add('visible');
            
            // Po 1.5 sekundě zprávu skryjeme
            setTimeout(() => {
                copyMessage.classList.remove('visible');
            }, 1500);
        })
        .catch(err => {
            console.error('Nepodařilo se zkopírovat text: ', err);
            copyMessage.textContent = 'Chyba!';
            copyMessage.classList.add('visible');
            setTimeout(() => {
                copyMessage.classList.remove('visible');
            }, 1500);
        });
}

// Zpřístupníme funkci copyAccount globálně, protože je volána z HTML (onclick)
window.copyAccount = copyAccount;
