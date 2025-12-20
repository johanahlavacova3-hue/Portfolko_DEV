const body = document.body;
const modeLabel = document.getElementById('mode-label');
const rybaIcon = document.getElementById('ryba-icon');

const interactiveElements = document.querySelectorAll(
    '#name, #description, .main-title, .sub-text, .game-icon'
);

// --- NASTAVENÍ "UTÍKÁNÍ" ---
const MAX_SHIFT = 800;        // ZVĚTŠENO: Jak moc maximálně odletí (bývalo 600)
const REACTION_DISTANCE = 200; // ZVĚTŠENO: Reaguje už z větší dálky (bývalo 80)
const BOUND_LIMIT = 400;      // ZVĚTŠENO: Limit, kam až může element zajet (bývalo 150)
const MIN_DISTANCE_RYBA = 50; 
const JITTER_MAX = 3; 

let jitterInterval;
const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

// Transform funkce
function applyRybaTransform(x, y, angle) {
    if (rybaIcon) {
        // Přidán transition: none pro okamžitou reakci bez zpoždění CSS
        rybaIcon.style.transition = 'none'; 
        rybaIcon.style.transform = `translate(${x}px, ${y}px) rotate(${angle}deg)`;
    }
}

function applyNormalTransform(element, x, y) {
    // Přidán transition: none pro okamžitou reakci
    element.style.transition = 'none';
    element.style.transform = `translate(${x}px, ${y}px)`;
}

function toggleMode() {
    const isCurrentlyDark = body.classList.contains('dark-mode');

    if (isCurrentlyDark) {
        body.classList.remove('dark-mode');
        body.classList.add('light-mode');
    } else {
        body.classList.remove('light-mode');
        body.classList.add('dark-mode');
    }

    const isNowDark = body.classList.contains('dark-mode');
    modeLabel.textContent = 'ZÁBAVNÝ REŽIM';

    if (rybaIcon) {
        rybaIcon.src = isNowDark ? 'RYBA-BL.png' : 'RYBA-WH.png';
    }

    if (isNowDark) {
        if (isMobile) {
            document.addEventListener('touchstart', touchHandler, { passive: false });
            document.addEventListener('touchmove', touchHandler, { passive: false });
        } else {
            document.addEventListener('mousemove', moveElements);
            startJitter();
        }
        resetElementsPosition(true);

        if (!isMobile) { 
            document.querySelectorAll('.interactable').forEach(a => {
                a.href = "#";
                a.onclick = e => e.preventDefault();
            });
        }
    } else {
        if (isMobile) {
            document.removeEventListener('touchstart', touchHandler);
            document.removeEventListener('touchmove', touchHandler);
        } else {
            document.removeEventListener('mousemove', moveElements);
            stopJitter();
        }
        resetElementsPosition(false); // Reset vrátí transition do normálu

        document.querySelectorAll('.interactable').forEach(a => {
            a.href = a.getAttribute('data-url');
            a.onclick = null;
        });
    }
}

