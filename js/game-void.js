let audioCtx;
let monsterPan;
let voidMasterGain;
let heartbeatOsc;
let heartbeatGain;
let bgmOsc;
let bgmFilter;
let bgmLfo;
let bgmGain;
let drainOsc;
let drainGain;
let drainLfo;
let screamTimeout;
let postCollectTimeout;
let isVoidRunning = false;
let isPaused = false;
let isDraining = false;
let monsterPosX = 0;
let soulsCollected = 0;
let lastHeartbeatTime = 0;
let sanity = 100;
let escapePhase = 0;
let evadeStartTime = null;
let activeVoidMode = 'survival';
let currentStage = 0;
let currentGoal = 3;

const VOID_MODES = {
    survival: {
        label: 'SURVIVAL',
        goal: 3,
        spawnDelay: 2400,
        drainMultiplier: 1,
        stageNames: ['BASEMENT', 'HALL', 'ARCHIVE'],
        stagePrompts: ['1/3... THE HALL IS WATCHING.', '2/3... KEEP MOVING.', 'THE EXIT IS BREATHING.'],
    },
    ascent: {
        label: 'ASCENT',
        goal: 4,
        spawnDelay: 2100,
        drainMultiplier: 1.15,
        stageNames: ['LOWER CELL', 'WALKWAY', 'CHAPEL', 'GATE'],
        stagePrompts: ['THE FLOOR IS SHIFTING.', 'THE WALLS ARE CLOSER.', 'THE CHAPEL IS OPEN.', 'THE GATE CAN RUN.'],
    },
    nightmare: {
        label: 'NIGHTMARE',
        goal: 5,
        spawnDelay: 1800,
        drainMultiplier: 1.35,
        stageNames: ['LOWER CELL', 'WALKWAY', 'CHAPEL', 'ROT', 'BREACH'],
        stagePrompts: ['IT LEARNED YOUR SHAPE.', 'IT KNOWS THE ROUTE.', 'DON\'T LET IT LOCK ON.', 'THE ROOM IS COMING.', 'NOW. ESCAPE.'],
    },
};

const sanityFill = document.getElementById('sanity-fill');
const introScreen = document.getElementById('void-intro');
const gameUi = document.getElementById('void-ui');
const statusTxt = document.getElementById('void-status');
const hintTxt = document.getElementById('void-hint');
const anomalyBtn = document.getElementById('anomaly-btn');
const doorBtn = document.getElementById('door-btn');
const objText = document.getElementById('void-objective');
const eyes = document.getElementById('monster-eyes');
const vignette = document.getElementById('void-vignette');
const popupText = document.getElementById('void-popup');
const literalGhost = document.getElementById('the-literal-ghost');
const modeBadge = document.getElementById('void-mode-badge');
const stageBadge = document.getElementById('void-stage-badge');
const modeButtons = document.querySelectorAll('[data-void-mode]');

function initVoidAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    if (!voidMasterGain) {
        voidMasterGain = window.createGhostAudioBus ? window.createGhostAudioBus(audioCtx) : audioCtx.createGain();
        if (!window.createGhostAudioBus) {
            voidMasterGain.connect(audioCtx.destination);
        }
        voidMasterGain.gain.value = window.getGhostAudioVolume ? window.getGhostAudioVolume() : 0.5;
    }

    if (!monsterPan) {
        monsterPan = audioCtx.createPanner();
        monsterPan.panningModel = 'HRTF';
        monsterPan.distanceModel = 'inverse';
        monsterPan.connect(voidMasterGain);
    }
}

function playHorrorBGM() {
    initVoidAudio();
    if (bgmOsc) return;

    bgmOsc = audioCtx.createOscillator();
    bgmOsc.type = 'sawtooth';
    bgmOsc.frequency.value = 40;

    bgmFilter = audioCtx.createBiquadFilter();
    bgmFilter.type = 'lowpass';
    bgmFilter.frequency.value = 150;

    bgmLfo = audioCtx.createOscillator();
    bgmLfo.type = 'sine';
    bgmLfo.frequency.value = 0.2;

    const lfoGain = audioCtx.createGain();
    lfoGain.gain.value = 100;
    bgmLfo.connect(lfoGain);
    lfoGain.connect(bgmFilter.frequency);

    bgmGain = audioCtx.createGain();
    bgmGain.gain.value = 0;
    bgmOsc.connect(bgmFilter);
    bgmFilter.connect(bgmGain);
    bgmGain.connect(voidMasterGain);

    bgmOsc.start();
    bgmLfo.start();
    bgmGain.gain.linearRampToValueAtTime(0.65, audioCtx.currentTime + 2.4);
}

