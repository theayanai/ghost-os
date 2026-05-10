// js/app-router.js

// Create and handle portrait mode "Continue Anyway" button
function createPortraitContinueButton() {
    const existingBtn = document.getElementById('portrait-continue-btn');
    if (existingBtn) existingBtn.remove();

    const btn = document.createElement('button');
    btn.id = 'portrait-continue-btn';
    btn.className = 'ghost-btn';
    btn.textContent = 'Continue Anyway';
    btn.style.cssText = `
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        padding: 15px 30px;
        background: rgba(255, 0, 0, 0.2);
        border: 2px solid red;
        color: red;
        font-family: 'Creepster', cursive;
        font-size: 1.2rem;
        cursor: pointer;
        z-index: 1000000;
        display: none;
    `;

    btn.addEventListener('click', () => {
        document.body.classList.add('portrait-continue');
        btn.style.display = 'none';
    });

    document.body.appendChild(btn);
    return btn;
}

// Initialize the portrait continue button
const portraitContinueBtn = createPortraitContinueButton();

// Show/hide portrait continue button based on screen orientation
function updatePortraitButton() {
    const isPortrait = window.innerHeight > window.innerWidth;
    const isMobile = window.innerWidth < 850;
    const isInStudioOrVoid = document.getElementById('view-studio').classList.contains('active-screen') ||
                           document.getElementById('void-ui').style.display === 'block' ||
                           document.getElementById('void-intro').style.display === 'block';

    if (isPortrait && isMobile && isInStudioOrVoid && !document.body.classList.contains('portrait-continue')) {
        portraitContinueBtn.style.display = 'block';
    } else {
        portraitContinueBtn.style.display = 'none';
    }
}

// Listen for orientation changes
window.addEventListener('resize', updatePortraitButton);
window.addEventListener('orientationchange', () => {
    setTimeout(updatePortraitButton, 100);
});

// Listen for ALL clicks on the document
document.addEventListener('click', (e) => {

    // Check if the clicked element has a 'data-target' attribute
    const targetId = e.target.getAttribute('data-target');

    if (targetId) {
        // 1. Find all screens and hide them
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active-screen');
            screen.classList.add('hidden-screen');
        });

        // 2. Find the specific screen we want and show it
        const nextScreen = document.getElementById(targetId);
        if (nextScreen) {
            nextScreen.classList.remove('hidden-screen');
            nextScreen.classList.add('active-screen');

            // Update portrait button visibility
            setTimeout(updatePortraitButton, 50);
        }
    }
});

// Also check for void game start button
document.addEventListener('click', (e) => {
    if (e.target.id === 'start-void-btn') {
        setTimeout(updatePortraitButton, 50);
    }
});
