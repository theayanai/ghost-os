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

// Mobile Touch Drag Fallback
document.addEventListener('touchmove', (e) => {
    if (!isAITracking && e.touches.length > 0) {
        // Prevent screen scrolling while dragging the cursor
        e.preventDefault(); 
        window.ghostX = e.touches[0].clientX;
        window.ghostY = e.touches[0].clientY;
        ghostCursor.style.left = window.ghostX + 'px';
        ghostCursor.style.top = window.ghostY + 'px';
        if (ghostCursor.style.opacity === '0' || ghostCursor.style.display === 'none') showGhostCursor();
    }
}, { passive: false });

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
hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });

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
faceMesh.setOptions({ maxNumFaces: 1, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });

let lastFaceSeen = Date.now();
faceMesh.onResults((results) => {
    if (trackingMode === 'face') {
        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            isAITracking = true;
            lastFaceSeen = Date.now();
            const nose = results.multiFaceLandmarks[0][1];
            updateCursor((1 - nose.x), nose.y);
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
    
    let smoothing = 0.5; // Default smooth
    if (distance > 100) smoothing = 0.2; // Move fast = less smoothing (snappy)
    if (distance < 20) smoothing = 0.8;  // Move slow = high smoothing (stable for clicking)

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
            width: 640, height: 480
        });
    }

    camera.start().then(() => {
        isCameraActive = true;
        camToggleBtn.textContent = '🛑 Turn Off Camera';
        camToggleBtn.style.borderColor = 'var(--blood-red)';
        camToggleBtn.style.color = 'var(--blood-red)';
    }).catch(err => {
        console.error('Camera failed to start:', err);
    });
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