function stopHorrorBGM() {
    if (!bgmGain || !audioCtx) return;

    bgmGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.3);
    setTimeout(() => {
        if (bgmOsc) {
            bgmOsc.stop();
            bgmOsc.disconnect();
            bgmOsc = null;
        }
        if (bgmLfo) {
            bgmLfo.stop();
            bgmLfo.disconnect();
            bgmLfo = null;
        }
        bgmGain = null;
    }, 800);
}

function playDrainSound() {
    if (!drainOsc) {
        drainOsc = audioCtx.createOscillator();
        drainGain = audioCtx.createGain();
        drainLfo = audioCtx.createOscillator();

        drainOsc.type = 'sawtooth';
        drainOsc.frequency.value = 200;
        drainLfo.type = 'square';
        drainLfo.frequency.value = 15;

        const lfoGain = audioCtx.createGain();
        lfoGain.gain.value = 300;
        drainLfo.connect(lfoGain);
        lfoGain.connect(drainOsc.frequency);
        drainOsc.connect(drainGain);
        drainGain.connect(voidMasterGain);
        drainGain.gain.value = 0;
        drainOsc.start();
        drainLfo.start();
    }

    drainGain.gain.setTargetAtTime(0.85, audioCtx.currentTime, 0.1);
    drainOsc.frequency.linearRampToValueAtTime(800, audioCtx.currentTime + 0.85);
}

function stopDrainSound() {
    if (drainOsc && drainGain) {
        drainGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.1);
        drainOsc.frequency.setValueAtTime(200, audioCtx.currentTime);
    }
}

function playHeartbeat(dangerLevel) {
    const now = audioCtx.currentTime;
    const interval = Math.max(0.25, 1.35 - (dangerLevel * 1.1));

    if (now - lastHeartbeatTime > interval) {
        lastHeartbeatTime = now;
        heartbeatOsc = audioCtx.createOscillator();
        heartbeatGain = audioCtx.createGain();
        heartbeatOsc.connect(heartbeatGain);
        heartbeatGain.connect(monsterPan);
        heartbeatOsc.frequency.setValueAtTime(60, now);
        heartbeatOsc.frequency.exponentialRampToValueAtTime(10, now + 0.15);
        heartbeatGain.gain.setValueAtTime(3.2, now);
        heartbeatGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        heartbeatOsc.start(now);
        heartbeatOsc.stop(now + 0.15);
    }
}

function triggerScream() {
    isPaused = true;
    eyes.classList.add('active');
    document.body.style.backgroundColor = 'red';
    showPopup('YOUR MIND IS GONE.', 1500);
    stopDrainSound();

    const scream = audioCtx.createOscillator();
    const screamGain = audioCtx.createGain();
    scream.type = 'square';
    scream.frequency.setValueAtTime(800, audioCtx.currentTime);
    scream.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 1.0);
    scream.connect(screamGain);
    screamGain.connect(voidMasterGain);
    screamGain.gain.value = 2.4;
    scream.start();

    clearTimeout(screamTimeout);
    screamTimeout = setTimeout(() => {
        scream.stop();
        eyes.classList.remove('active');
        document.body.style.backgroundColor = 'var(--void-black)';
        stopVoid();
        stopHorrorBGM();
        document.querySelector('[data-target="view-hub"]')?.click();
    }, 1800);
}

function showPopup(text, duration) {
    popupText.textContent = text;
    popupText.classList.add('show');
    setTimeout(() => popupText.classList.remove('show'), duration);
}

function getVoidMode() {
    return VOID_MODES[activeVoidMode] || VOID_MODES.survival;
}

function updateVoidHud() {
    const mode = getVoidMode();
    if (modeBadge) {
        modeBadge.textContent = `MODE: ${mode.label}`;
    }
    if (stageBadge) {
        stageBadge.textContent = `DEPTH: ${currentStage + 1}`;
    }
    if (objText) {
        objText.textContent = `DOORS: ${soulsCollected} / ${currentGoal}`;
    }
}

function setVoidMode(modeName) {
    if (!VOID_MODES[modeName]) return;

    activeVoidMode = modeName;
    const mode = getVoidMode();

    modeButtons.forEach((button) => {
        button.classList.toggle('is-active', button.getAttribute('data-void-mode') === modeName);
    });

    currentGoal = mode.goal;
    updateVoidHud();
    updateModeDescription(modeName);
}

