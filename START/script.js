const body = document.body;
const modeLabel = document.getElementById('mode-label');
const rybaIcon = document.getElementById('ryba-icon');

const interactiveElements = document.querySelectorAll(
    '#name, #description, .main-title, .sub-text, .game-icon'
);

// --- NASTAVENÍ CHOVÁNÍ ---
const MAX_SHIFT = 400;         // Jak daleko maximálně uteče
const REACTION_DISTANCE = 250; // Na jakou dálku si všimne myši
const SMOOTHNESS = 0.08;       // 0.01 = velmi líné, 0.1 = normální, 0.5 = velmi rychlé
const JITTER_AMOUNT = 5;       // Síla třesu

// Stavy pro animaci (ukládáme si pozice pro každý element zvlášť)
const elementStates = new Map();

// Inicializace stavů
interactiveElements.forEach(el => {
    elementStates.set(el, {
        currentX: 0,
        currentY: 0,
        targetX: 0,
        targetY: 0,
        currentAngle: 0,
        targetAngle: 0
    });
});

let animationFrameId;
let isJittering = false;
let mouseX = -1000; // Mimo obrazovku na startu
let mouseY = -1000;

const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

// Hlavní animační smyčka (běží 60fps)
function animate() {
    if (!body.classList.contains('dark-mode')) return;

    interactiveElements.forEach(element => {
        const state = elementStates.get(element);
        const rect = element.getBoundingClientRect();
        
        // Střed elementu (původní pozice na stránce)
        // Odečítáme aktuální posun, abychom měli "kotvu"
        const anchorX = rect.left + rect.width / 2 - state.currentX;
        const anchorY = rect.top + rect.height / 2 - state.currentY;

        // Vypočítat vzdálenost myši od "kotvy" elementu
        const dx = mouseX - anchorX;
        const dy = mouseY - anchorY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // --- LOGIKA ÚTĚKU (VÝPOČET CÍLE) ---
        if (distance < REACTION_DISTANCE) {
            // Vektor směrem OD myši
            const dirX = dx / distance;
            const dirY = dy / distance;

            // Cílová pozice je na opačné straně
            // Čím blíže je myš, tím dál element chce být (až do MAX_SHIFT)
            let pushFactor = 1; // Můžeme upravit pro dynamiku, zatím plná síla
            
            // Cíl: Uteč na MAX_SHIFT daleko od myši
            let tx = dirX * -MAX_SHIFT * pushFactor;
            let ty = dirY * -MAX_SHIFT * pushFactor;

            // Přidáme náhodný třes (Jitter), pokud je aktivní
            if (isJittering && element.id !== 'ryba-icon') {
                tx += (Math.random() - 0.5) * JITTER_AMOUNT;
                ty += (Math.random() - 0.5) * JITTER_AMOUNT;
            }

            state.targetX = tx;
            state.targetY = ty;

            // Úhel pro rybu
            if (element.id === 'ryba-icon') {
                // Atan2 vrací úhel k myši, my chceme od myši (+180 nebo prostě logika rotace)
                // +90 kompenzuje orientaci obrázku, pokud ryba plave nahoru
                state.targetAngle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
            }

        } else {
            // Myš je daleko -> návrat domů
            state.targetX = 0;
            state.targetY = 0;
            state.targetAngle = 0;
        }

        // --- VYHLAZENÍ POHYBU (LERP) ---
        // Vzorec: Současná = Současná + (Cíl - Současná) * Faktor_Vyhlazení
        state.currentX += (state.targetX - state.currentX) * SMOOTHNESS;
        state.currentY += (state.targetY - state.currentY) * SMOOTHNESS;
        
        // Aplikace do CSS
        if (element.id === 'ryba-icon') {
            // Vyhlazení i pro rotaci ryby
            // Ošetření přeskoku úhlu (např. z 359 na 0)
            let dAngle = state.targetAngle - state.currentAngle;
            while (dAngle > 180) dAngle -= 360;
            while (dAngle < -180) dAngle += 360;
            state.currentAngle += dAngle * SMOOTHNESS;

            element.style.transform = `translate(${state.currentX}px, ${state.currentY}px) rotate(${state.currentAngle}deg)`;
        } else {
            element.style.transform = `translate(${state.currentX}px, ${state.currentY}px)`;
        }
    });

    animationFrameId = requestAnimationFrame(animate);
}

