// js/terminal.js

const terminalOutput = document.getElementById('terminal-output');
const micBtn = document.getElementById('mic-btn');
const terminalVolumeSlider = document.getElementById('terminal-volume-slider');
const hubVolumeSlider = document.getElementById('audio-volume-slider');
const audioVolumeLabel = document.getElementById('audio-volume-label');

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;

const startupMessages = [
    "> Neural link established.",
    "> Audio bus online.",
    "> Voice channel ready.",
    "> Waiting for the next command...",
];

const commandReplies = {
    help: [
        'Commands: status, help, clear, open studio, open void, open hub, volume 0-100, mute, unmute.',
        'Try a direct command or just speak naturally. The terminal will adapt.',
    ],
    status: [
        'System status: stable. Camera, audio, and voice routes are live.',
        'Diagnostics are green. The interface is responsive and listening.',
    ],
    identity: [
        'I am Ghost OS. I answer, remix, and route your intent.',
        'Ghost OS is the system core. Speak plainly and I will follow.',
    ],
    creative: [
        'That idea has teeth. I can shape it into a scene, a sound, or a route.',
        'Interesting. The system can turn that into a mode, a cue, or a glitch-free flow.',
    ],
    default: [
        'Processing your request with the current signal.',
        'Understood. I am reshaping the response for the interface.',
        'Noted. The system is still listening.',
    ],
    error: [
        'The line cracked. I am falling back to local reasoning.',
        'The remote response was thin, so I filled the gap locally.',
    ],
};

const tonePhrases = [
    'I can route that.',
    'Here is the clean version.',
    'The signal is clearer now.',
    'That is now registered.',
];

function randomFrom(list) {
    return list[Math.floor(Math.random() * list.length)];
}

function printToTerminal(text, color = 'var(--sick-green)') {
    const line = document.createElement('div');
    line.style.color = color;
    line.textContent = text;
    terminalOutput.appendChild(line);
    terminalOutput.scrollTop = terminalOutput.scrollHeight;
}

function initializeTerminal() {
    startupMessages.forEach((message, index) => {
        setTimeout(() => printToTerminal(message, index === 0 ? 'var(--bone-white)' : 'var(--sick-green)'), index * 150);
    });

    if (window.bindGhostVolumeControl) {
        window.bindGhostVolumeControl(terminalVolumeSlider, audioVolumeLabel);
        window.bindGhostVolumeControl(hubVolumeSlider, audioVolumeLabel);
    }
}

function resetMicButton() {
    micBtn.classList.remove('listening');
    micBtn.textContent = '🎙️ STARE TO SPEAK';
}

function applyQuickCommand(commandText) {
    const normalized = commandText.trim().toLowerCase();

    if (!normalized) return false;

    if (normalized === 'help') {
        commandReplies.help.forEach((message) => printToTerminal(`> ${message}`, 'var(--bone-white)'));
        return true;
    }

    if (normalized === 'status') {
        commandReplies.status.forEach((message) => printToTerminal(`> ${message}`, 'var(--bone-white)'));
        return true;
    }

    if (normalized === 'clear') {
        terminalOutput.innerHTML = '';
        printToTerminal('> Terminal cleared.', 'var(--bone-white)');
        return true;
    }

    if (normalized === 'mute') {
        if (window.setGhostAudioVolume) window.setGhostAudioVolume(0);
        printToTerminal('> Volume muted.', 'var(--bone-white)');
        return true;
    }

    if (normalized === 'unmute') {
        if (window.setGhostAudioVolume) window.setGhostAudioVolume(0.5);
        printToTerminal('> Volume restored to 50%.', 'var(--bone-white)');
        return true;
    }

    const volumeMatch = normalized.match(/^volume\s+(\d{1,3})$/);
    if (volumeMatch) {
        const nextVolume = Math.min(100, Math.max(0, Number(volumeMatch[1])));
        if (window.setGhostAudioVolume) window.setGhostAudioVolume(nextVolume / 100);
        printToTerminal(`> Volume set to ${nextVolume}%.`, 'var(--bone-white)');
        return true;
    }

    if (normalized.includes('open studio')) {
        document.querySelector('[data-target="view-studio"]')?.click();
        return true;
    }

    if (normalized.includes('open void')) {
        document.querySelector('[data-target="view-void"]')?.click();
        return true;
    }

    if (normalized.includes('open hub') || normalized === 'home' || normalized === 'back') {
        document.querySelector('[data-target="view-hub"]')?.click();
        return true;
    }

    return false;
}