function updateModeDescription(modeName) {
    const modeDescEl = document.getElementById('mode-description');
    if (!modeDescEl) return;
    
    const mode = VOID_MODES[modeName];
    const descriptions = {
        survival: `<h3 style="color: #ff6666; margin-top: 0;">🟢 SURVIVAL (${mode.goal} DOORS)</h3>
                   <p style="margin: 5px 0;">Navigate through ${mode.goal} stages in order:<br>
                   <b style="color: #ffff00;">${mode.stageNames.join(' → ')}</b><br>
                   ⏱️ Standard heartbeat rhythm - you have time<br>
                   👁️ The creature watches. Stare = lose sanity faster<br>
                   🎯 Find and click the exit door when you hear the tone</p>`,
        ascent: `<h3 style="color: #ff9900; margin-top: 0;">🟠 ASCENT (${mode.goal} DOORS) - HARDER</h3>
                   <p style="margin: 5px 0;">Climb through ${mode.goal} increasingly hostile stages:<br>
                   <b style="color: #ffff00;">${mode.stageNames.join(' → ')}</b><br>
                   ⏱️ Faster heartbeat (${Math.round(mode.drainMultiplier * 100)}% speed) - pressure mounting<br>
                   👁️ The thing is adapting. It hunts faster here<br>
                   🎯 Exits are hiding. Listen carefully. Move fast.</p>`,
        nightmare: `<h3 style="color: #ff0000; margin-top: 0;">🔴 NIGHTMARE (${mode.goal} DOORS) - INSANE</h3>
                   <p style="margin: 5px 0;">Plunge through ${mode.goal} nightmare layers:<br>
                   <b style="color: #ffff00;">${mode.stageNames.join(' → ')}</b><br>
                   ⏱️ Relentless heartbeat (${Math.round(mode.drainMultiplier * 100)}% speed) - it's coming<br>
                   👁️ It knows your shape. It's LEARNING. It's HUNTING.<br>
                   🎯 No mercy. No room for error. Only escape matters.</p>`
    };
    
    modeDescEl.innerHTML = descriptions[modeName] || descriptions.survival;
}

function spawnAnomaly() {
    const mode = getVoidMode();
    monsterPosX = Math.random() > 0.5 ? 1 : -1;
    monsterPan.positionX.value = monsterPosX * 5;

    const stagePressure = currentStage * 0.08;
    const isMobile = window.innerWidth < 768;

    // Adjust button size based on screen size
    const widthScale = isMobile ? 0.8 : Math.max(0.6, 1 - stagePressure);
    const heightScale = isMobile ? 0.85 : Math.max(0.65, 1 - stagePressure * 0.7);

    const baseWidth = isMobile ? 70 : 80;
    const baseHeight = isMobile ? 100 : 120;

    anomalyBtn.style.width = `${Math.max(baseWidth * widthScale, 50)}px`;
    anomalyBtn.style.height = `${Math.max(baseHeight * heightScale, 70)}px`;

    let safeX;
    let safeY = (Math.random() * 70 + 15);

    // On mobile, keep buttons away from edges for better touch access
    if (isMobile) {
        safeY = (Math.random() * 60 + 20);
        if (safeY > 35 && safeY < 65) safeY = Math.random() > 0.5 ? 25 : 75;
    } else {
        if (safeY > 40 && safeY < 60) safeY = Math.random() > 0.5 ? 20 : 80;
    }

    if (monsterPosX === 1) {
        safeX = isMobile ? `${Math.random() * 15 + 5}%` : `${Math.random() * 20 + 5}%`;
        vignette.style.background = 'radial-gradient(circle at 90% 50%, transparent 20%, rgba(139,0,0,0.55) 50%, #000 95%)';
    } else {
        safeX = isMobile ? `${Math.random() * 15 + 80}%` : `${Math.random() * 20 + 75}%`;
        vignette.style.background = 'radial-gradient(circle at 10% 50%, transparent 20%, rgba(139,0,0,0.55) 50%, #000 95%)';
    }

    anomalyBtn.style.left = safeX;
    anomalyBtn.style.top = `${safeY}%`;
    anomalyBtn.style.display = 'block';
    anomalyBtn.classList.remove('stared-at');
    anomalyBtn.style.opacity = String(Math.max(0.04, 0.02 + (stagePressure * 0.08)));
    anomalyBtn.style.backgroundColor = 'transparent';
    anomalyBtn.style.boxShadow = 'none';

    hintTxt.innerHTML = `HINT: <span style="color:#00ffff; font-weight:bold;">${mode.stageNames[Math.min(currentStage, mode.stageNames.length - 1)]}</span>`;
}

function queueNextSpawn(message) {
    isPaused = true;
    showPopup(message, 1800);
    clearTimeout(postCollectTimeout);
    postCollectTimeout = setTimeout(() => {
        isPaused = false;
        spawnAnomaly();
    }, getVoidMode().spawnDelay);
}

