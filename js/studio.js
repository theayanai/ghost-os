let studioCtx;
let masterGain;
let masterFilter;
let seqInterval;
let step = 0;
let studioScene = 'pulse';

const activeTracks = { bass: false, lead: false, pad: false, drums: false, arp: false, sub: false };
const hudPitch = document.getElementById('hud-pitch');
const hudFilter = document.getElementById('hud-filter');
const sceneButtons = document.querySelectorAll('[data-studio-scene]');

const studioScenes = {
    pulse: {
        label: 'PULSE',
        interval: 150,
        bass: [40, 40, 0, 50, 40, 0, 30, 40, 40, 0, 60, 40, 0, 30, 40, 50],
        lead: [300, 400, 500, 600, 300, 400, 800, 600, 300, 400, 500, 600, 800, 600, 500, 400],
        padSteps: [0, 8],
        arp: [800, 1200, 1000, 1500, 800, 1200, 1000, 1500, 900, 1300, 1100, 1600, 900, 1300, 1100, 1600],
        drums: true,
        kickEvery: 4,
        hatEvery: 2,
        sub: [20, 0, 0, 0, 25, 0, 0, 0, 20, 0, 0, 0, 15, 0, 0, 0],
    },
    drift: {
        label: 'DRIFT',
        interval: 180,
        bass: [32, 0, 36, 0, 30, 0, 38, 0, 32, 0, 36, 0, 28, 0, 34, 0],
        lead: [220, 260, 330, 390, 260, 220, 330, 440, 260, 310, 370, 420, 330, 290, 370, 480],
        padSteps: [0, 4, 8, 12],
        arp: [620, 780, 660, 880, 740, 920, 720, 900, 640, 800, 700, 940, 760, 980, 720, 880],
        drums: true,
        kickEvery: 6,
        hatEvery: 3,
        sub: [16, 0, 18, 0, 20, 0, 18, 0, 16, 0, 18, 0, 20, 0, 18, 0],
    },
    storm: {
        label: 'STORM',
        interval: 120,
        bass: [48, 48, 42, 48, 55, 48, 42, 55, 48, 48, 42, 48, 60, 55, 48, 42],
        lead: [420, 520, 640, 780, 420, 520, 900, 780, 420, 520, 640, 780, 900, 780, 640, 520],
        padSteps: [0, 2, 8, 10],
        arp: [980, 1240, 1100, 1460, 1020, 1280, 1160, 1520, 1040, 1320, 1180, 1580, 1080, 1360, 1220, 1620],
        drums: true,
        kickEvery: 2,
        hatEvery: 1,
        sub: [24, 20, 0, 20, 26, 22, 0, 22, 24, 20, 0, 20, 28, 24, 0, 24],
    },
};

function initStudioAudio() {
    if (!studioCtx) {
        studioCtx = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = window.createGhostAudioBus ? window.createGhostAudioBus(studioCtx) : studioCtx.createGain();
        if (!window.createGhostAudioBus) {
            masterGain.connect(studioCtx.destination);
        }
        masterGain.gain.value = window.getGhostAudioVolume ? window.getGhostAudioVolume() : 0.5;

        masterFilter = studioCtx.createBiquadFilter();
        masterFilter.type = 'lowpass';
        masterFilter.frequency.value = 2000;
        masterFilter.Q.value = 5;
        masterFilter.connect(masterGain);

        scheduleSequencer();
    }

    if (studioCtx.state === 'suspended') {
        studioCtx.resume();
    }
}

function scheduleSequencer() {
    if (seqInterval) {
        clearInterval(seqInterval);
    }

    const scene = studioScenes[studioScene];
    seqInterval = setInterval(() => tickSequencer(scene), scene.interval);
}