function detectIntent(text) {
    const normalized = text.toLowerCase();

    if (/help|commands|what can you do/.test(normalized)) return 'help';
    if (/status|health|diagnostic|state/.test(normalized)) return 'status';
    if (/who are you|your name|what are you/.test(normalized)) return 'identity';
    if (/story|poem|joke|mode|game|mix|sound|music/.test(normalized)) return 'creative';
    return 'default';
}

function buildLocalReply(userText, backendReply) {
    const intent = detectIntent(userText);
    const replyBank = commandReplies[intent] || commandReplies.default;
    const localReply = randomFrom(replyBank);
    const backendText = (backendReply || '').trim();

    if (!backendText) {
        return `${localReply} ${randomFrom(tonePhrases)}`;
    }

    if (/the void remains silent|same|error|unknown/i.test(backendText)) {
        return `${localReply} ${randomFrom(commandReplies.error)}`;
    }

    if (intent === 'default') {
        return `${backendText} ${randomFrom(tonePhrases)}`;
    }

    return `${backendText} ${localReply}`;
}

async function simulateHumanResponse(userText) {
    printToTerminal('> Transmitting to the void...', 'var(--bone-white)');

    try {
        const response = await fetch('https://ayanr9.pythonanywhere.com/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: userText,
                system_instruction: 'You are Ghost OS. Give short, useful, varied answers. Be polished, calm, and slightly eerie without repeating the same line.',
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const aiReply = buildLocalReply(userText, data.response || data.message || '');

        printToTerminal(`> GHOST OS: "${aiReply}"`, 'var(--toxic-purple)');
        readAloud(aiReply);
    } catch (error) {
        console.error(error);
        const fallbackReply = buildLocalReply(userText, '');
        printToTerminal('> [REMOTE LINK DOWN] Falling back to local mode.', 'var(--blood-red)');
        printToTerminal(`> GHOST OS: "${fallbackReply}"`, 'var(--toxic-purple)');
        readAloud(fallbackReply);
    }
}

function processTerminalInput(userText, source = 'voice') {
    const trimmed = userText.trim();
    if (!trimmed) return;

    printToTerminal(`> ${source === 'voice' ? 'You' : 'Command'}: "${trimmed}"`, 'var(--bone-white)');

    if (applyQuickCommand(trimmed)) {
        return;
    }

    simulateHumanResponse(trimmed);
}

function readAloud(text) {
    if (!window.speechSynthesis) {
        console.error('Speech synthesis not supported');
        return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find((voice) =>
        voice.name.includes('Google US English') ||
        voice.name.includes('Natural') ||
        voice.name.includes('Premium') ||
        voice.name.includes('Samantha') ||
        voice.name.includes('Daniel')
    );

    if (naturalVoice) {
        utterance.voice = naturalVoice;
    }

    utterance.pitch = 0.9;
    utterance.rate = 0.92;
    window.applyGhostSpeechVolume?.(utterance);

    window.speechSynthesis.speak(utterance);
}

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = function () {
        micBtn.classList.add('listening');
        micBtn.textContent = '🛑 LISTENING...';
        printToTerminal('> [Mic Active] I am listening...', 'var(--sick-green)');
    };

    recognition.onresult = function (event) {
        const transcript = event.results[0][0].transcript;
        processTerminalInput(transcript, 'voice');
    };

    recognition.onerror = function (event) {
        if (event.error === 'network') {
            printToTerminal('> [Network Issue] The link is unstable. Try again.', 'var(--blood-red)');
        } else {
            printToTerminal(`> [Error]: ${event.error}`, 'var(--blood-red)');
        }
        resetMicButton();
    };

    recognition.onend = function () {
        resetMicButton();
    };
} else {
    printToTerminal('> [Error]: Voice input is not available in this browser.', 'var(--blood-red)');
}

document.querySelectorAll('[data-terminal-command]').forEach((button) => {
    button.addEventListener('click', () => {
        processTerminalInput(button.getAttribute('data-terminal-command'), 'command');
    });
});

micBtn.addEventListener('click', () => {
    if (recognition && !micBtn.classList.contains('listening')) {
        try {
            recognition.start();
        } catch (error) {
            // Ignore accidental double-starts.
        }
    }
});

initializeTerminal();

window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
