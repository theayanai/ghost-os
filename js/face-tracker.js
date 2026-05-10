// ============================================================
// DOM ELEMENT REFERENCES
// ============================================================
const videoElement = document.getElementById('input_video');
const ghostCursor = document.getElementById('ghost-cursor');
const camToggleBtn = document.getElementById('stop-cam-btn');

// Start cursor in the middle of the screen
window.ghostX = window.innerWidth / 2;
window.ghostY = window.innerHeight / 2;

// ============================================================
// TRACKING CONFIGURATION
// ============================================================
let trackingMode = 'face';  // Default to Nose tracking
let camera = null;
let isCameraActive = false;
let isAITracking = false;   // True when AI actively sees face or pointing finger

// ============================================================
// 🖱️ BULLETPROOF MOUSE & TOUCH FALLBACK 🖱️
// ============================================================
// Desktop Mouse Fallback
document.addEventListener('mousemove', (e) => {
    if (!isAITracking) {
        window.ghostX = e.clientX;
        window.ghostY = e.clientY;
        ghostCursor.style.left = window.ghostX + 'px';
        ghostCursor.style.top = window.ghostY + 'px';
        if (ghostCursor.style.opacity === '0' || ghostCursor.style.display === 'none') showGhostCursor();
    }
});

// Mobile Touch Drag Fallback - Improved for better mobile experience
document.addEventListener('touchmove', (e) => {
    if (!isAITracking && e.touches.length > 0) {
        // Only prevent default if we're not on a scrollable element
        const target = e.target;
        const isScrollable = target.closest('#terminal-output') ||
                            target.closest('.studio-instructions') ||
                            target.closest('#void-intro');

        if (!isScrollable) {
            e.preventDefault();
        }

        window.ghostX = e.touches[0].clientX;
        window.ghostY = e.touches[0].clientY;
        ghostCursor.style.left = window.ghostX + 'px';
        ghostCursor.style.top = window.ghostY + 'px';
        if (ghostCursor.style.opacity === '0' || ghostCursor.style.display === 'none') showGhostCursor();
    }
}, { passive: false });

// Mobile Touch Start - Update cursor position on tap
document.addEventListener('touchstart', (e) => {
    if (!isAITracking && e.touches.length > 0) {
        window.ghostX = e.touches[0].clientX;
        window.ghostY = e.touches[0].clientY;
        ghostCursor.style.left = window.ghostX + 'px';
        ghostCursor.style.top = window.ghostY + 'px';
        if (ghostCursor.style.opacity === '0' || ghostCursor.style.display === 'none') showGhostCursor();
    }
}, { passive: true });

// ============================================================
// GESTURE MATH (ULTRA-STABLE)
// ============================================================
function isPointing(hand) {
    // Calculates distance between two joints
    const dist = (p1, p2) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
    const wrist = hand[0];
    
    // When hand is open, the middle finger is naturally longer than the index.
    // When you point, the middle finger curls in, making the index much further from the wrist.
    const indexDist = dist(wrist, hand[8]);  // Tip of index
    const middleDist = dist(wrist, hand[12]); // Tip of middle
    
    return indexDist > (middleDist * 1.1); // If index is 10% further than middle, you are pointing!
}

// ============================================================
// 1. HANDS AI
// ============================================================
const hands = new Hands({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`});

// Detect if we're on mobile for optimized settings
const isMobile = window.innerWidth < 768;

hands.setOptions({
    maxNumHands: 1,
    modelComplexity: isMobile ? 0 : 1, // Use lighter model on mobile
    minDetectionConfidence: isMobile ? 0.6 : 0.5, // Higher confidence threshold on mobile
    minTrackingConfidence: isMobile ? 0.6 : 0.5
});

let lastHandSeen = Date.now();
hands.onResults((results) => {
    if (trackingMode === 'hand') {
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const hand = results.multiHandLandmarks[0];
            
            if (isPointing(hand)) {
                isAITracking = true;
                lastHandSeen = Date.now();
                const indexTip = hand[8];
                updateCursor((1 - indexTip.x), indexTip.y);
                showGhostCursor();
            } else {
                // If hand is open, release control back to mouse after 300ms
                if (Date.now() - lastHandSeen > 300) isAITracking = false;
            }
        } else {
            // If hand is off camera, release control back to mouse
            if (Date.now() - lastHandSeen > 300) isAITracking = false;
        }
    }
});

// ============================================================
// 2. FACE AI
// ============================================================
const faceMesh = new FaceMesh({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`});

