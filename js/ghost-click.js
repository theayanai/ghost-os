let hoverTimer = 0;
// Adjust click threshold based on device - faster on mobile for better UX
const isMobile = window.innerWidth < 768;
const clickThreshold = isMobile ? 30 : 40; // Faster clicks on mobile
let currentlyHoveredElement = null;
let justClickedElement = null;

const circle = document.querySelector('.progress-ring__circle');
const circumference = isMobile ? 18 * 2 * Math.PI : 23 * 2 * Math.PI; 

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
