(function () {
    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    let storedVolume = null;

    try {
        storedVolume = window.localStorage?.getItem('ghost-os-volume');
    } catch (error) {
        storedVolume = null;
    }

    const parsedVolume = storedVolume === null ? NaN : Number(storedVolume);
    const hasMigratedVolume = (() => {
        try {
            return window.localStorage?.getItem('ghost-os-volume-migrated') === 'true';
        } catch (error) {
            return false;
        }
    })();

    const initialVolume = (!hasMigratedVolume && parsedVolume === 0)
        ? 0.5
        : (Number.isFinite(parsedVolume) ? clamp(parsedVolume, 0, 1) : 0.5);

    const state = window.ghostAudioState || {
        volume: initialVolume,
        buses: new Set(),
    };

    window.ghostAudioState = state;

    function syncGainNode(node) {
        if (!node || !node.gain) return;
        try {
            if (typeof node.gain.setTargetAtTime === 'function' && node.context) {
                node.gain.setTargetAtTime(state.volume, node.context.currentTime, 0.03);
            } else {
                node.gain.value = state.volume;
            }
        } catch (error) {
            node.gain.value = state.volume;
        }
    }

    window.registerGhostAudioBus = function registerGhostAudioBus(gainNode) {
        if (!gainNode) return gainNode;
        state.buses.add(gainNode);
        syncGainNode(gainNode);
        return gainNode;
    };

    window.createGhostAudioBus = function createGhostAudioBus(context) {
        const bus = context.createGain();
        bus.connect(context.destination);
        return window.registerGhostAudioBus(bus);
    };

    window.setGhostAudioVolume = function setGhostAudioVolume(nextVolume) {
        const volume = clamp(Number(nextVolume), 0, 1);
        state.volume = volume;
        try {
            window.localStorage?.setItem('ghost-os-volume', String(volume));
            window.localStorage?.setItem('ghost-os-volume-migrated', 'true');
        } catch (error) {
            // Ignore storage issues.
        }
        state.buses.forEach(syncGainNode);
        document.dispatchEvent(new CustomEvent('ghost-audio-volume-change', { detail: { volume } }));
        return volume;
    };

    window.getGhostAudioVolume = function getGhostAudioVolume() {
        return state.volume;
    };

    window.bindGhostVolumeControl = function bindGhostVolumeControl(input, readout) {
        if (!input) return;

        const syncUi = (volume) => {
            const percentage = Math.round(volume * 100);
            input.value = String(percentage);
            if (readout) {
                readout.textContent = `${percentage}%`;
            }
        };

        syncUi(state.volume);

        const handleChange = () => {
            const volume = window.setGhostAudioVolume(Number(input.value) / 100);
            syncUi(volume);
        };

        input.addEventListener('input', handleChange);
        input.addEventListener('change', handleChange);

        document.addEventListener('ghost-audio-volume-change', (event) => {
            if (event?.detail?.volume === undefined) return;
            syncUi(event.detail.volume);
        });
    };

    window.applyGhostSpeechVolume = function applyGhostSpeechVolume(utterance) {
        if (utterance) {
            utterance.volume = state.volume;
        }
        return utterance;
    };

    window.setGhostAudioVolume(state.volume);
})();