function tickSequencer(scene) {
    if (!studioCtx || !masterFilter) return;

    const now = studioCtx.currentTime;
    const currentX = window.ghostX === -1000 ? window.innerWidth / 2 : window.ghostX;
    const normX = currentX / window.innerWidth;
    const pitchMult = 0.85 + (normX * 1.8);

    if (activeTracks.drums && scene.drums) {
        if (step % scene.kickEvery === 0) playDrum(now, 150, 2.6);
        if (step % scene.hatEvery !== 0) playHat(now);
    }

    if (activeTracks.bass) {
        const note = scene.bass[step];
        if (note > 0) playSynth(now, note * pitchMult, 'sawtooth', 1.1, 0.16);
    }

    if (activeTracks.sub) {
        const note = scene.sub[step];
        if (note > 0) playSynth(now, note * pitchMult, 'sine', 2.4, 0.45);
    }

    if (activeTracks.lead) {
        const note = scene.lead[step];
        playSynth(now, note * pitchMult, 'square', 0.35, 0.12);
        if (hudPitch && step % 4 === 0) hudPitch.textContent = Math.round(note * pitchMult);
    }

    if (activeTracks.arp) {
        const note = scene.arp[step];
        playSynth(now, note * pitchMult, 'sawtooth', 0.18, 0.06);
    }

    if (activeTracks.pad && scene.padSteps.includes(step)) {
        playSynth(now, 150 * pitchMult, 'sine', 0.55, 0.95);
        playSynth(now, 200 * pitchMult, 'sine', 0.45, 0.95);
        playSynth(now, 250 * pitchMult, 'sine', 0.4, 0.95);
    }

    step = (step + 1) % 16;
}

function playDrum(time, freq, vol) {
    const osc = studioCtx.createOscillator();
    const gain = studioCtx.createGain();
    osc.connect(gain);
    gain.connect(masterFilter);
    osc.frequency.setValueAtTime(freq, time);
    osc.frequency.exponentialRampToValueAtTime(10, time + 0.3);
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
    osc.start(time);
    osc.stop(time + 0.3);
}

function playHat(time) {
    const osc = studioCtx.createOscillator();
    const gain = studioCtx.createGain();
    osc.type = 'square';
    osc.connect(gain);
    gain.connect(masterFilter);
    osc.frequency.setValueAtTime(4000, time);
    gain.gain.setValueAtTime(0.18, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
    osc.start(time);
    osc.stop(time + 0.05);
}

function playSynth(time, freq, type, vol, dur) {
    const osc = studioCtx.createOscillator();
    const gain = studioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    osc.connect(gain);
    gain.connect(masterFilter);
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + dur);
    osc.start(time);
    osc.stop(time + dur);
}

function setStudioScene(nextScene) {
    if (!studioScenes[nextScene]) return;
    studioScene = nextScene;
    step = 0;
    scheduleSequencer();

    sceneButtons.forEach((button) => {
        button.classList.toggle('is-active', button.getAttribute('data-studio-scene') === nextScene);
    });
}

function mapFaceToFilter() {
    if (document.getElementById('view-studio').classList.contains('active-screen') && masterFilter && studioCtx) {
        const currentY = window.ghostY === -1000 ? window.innerHeight / 2 : window.ghostY;
        const normY = currentY / window.innerHeight;
        const finalFilter = 240 + ((1 - normY) * 5600);
        masterFilter.frequency.setTargetAtTime(finalFilter, studioCtx.currentTime, 0.08);
        if (hudFilter) hudFilter.textContent = Math.round(finalFilter);
    }
    requestAnimationFrame(mapFaceToFilter);
}
mapFaceToFilter();

function stopAllStudioMusic() {
    if (seqInterval) {
        clearInterval(seqInterval);
        seqInterval = null;
    }

    if (masterGain && studioCtx) {
        masterGain.gain.setTargetAtTime(window.getGhostAudioVolume ? window.getGhostAudioVolume() : 0.5, studioCtx.currentTime, 0.12);
    }

    ['bass', 'lead', 'pad', 'drums', 'arp', 'sub'].forEach((instrument) => {
        activeTracks[instrument] = false;
        const node = document.getElementById(`node-${instrument}`);
        if (node) {
            node.style.background = 'transparent';
            node.style.color = node.style.borderColor;
        }
    });
}

const studioBackBtn = document.querySelector('#view-studio .back-btn');
if (studioBackBtn) {
    studioBackBtn.addEventListener('click', stopAllStudioMusic);
}

sceneButtons.forEach((button) => {
    button.addEventListener('click', () => {
        initStudioAudio();
        setStudioScene(button.getAttribute('data-studio-scene'));
    });
});

['bass', 'lead', 'pad', 'drums', 'arp', 'sub'].forEach((instrument) => {
    const node = document.getElementById(`node-${instrument}`);
    if (!node) return;

    node.addEventListener('click', () => {
        initStudioAudio();
        activeTracks[instrument] = !activeTracks[instrument];
        node.style.background = activeTracks[instrument] ? node.style.borderColor : 'transparent';
        node.style.color = activeTracks[instrument] ? '#000' : node.style.borderColor;

        if (!seqInterval) {
            scheduleSequencer();
        }
    });
});