// Handler pro pohyb myši - jen ukládá souřadnice, nic nepočítá
function updateMousePosition(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
}

function touchHandler(e) {
    // e.preventDefault(); // Blokování scrollu na mobilu (volitelné)
    const touch = e.touches[0];
    if (touch) {
        mouseX = touch.clientX;
        mouseY = touch.clientY;
    }
}

function toggleMode() {
    const isCurrentlyDark = body.classList.contains('dark-mode');

    if (isCurrentlyDark) {
        // VYPÍNÁNÍ
        body.classList.remove('dark-mode');
        body.classList.add('light-mode');
    } else {
        // ZAPÍNÁNÍ
        body.classList.remove('light-mode');
        body.classList.add('dark-mode');
    }

    const isNowDark = body.classList.contains('dark-mode');
    modeLabel.textContent = 'ZÁBAVNÝ REŽIM';

    if (rybaIcon) {
        rybaIcon.src = isNowDark ? 'RYBA-BL.png' : 'RYBA-WH.png';
    }

    if (isNowDark) {
        // Start naslouchání
        if (isMobile) {
            document.addEventListener('touchstart', touchHandler, { passive: false });
            document.addEventListener('touchmove', touchHandler, { passive: false });
        } else {
            document.addEventListener('mousemove', updateMousePosition);
        }
        
        isJittering = true;
        
        // Blokace odkazů na PC
        if (!isMobile) { 
            document.querySelectorAll('.interactable').forEach(a => {
                a.href = "#";
                a.onclick = e => e.preventDefault();
            });
        }

        // Spustit smyčku animace
        if (!animationFrameId) animate();

    } else {
        // Stop naslouchání
        if (isMobile) {
            document.removeEventListener('touchstart', touchHandler);
            document.removeEventListener('touchmove', touchHandler);
        } else {
            document.removeEventListener('mousemove', updateMousePosition);
        }
        
        isJittering = false;
        
        // Zastavit smyčku animace
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;

        // Reset pozic (okamžitě nebo přes CSS transition)
        resetElementsPosition();

        // Obnovení odkazů
        document.querySelectorAll('.interactable').forEach(a => {
            a.href = a.getAttribute('data-url');
            a.onclick = null;
        });
    }
}

function resetElementsPosition() {
    interactiveElements.forEach(element => {
        // Reset vizuálu
        element.style.transform = element.id === 'ryba-icon' ? 'translate(0px, 0px) rotate(0deg)' : 'translate(0px, 0px)';
        
        // Reset interního stavu
        const state = elementStates.get(element);
        state.currentX = 0;
        state.currentY = 0;
        state.targetX = 0;
        state.targetY = 0;
        state.currentAngle = 0;
        state.targetAngle = 0;
    });
}

// Inicializace po načtení
document.addEventListener('DOMContentLoaded', () => {
    // Zajistíme, že ryba a ostatní mají transition nastavené na none v CSS pro JS animaci,
    // ale pokud chceme smooth návrat při vypnutí, řešíme to v toggleMode.
    // Pro tento smooth skript je lepší nechat CSS transition: none;
    interactiveElements.forEach(el => el.style.transition = 'none');

    if (body.classList.contains('dark-mode')) {
        // Pokud je dark mode zapnutý už z výroby/cache
        toggleMode(); // hack pro re-init (nebo zkopírovat logiku initu)
        // Lepší je zavolat logiku initu přímo, ale toggle funguje pokud začínáme v light.
        // Pokud začínáte v dark, zavoláme logiku ručně:
        // (Zde pro jednoduchost předpokládám start v Light, pokud ne, stačí zavolat logiku z 'if (isNowDark)' nahoře)
    }
});
