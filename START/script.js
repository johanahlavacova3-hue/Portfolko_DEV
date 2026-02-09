const body = document.body;
const modeLabel = document.getElementById('mode-label');
const rybaIcon = document.getElementById('ryba-icon');

const interactiveElements = document.querySelectorAll(
    '#name, #description, .main-title, .sub-text, .game-icon'
);

// --- NASTAVENÍ CHOVÁNÍ ---
const MAX_SHIFT = 400;
const REACTION_DISTANCE = 250;
const SMOOTHNESS = 0.08;
const JITTER_AMOUNT = 3;

const elementStates = new Map();

// Inicializace stavů prvků
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

let animationFrameId = null;
let mouseX = -1000;
let mouseY = -1000;

const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

// --- ANIMAČNÍ SMYČKA ---
function animate() {
    if (!body.classList.contains('dark-mode')) return;

    interactiveElements.forEach(element => {
        const state = elementStates.get(element);
        const rect = element.getBoundingClientRect();

        const anchorX = rect.left + rect.width / 2 - state.currentX;
        const anchorY = rect.top + rect.height / 2 - state.currentY;

        const dx = mouseX - anchorX;
        const dy = mouseY - anchorY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < REACTION_DISTANCE && distance > 0) {
            const dirX = dx / distance;
            const dirY = dy / distance;

            state.targetX = dirX * -MAX_SHIFT;
            state.targetY = dirY * -MAX_SHIFT;

            if (element.id === 'ryba-icon') {
                state.targetAngle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
            }
        } else {
            state.targetX = 0;
            state.targetY = 0;
            state.targetAngle = 0;
        }

        state.currentX += (state.targetX - state.currentX) * SMOOTHNESS;
        state.currentY += (state.targetY - state.currentY) * SMOOTHNESS;

        if (element.id === 'ryba-icon') {
            let dAngle = state.targetAngle - state.currentAngle;
            while (dAngle > 180) dAngle -= 360;
            while (dAngle < -180) dAngle += 360;
            state.currentAngle += dAngle * SMOOTHNESS;

            element.style.transform =
                `translate(${state.currentX}px, ${state.currentY}px) rotate(${state.currentAngle}deg)`;
        } else {
            element.style.transform =
                `translate(${state.currentX}px, ${state.currentY}px)`;
        }
    });

    animationFrameId = requestAnimationFrame(animate);
}

// --- OVLÁDÁNÍ POZICE KURZORU / DOTYKU ---
function updateMousePosition(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
}

function touchHandler(e) {
    const touch = e.touches[0];
    if (!touch) return;
    mouseX = touch.clientX;
    mouseY = touch.clientY;
}

// --- PŘEPÍNÁNÍ REŽIMŮ ---
function toggleMode() {
    const isDark = body.classList.contains('dark-mode');

    if (isDark) {
        // → LIGHT MODE
        body.classList.remove('dark-mode');
        body.classList.add('light-mode');
        modeLabel.textContent = 'NORMÁLNÍ REŽIM';

        if (rybaIcon) rybaIcon.src = 'RYBA-WH.png';

        document.removeEventListener('mousemove', updateMousePosition);
        document.removeEventListener('touchstart', touchHandler);
        document.removeEventListener('touchmove', touchHandler);

        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;

        resetElements();

    } else {
        // → DARK MODE
        body.classList.remove('light-mode');
        body.classList.add('dark-mode');
        modeLabel.textContent = 'ZÁBAVNÝ REŽIM';

        if (rybaIcon) rybaIcon.src = 'START/RYBA-BL.png';

        if (isMobile) {
            document.addEventListener('touchstart', touchHandler, { passive: false });
            document.addEventListener('touchmove', touchHandler, { passive: false });
        } else {
            document.addEventListener('mousemove', updateMousePosition);
            document.querySelectorAll('.interactable').forEach(a => {
                a.href = '#';
                a.onclick = e => e.preventDefault();
            });
        }

        if (!animationFrameId) animate();
    }
}

// --- RESET PRVKŮ ---
function resetElements() {
    interactiveElements.forEach(element => {
        element.style.transform = 'translate(0px, 0px) rotate(0deg)';
        const state = elementStates.get(element);
        state.currentX = 0;
        state.currentY = 0;
        state.targetX = 0;
        state.targetY = 0;
        state.currentAngle = 0;
        state.targetAngle = 0;
    });

    document.querySelectorAll('.interactable').forEach(a => {
        a.href = a.getAttribute('data-url') || '#';
        a.onclick = null;
    });
}

// --- INICIALIZACE (VÝCHOZÍ = DARK MODE) ---
document.addEventListener('DOMContentLoaded', () => {
    interactiveElements.forEach(el => el.style.transition = 'none');

    body.classList.add('dark-mode');
    modeLabel.textContent = 'ZÁBAVNÝ REŽIM';

    if (rybaIcon) rybaIcon.src = 'START/RYBA-BL.png';

    if (isMobile) {
        document.addEventListener('touchstart', touchHandler, { passive: false });
        document.addEventListener('touchmove', touchHandler, { passive: false });
    } else {
        document.addEventListener('mousemove', updateMousePosition);
    }

    animate();
});