function openFinalEscape() {
    isPaused = true;
    showPopup('THE FINAL EXIT IS OPEN.', 1800);

    setTimeout(() => {
        isPaused = false;
        objText.textContent = 'OBJECTIVE: ESCAPE';
        statusTxt.textContent = 'THE GATE IS OPEN.';
        statusTxt.style.color = '#fff';
        hintTxt.innerHTML = 'CATCH IT.';
        vignette.style.background = 'radial-gradient(circle at center, transparent 20%, #000 95%)';
        escapePhase = 1;
        evadeStartTime = null;
        doorBtn.style.left = monsterPosX === 1 ? '20%' : '80%';
        doorBtn.style.top = '70%';
        doorBtn.style.display = 'block';
    }, 900);
}

function voidLoop() {
    if (!isVoidRunning) return;

    if (!isPaused) {
        const mode = getVoidMode();
        const userX = (window.ghostX / window.innerWidth) * 2 - 1;
        const distanceToMonster = Math.abs(userX - monsterPosX);
        const dangerLevel = Math.max(0, 1 - (distanceToMonster / 1.45));

        playHeartbeat(dangerLevel);

        if (dangerLevel > 0.58) {
            sanity -= (dangerLevel * 1.25 * mode.drainMultiplier);
            statusTxt.textContent = 'HE DRAINS YOUR MIND.';
            statusTxt.style.color = '#f00';
            sanityFill.style.background = 'white';
            setTimeout(() => { sanityFill.style.background = 'red'; }, 90);
            literalGhost.classList.add('manifest');

            if (!isDraining) {
                isDraining = true;
                playDrainSound();
            }

            if (sanity <= 0) {
                sanity = 0;
                triggerScream();
            }
        } else {
            sanity = Math.min(100, sanity + 0.12);
            statusTxt.textContent = mode.label === 'NIGHTMARE' ? 'KEEP THE PULSE STEADY.' : 'STAY IN THE SHADOWS.';
            statusTxt.style.color = '#500';
            literalGhost.classList.remove('manifest');

            if (isDraining) {
                isDraining = false;
                stopDrainSound();
            }
        }

        sanityFill.style.width = `${Math.max(0, sanity)}%`;
        sanityFill.style.boxShadow = sanity < 30 ? '0 0 20px white' : '0 0 10px red';

        if (anomalyBtn.style.display !== 'none') {
            const rect = anomalyBtn.getBoundingClientRect();
            const targetX = rect.left + (rect.width / 2);
            const targetY = rect.top + (rect.height / 2);
            const dist = Math.sqrt(Math.pow(window.ghostX - targetX, 2) + Math.pow(window.ghostY - targetY, 2));

            // Adjust distance thresholds for mobile
            const isMobile = window.innerWidth < 768;
            const scale = isMobile ? 0.6 : 1;

            let pText;
            let pColor;
            if (dist > 500 * scale) {
                pText = 'VERY FAR';
                pColor = '#00ffff';
            } else if (dist > 250 * scale) {
                pText = 'FAR';
                pColor = '#0088ff';
            } else if (dist > 120 * scale) {
                pText = 'CLOSING IN';
                pColor = '#ffff00';
            } else if (dist > 60 * scale) {
                pText = 'NEAR';
                pColor = '#ff8800';
            } else {
                pText = 'RIGHT HERE - HOLD STILL!';
                pColor = '#ff0000';
            }

            hintTxt.innerHTML = `HINT: <span style="color:${pColor}; font-weight:bold;">${pText}</span>`;
        } else {
            hintTxt.innerHTML = 'DOOR OPENED.';
        }

        if (escapePhase === 1 && doorBtn.style.display !== 'none') {
            const rect = doorBtn.getBoundingClientRect();
            const btnX = rect.left + (rect.width / 2);
            const btnY = rect.top + (rect.height / 2);
            const distToBtn = Math.sqrt(Math.pow(window.ghostX - btnX, 2) + Math.pow(window.ghostY - btnY, 2));

            // Adjust distance threshold for mobile
            const isMobile = window.innerWidth < 768;
            const threshold = isMobile ? 150 : 200;

            if (distToBtn < threshold) {
                if (!evadeStartTime) evadeStartTime = audioCtx.currentTime;

                if (audioCtx.currentTime - evadeStartTime < 2.0) {
                    // Adjust candidate positions for mobile
                    const candidates = isMobile ? [
                        { x: 15, y: 25 },
                        { x: 15, y: 75 },
                        { x: 85, y: 25 },
                        { x: 85, y: 75 },
                    ] : [
                        { x: 10, y: 20 },
                        { x: 10, y: 80 },
                        { x: 90, y: 20 },
                        { x: 90, y: 80 },
                    ];

                    let bestCandidate = candidates[0];
                    let bestScore = -1;

                    for (const candidate of candidates) {
                        const candidateX = (candidate.x / 100) * window.innerWidth;
                        const candidateY = (candidate.y / 100) * window.innerHeight;
                        const distanceToCursor = Math.sqrt(Math.pow(window.ghostX - candidateX, 2) + Math.pow(window.ghostY - candidateY, 2));
                        const distanceToMonster = Math.abs((candidate.x / 50) - monsterPosX);
                        const score = distanceToCursor + (distanceToMonster * 200);

                        if (score > bestScore) {
                            bestScore = score;
                            bestCandidate = candidate;
                        }
                    }

                    doorBtn.style.left = `${bestCandidate.x}%`;
                    doorBtn.style.top = `${bestCandidate.y}%`;
                } else {
                    escapePhase = 2;
                    hintTxt.innerHTML = "NOW. <span style='color:red;'>QUICKLY!</span>";
                }
            }
        }
    }

    requestAnimationFrame(voidLoop);
}

