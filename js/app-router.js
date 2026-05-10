// js/app-router.js

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
        }
    }
});