// Detect if we're on mobile for optimized settings
const isMobileFace = window.innerWidth < 768;

faceMesh.setOptions({
    maxNumFaces: 1,
    minDetectionConfidence: isMobileFace ? 0.6 : 0.5,
    minTrackingConfidence: isMobileFace ? 0.6 : 0.5,
    refineLandmarks: true // Enable refined landmarks for better nose tracking
});

let lastFaceSeen = Date.now();
faceMesh.onResults((results) => {
    if (trackingMode === 'face') {
        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            isAITracking = true;
            lastFaceSeen = Date.now();

            // Use multiple landmarks for more stable tracking
            const face = results.multiFaceLandmarks[0];
            const noseTip = face[1]; // Nose tip
            const noseBridge = face[6]; // Nose bridge

            // Average the nose tip and bridge for more stable tracking
            const avgX = (noseTip.x + noseBridge.x) / 2;
            const avgY = (noseTip.y + noseBridge.y) / 2;

            updateCursor((1 - avgX), avgY);
            showGhostCursor();
        } else {
            // If face is lost, release control back to mouse
            if (Date.now() - lastFaceSeen > 300) isAITracking = false;
        }
    }
});

// ============================================================
// ADAPTIVE SMOOTHING LOGIC
// ============================================================
function updateCursor(rawX, rawY) {
    let targetX = rawX * window.innerWidth;
    let targetY = rawY * window.innerHeight;

    // Calculate speed of movement
    let dx = targetX - window.ghostX;
    let dy = targetY - window.ghostY;
    let distance = Math.sqrt(dx*dx + dy*dy);

    // Detect if we're on mobile for more responsive tracking
    const isMobile = window.innerWidth < 768;

    let smoothing;
    if (isMobile) {
        // More responsive tracking on mobile
        if (distance > 150) smoothing = 0.15; // Very fast for large movements
        else if (distance > 50) smoothing = 0.25; // Fast for medium movements
        else smoothing = 0.4; // Less smoothing for precision
    } else {
        // Desktop settings
        if (distance > 100) smoothing = 0.2;
        else if (distance < 20) smoothing = 0.8;
        else smoothing = 0.5;
    }

    window.ghostX = (window.ghostX * smoothing) + (targetX * (1 - smoothing));
    window.ghostY = (window.ghostY * smoothing) + (targetY * (1 - smoothing));

    ghostCursor.style.left = window.ghostX + 'px';
    ghostCursor.style.top = window.ghostY + 'px';
}

// ============================================================
// CURSOR & CAMERA VISIBILITY CONTROL
// ============================================================
function showGhostCursor() {
    if (!ghostCursor) return;
    ghostCursor.style.display = 'flex';
    ghostCursor.style.visibility = 'visible';
    ghostCursor.style.opacity = '1';
    document.body.style.cursor = 'none'; // Hide native mouse pointer
}