function moveElements(e) {
    if (!body.classList.contains('dark-mode')) return;

    interactiveElements.forEach(element => {
        const rect = element.getBoundingClientRect();
        // Načítáme aktuální posun, abychom věděli, kde "virtuálně" je
        const baseX = parseFloat(element.dataset.baseX) || 0;
        const baseY = parseFloat(element.dataset.baseY) || 0;

        // Střed elementu
        const centerX = rect.left + rect.width / 2; // Tady nečteme baseX pro výpočet myši, chceme reálnou polohu
        const centerY = rect.top + rect.height / 2;

        // Vektor od středu elementu k myši
        // Poznámka: Aby to neutíkalo "donekonečna" pryč z obrazovky, počítáme to 
        // relativně k původní pozici elementu na stránce + jeho aktuální posun.
        
        // Zjednodušená logika pro agresivní útěk:
        // Potřebujeme vědět, kde je myš relativně k PŮVODNÍMU středu elementu (bez posunu),
        // abychom vypočítali nový posun.
        const originalCenterX = centerX - baseX; 
        const originalCenterY = centerY - baseY;

        let dx = e.clientX - (originalCenterX + baseX);
        let dy = e.clientY - (originalCenterY + baseY);
        let distance = Math.sqrt(dx * dx + dy * dy);

        // Pokud je myš příliš blízko
        if (distance < REACTION_DISTANCE && distance > 0) {
            
            // --- HLAVNÍ ZMĚNA: OKAMŽITÝ ÚTĚK ---
            // Místo faktoru (1 - dist/max), který to zpomaluje,
            // prostě řekneme: Jsi blízko? Vypadni na maximální vzdálenost.
            
            // Normalizovaný směr od myši (jednotkový vektor)
            const dirX = dx / distance;
            const dirY = dy / distance;

            // Cílový posun = směrem od myši * MAX_SHIFT
            // Vynásobíme -1, aby to šlo OD myši
            let targetX = dirX * -MAX_SHIFT; 
            let targetY = dirY * -MAX_SHIFT;

            // Pro rybu zachováme logiku navíc (extra push)
            if (element.id === 'ryba-icon') {
                 // Ryba má trochu plynulejší logiku, aby se stíhala otáčet
                 let factor = 1 - (distance / REACTION_DISTANCE); 
                 // U ryby necháme trochu dynamiky, ale zrychlíme ji
                 targetX = dirX * -MAX_SHIFT * (factor + 0.5); 
                 targetY = dirY * -MAX_SHIFT * (factor + 0.5);

                 const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
                 applyRybaTransform(targetX, targetY, angle);
            } else {
                // Texty a ostatní prvky:
                // Omezíme, aby neutekly úplně mimo obrazovku (BOUND_LIMIT), 
                // ale reagují okamžitě na hranici limitu.
                
                targetX = Math.max(-BOUND_LIMIT, Math.min(BOUND_LIMIT, targetX));
                targetY = Math.max(-BOUND_LIMIT, Math.min(BOUND_LIMIT, targetY));
                
                applyNormalTransform(element, targetX, targetY);
            }

            element.dataset.baseX = targetX.toFixed(2);
            element.dataset.baseY = targetY.toFixed(2);
        }
    });
}

function touchHandler(e) {
    e.preventDefault();
    const touch = e.touches[0];
    if (touch) {
        moveElements(touch);
    }
}

function startJitter() {
    if (jitterInterval) clearInterval(jitterInterval);
    jitterInterval = setInterval(() => {
        interactiveElements.forEach(element => {
            if (element.id === 'ryba-icon') return;
            const baseX = parseFloat(element.dataset.baseX) || 0;
            const baseY = parseFloat(element.dataset.baseY) || 0;
            const jitterX = (Math.random() - 0.5) * JITTER_MAX * 2;
            const jitterY = (Math.random() - 0.5) * JITTER_MAX * 2;
            applyNormalTransform(element, baseX + jitterX, baseY + jitterY);
        });
    }, 80);
}

function stopJitter() {
    if (jitterInterval) clearInterval(jitterInterval);
    jitterInterval = null;
}

function resetElementsPosition(initialize) {
    interactiveElements.forEach(element => {
        // Při vypnutí vrátíme transition (pokud je v CSS definovaná), aby se vrátily plynule
        element.style.transition = initialize ? 'none' : ''; 
        
        if (!initialize) {
            element.style.transform = element.id === 'ryba-icon' ? 'translate(0px, 0px) rotate(0deg)' : 'translate(0px, 0px)';
        }
        element.dataset.baseX = 0;
        element.dataset.baseY = 0;
    });
}

// Inicializace
document.addEventListener('DOMContentLoaded', () => {
    if (body.classList.contains('dark-mode')) {
        if (isMobile) {
            document.addEventListener('touchstart', touchHandler, { passive: false });
            document.addEventListener('touchmove', touchHandler, { passive: false });
        } else {
            document.addEventListener('mousemove', moveElements);
            startJitter();
        }
        resetElementsPosition(true);

        if (!isMobile) { 
            document.querySelectorAll('.interactable').forEach(a => {
                a.href = "#";
                a.onclick = e => e.preventDefault();
            });
        }
    }
});