function startVoid() {
    const mode = getVoidMode();
    initVoidAudio();
    isVoidRunning = true;
    isPaused = false;
    soulsCollected = 0;
    sanity = 100;
    isDraining = false;
    escapePhase = 0;
    evadeStartTime = null;
    currentStage = 0;
    currentGoal = mode.goal;

    clearTimeout(postCollectTimeout);
    sanityFill.style.width = '100%';
    doorBtn.style.display = 'none';
    literalGhost.classList.remove('manifest');
    statusTxt.textContent = mode.label === 'NIGHTMARE' ? 'SURVIVE THE RUSH.' : 'SURVIVE.';
    statusTxt.style.color = '#fff';
    hintTxt.innerHTML = 'PROXIMITY: <span style="color:#fff;">SEARCHING...</span>';
    updateVoidHud();
    spawnAnomaly();
    voidLoop();
}

function stopVoid() {
    isVoidRunning = false;
    isPaused = false;
    stopDrainSound();
    document.body.style.backgroundColor = 'var(--void-black)';
}

function bindVoidControls() {
    // Initialize mode description on load
    updateModeDescription('survival');
    
    document.querySelectorAll('[data-void-mode]').forEach((button) => {
        button.addEventListener('click', () => {
            setVoidMode(button.getAttribute('data-void-mode'));
        });
    });

    document.addEventListener('click', (event) => {
        const button = event.target.closest('[data-target]');
        if (!button) return;

        const target = button.getAttribute('data-target');
        if (target === 'view-void') {
            introScreen.style.display = 'block';
            gameUi.style.display = 'none';
            playHorrorBGM();
        } else if (target === 'view-hub') {
            if (isVoidRunning) stopVoid();
            stopHorrorBGM();
        }
    });

    document.getElementById('start-void-btn')?.addEventListener('click', () => {
        introScreen.style.display = 'none';
        gameUi.style.display = 'block';
        startVoid();
    });

    anomalyBtn?.addEventListener('click', () => {
        if (!isVoidRunning || isPaused) return;

        anomalyBtn.style.display = 'none';
        soulsCollected += 1;
        sanity = Math.min(100, sanity + 28);
        currentStage = Math.min(soulsCollected, getVoidMode().stageNames.length - 1);
        updateVoidHud();

        const chime = audioCtx.createOscillator();
        const chimeGain = audioCtx.createGain();
        chime.frequency.value = 400;
        chime.type = 'triangle';
        chime.connect(chimeGain);
        chimeGain.connect(voidMasterGain);
        chimeGain.gain.value = 1.6;
        chime.start();
        setTimeout(() => chime.stop(), 350);

        const mode = getVoidMode();
        const stageMessage = mode.stagePrompts[Math.min(soulsCollected - 1, mode.stagePrompts.length - 1)];

        if (soulsCollected >= currentGoal) {
            openFinalEscape();
        } else {
            queueNextSpawn(stageMessage);
        }
    });

    doorBtn?.addEventListener('click', () => {
        if (!isVoidRunning || escapePhase === 1) return;
        isPaused = true;
        showPopup('YOU ESCAPED THE VOID.', 1500);
        setTimeout(() => {
            stopVoid();
            stopHorrorBGM();
            document.querySelector('[data-target="view-hub"]')?.click();
        }, 1700);
    });

    setVoidMode('survival');
}

window.setVoidMode = setVoidMode;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindVoidControls, { once: true });
} else {
    bindVoidControls();
}