function startCamera() {
    if (!camera) {
        // Detect if we're on mobile and adjust camera settings
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isPortrait = window.innerHeight > window.innerWidth;

        camera = new Camera(videoElement, {
            onFrame: async () => {
                if (!isCameraActive) return;
                try {
                    if (trackingMode === 'hand') await hands.send({image: videoElement});
                    else await faceMesh.send({image: videoElement});
                } catch (e) {
                    console.error('Tracking error:', e);
                }
            },
            // Use higher resolution for better tracking on mobile
            width: isMobile && isPortrait ? 720 : 640,
            height: isMobile && isPortrait ? 1280 : 480,
            // Use front camera by default
            facingMode: 'user'
        });
    }

    camera.start().then(() => {
        isCameraActive = true;
        camToggleBtn.textContent = '🛑 Turn Off Camera';
        camToggleBtn.style.borderColor = 'var(--blood-red)';
        camToggleBtn.style.color = 'var(--blood-red)';

        // Show a toast message on mobile
        if (window.innerWidth < 768) {
            showToast('Camera active! Use nose/finger to control cursor');
            showMobileHelpIfNeeded();
        }
    }).catch(err => {
        console.error('Camera failed to start:', err);
        showToast('Camera access denied. Using touch controls instead.');
    });
}

// Simple toast notification function
function showToast(message) {
    const existingToast = document.querySelector('.ghost-toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = 'ghost-toast';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(139, 0, 0, 0.9);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-family: 'Share Tech Mono', monospace;
        font-size: 0.9rem;
        z-index: 10000;
        animation: fadeInOut 3s forwards;
        border: 1px solid rgba(255, 255, 255, 0.2);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        max-width: 90%;
        text-align: center;
    `;

    // Add animation keyframes if not exists
    if (!document.querySelector('#toast-styles')) {
        const style = document.createElement('style');
        style.id = 'toast-styles';
        style.textContent = `
            @keyframes fadeInOut {
                0% { opacity: 0; transform: translateX(-50%) translateY(10px); }
                10% { opacity: 1; transform: translateX(-50%) translateY(0); }
                80% { opacity: 1; transform: translateX(-50%) translateY(0); }
                100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Show mobile help on first camera activation
let hasShownMobileHelp = false;
function showMobileHelpIfNeeded() {
    if (window.innerWidth < 768 && !hasShownMobileHelp) {
        hasShownMobileHelp = true;
        setTimeout(() => {
            showToast('👃 Move your nose to control cursor');
            setTimeout(() => {
                showToast('👆 Or point with your finger');
            }, 3500);
        }, 1000);
    }
}

// On Boot: Show Ghost cursor controlled by mouse, keep camera off
showGhostCursor(); 
camToggleBtn.textContent = '🟢 Turn On Camera';
camToggleBtn.style.borderColor = 'lime';
camToggleBtn.style.color = 'lime';

// ============================================================
// BUTTON EVENT LISTENERS
// ============================================================
camToggleBtn.addEventListener('click', () => {
    if (isCameraActive) {
        // TURN OFF
        isCameraActive = false;
        isAITracking = false; // Immediately give control back to mouse
        camToggleBtn.textContent = "🟢 Turn On Camera";
        camToggleBtn.style.borderColor = "lime";
        camToggleBtn.style.color = "lime";
        videoElement.classList.remove('show-feed');
    } else {
        // TURN ON
        startCamera();
    }
});

document.getElementById('tracking-toggle-btn').addEventListener('click', (e) => {
    const btn = e.target;
    if (trackingMode === 'face') {
        trackingMode = 'hand';
        btn.textContent = '👃 Switch to NOSE Tracking';
        btn.style.color = '#00ffff';
        btn.style.borderColor = '#00ffff';
    } else {
        trackingMode = 'face';
        btn.textContent = '👆 Switch to FINGER Tracking';
        btn.style.color = '#ff00ff';
        btn.style.borderColor = '#ff00ff';
    }
});

document.getElementById('toggle-feed-btn').addEventListener('click', (e) => {
    videoElement.classList.toggle('show-feed');
    const btn = e.target;
    if (videoElement.classList.contains('show-feed')) {
        btn.textContent = '🕶️ Hide Reality';
        btn.style.color = 'var(--sick-green)';
        btn.style.borderColor = 'var(--sick-green)';
    } else {
        btn.textContent = '👁️ Reveal Reality';
        btn.style.color = 'gray';
        btn.style.borderColor = 'gray';
    }
});
