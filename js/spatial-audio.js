// js/spatial-audio.js - Spatial Audio System

let spatialAudioCtx;
let spatialPanner;
let spatialGain;

function initSpatialAudio() {
    if (!spatialAudioCtx) {
        spatialAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (spatialAudioCtx.state === 'suspended') {
        spatialAudioCtx.resume();
    }

    // Create a panner node for 3D spatial audio
    spatialPanner = spatialAudioCtx.createPanner();
    spatialPanner.panningModel = 'HRTF';
    spatialPanner.distanceModel = 'inverse';
    spatialPanner.refDistance = 1;
    spatialPanner.maxDistance = 10000;
    spatialPanner.rolloffFactor = 1;
    spatialPanner.coneInnerAngle = 360;
    spatialPanner.coneOuterAngle = 0;
    spatialPanner.coneOuterGain = 0;

    // Create a gain node for volume control
    spatialGain = spatialAudioCtx.createGain();
    spatialGain.gain.value = 0.5;

    // Connect the nodes
    spatialPanner.connect(spatialGain);
    spatialGain.connect(spatialAudioCtx.destination);
}

function playSpatialSound(frequency, duration, x, y, z = 0) {
    initSpatialAudio();

    const osc = spatialAudioCtx.createOscillator();
    const soundGain = spatialAudioCtx.createGain();

    osc.connect(soundGain);
    soundGain.connect(spatialPanner);

    osc.frequency.value = frequency;
    osc.type = 'sine';

    // Set the position of the sound in 3D space
    spatialPanner.positionX.value = x;
    spatialPanner.positionY.value = y;
    spatialPanner.positionZ.value = z;

    // Fade in and out
    soundGain.gain.setValueAtTime(0, spatialAudioCtx.currentTime);
    soundGain.gain.linearRampToValueAtTime(0.3, spatialAudioCtx.currentTime + 0.05);
    soundGain.gain.linearRampToValueAtTime(0, spatialAudioCtx.currentTime + duration);

    osc.start(spatialAudioCtx.currentTime);
    osc.stop(spatialAudioCtx.currentTime + duration);
}

function playHorrorSound(type) {
    initSpatialAudio();

    const osc = spatialAudioCtx.createOscillator();
    const gain = spatialAudioCtx.createGain();
    const filter = spatialAudioCtx.createBiquadFilter();

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(spatialAudioCtx.destination);

    switch(type) {
        case 'heartbeat':
            osc.type = 'sine';
            osc.frequency.setValueAtTime(60, spatialAudioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(0.01, spatialAudioCtx.currentTime + 0.3);
            gain.gain.setValueAtTime(0.8, spatialAudioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, spatialAudioCtx.currentTime + 0.3);
            osc.start(spatialAudioCtx.currentTime);
            osc.stop(spatialAudioCtx.currentTime + 0.3);
            break;

        case 'scream':
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(1000, spatialAudioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(100, spatialAudioCtx.currentTime + 0.5);
            filter.type = 'lowpass';
            filter.frequency.value = 2000;
            gain.gain.setValueAtTime(0.5, spatialAudioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, spatialAudioCtx.currentTime + 0.5);
            osc.start(spatialAudioCtx.currentTime);
            osc.stop(spatialAudioCtx.currentTime + 0.5);
            break;

        case 'whisper':
            // Create noise for whisper effect
            const bufferSize = spatialAudioCtx.sampleRate * 0.5;
            const buffer = spatialAudioCtx.createBuffer(1, bufferSize, spatialAudioCtx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            const noise = spatialAudioCtx.createBufferSource();
            noise.buffer = buffer;
            const noiseGain = spatialAudioCtx.createGain();
            const noiseFilter = spatialAudioCtx.createBiquadFilter();
            noiseFilter.type = 'bandpass';
            noiseFilter.frequency.value = 1000;
            noise.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(spatialAudioCtx.destination);
            noiseGain.gain.setValueAtTime(0.1, spatialAudioCtx.currentTime);
            noiseGain.gain.linearRampToValueAtTime(0, spatialAudioCtx.currentTime + 0.5);
            noise.start(spatialAudioCtx.currentTime);
            noise.stop(spatialAudioCtx.currentTime + 0.5);
            break;

        case 'chime':
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, spatialAudioCtx.currentTime);
            gain.gain.setValueAtTime(0.2, spatialAudioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, spatialAudioCtx.currentTime + 0.2);
            osc.start(spatialAudioCtx.currentTime);
            osc.stop(spatialAudioCtx.currentTime + 0.2);
            break;
    }
}

// Update audio position based on face cursor
function updateAudioPosition() {
    if (spatialPanner) {
        const normalizedX = (window.ghostX / window.innerWidth) * 2 - 1;
        spatialPanner.positionX.value = normalizedX * 5;
        spatialPanner.positionY.value = 0;
        spatialPanner.positionZ.value = -1;
    }
    requestAnimationFrame(updateAudioPosition);
}
updateAudioPosition();

// Export functions for use in other modules
window.playSpatialSound = playSpatialSound;
window.playHorrorSound = playHorrorSound;
