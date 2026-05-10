let hoverTimer = 0;
// INCREASED threshold so it takes ~2 seconds to click. No more accidental clicks!
const clickThreshold = 40; 
let currentlyHoveredElement = null;
let justClickedElement = null; 

const circle = document.querySelector('.progress-ring__circle');
const circumference = 23 * 2 * Math.PI; 

setInterval(() => {
    const elementUnderCursor = document.elementFromPoint(window.ghostX, window.ghostY);
    const targetBtn = elementUnderCursor ? elementUnderCursor.closest('.ghost-btn') : null;

    if (targetBtn) {
        if (targetBtn === justClickedElement) {
            circle.style.strokeDashoffset = circumference;
            return; 
        }

        if (currentlyHoveredElement !== targetBtn) {
            if (currentlyHoveredElement) currentlyHoveredElement.classList.remove('stared-at');
            hoverTimer = 0;
            currentlyHoveredElement = targetBtn;
            targetBtn.classList.add('stared-at');
        } else {
            hoverTimer++;
            const progress = hoverTimer / clickThreshold;
            const offset = circumference - (progress * circumference);
            circle.style.strokeDashoffset = offset;

            if (hoverTimer >= clickThreshold) {
                const ghostCursor = document.getElementById('ghost-cursor');
                ghostCursor.style.transform = 'translate(-50%, -50%) scale(1.5)';
                setTimeout(() => ghostCursor.style.transform = 'translate(-50%, -50%) scale(1)', 200);

                targetBtn.click();
                justClickedElement = targetBtn; 
                hoverTimer = 0; 
                circle.style.strokeDashoffset = circumference;
            }
        }
    } else {
        justClickedElement = null; 
        if (currentlyHoveredElement) {
            currentlyHoveredElement.classList.remove('stared-at');
            currentlyHoveredElement = null;
        }
        hoverTimer = 0;
        circle.style.strokeDashoffset = circumference;
    }
}, 50);
