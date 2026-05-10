# 👻 GHOST_OS | Neural Interface V4.0

![JavaScript](https://img.shields.io/badge/javascript-323330?style=for-the-badge&logo=javascript&logoColor=F7DF1E)
![HTML5](https://img.shields.io/badge/html5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/css3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![Computer Vision](https://img.shields.io/badge/Computer%20Vision-Enabled-blue?style=for-the-badge)
![Spatial Audio](https://img.shields.io/badge/Spatial%20Audio-Immersive-blue?style=for-the-badge)
![Gesture Tracking](https://img.shields.io/badge/Gesture%20Tracking-Real--Time-blue?style=for-the-badge)

**Computer Vision · Spatial Audio · Gesture Recognition · Interactive Horror**

A browser-based, hands-free operating system controlled entirely by your face and fingers. Featuring a telekinetic music studio, voice-activated AI, and a terrifying spatial-audio survival game that watches you back.

---

## 🌐 Live Demo  
👉 **[Enter the Neural Link: GHOST_OS](https://theayanai.github.io/ghost-os/)** *(Note: Webcam and Headphones are strictly required for the full experience).*

---

## 📸 Application Preview  
<img width="1915" height="885" alt="image" src="https://github.com/user-attachments/assets/a308f9c2-1887-4669-b070-06f6faa939de" />


### 🎛️ The Nexus Hub  
- Glitch-art aesthetic  
- Live neural tracking status  
- Ghost mirror background capturing user reality  

### 🎵 Telekinetic Studio  
- 6-track live sequencer (Bass, Lead, Pad, Drums, Arp, Sub)  
- Real-time X/Y axis HUD  
- Face-controlled audio manipulation (Pitch & Filter)  

### 👁️ The Void (Survival Horror)  
- Dynamic sanity bar  
- Invisible proximity-based doors  
- Spatial audio heartbeat and dynamic jump-scare manifestations  

---

## 🕹️ How to Operate (Neural Controls)

Because GHOST_OS is a hands-free experience, standard mouse clicks are disabled once the camera boots. Here is how to survive:

* **To Click:** Move your cursor over a button and **stare/hold still for 2 seconds**. A red ring will fill up to confirm your selection.
* **Tracking Modes:** * **Nose Tracking (Default):** Move your head to steer the cursor.
  * **Finger Tracking:** Click "Switch to FINGER Tracking". Hold up an open hand, then **curl your middle, ring, and pinky fingers down** to make a pointing gesture. The AI will instantly lock onto your index fingertip.
* **The Studio:** Look **Left/Right** to change the pitch (notes). Look **Up/Down** to change the filter (muffled to sharp). Stare at an instrument to toggle the beat.
* **The Void:** Use your cursor as a radar. Look away from the invisible monster to save your sanity. Listen to the heartbeat to gauge distance. Find the invisible doors using the Hot/Cold proximity text.

---

## ✨ Key Features  

### 🧠 Computer Vision Engine (MediaPipe)
- Adaptive smoothing for jitter-free tracking  
- Real-time gesture recognition (Index Finger isolation)  
- Seamless toggling between Hand and Face Mesh AI  

### 🎶 The Studio (Web Audio API)
- Procedural 16-step techno sequencer  
- 6 independent instruments  
- Real-time frequency and pitch bending via facial coordinates  

### 🩸 The Void (Horror Game Engine)
- **Sanity Mechanics:** Looking at the entity drains your life bar and triggers audio hallucinations.  
- **Proximity Radar:** Hot/Cold text feedback to find invisible exits.  
- **Dynamic Spatial Audio:** 3D heartbeat scaling from 1.5s to 0.15s based on danger.  
- **Cinematic Escapes:** The final button actively dodges your cursor in a panic sequence.  

### 🖥️ Premium Glitch UI
- Pure CSS glitch animations and scanlines  
- "Reveal Reality" haunted webcam overlay  
- Responsive `vh/vw` scaling for all device sizes  

---

## 🧠 Architecture & Tech Stack  

1. **Vision:** Google MediaPipe (`hands.js`, `face_mesh.js`)  
2. **Audio:** Native JavaScript Web Audio API (`AudioContext`, `BiquadFilter`, `Oscillator`)  
3. **Styling:** Vanilla CSS3 (Keyframes, SVG Masking, Drop-Shadows, CSS Variables)  
4. **Logic:** Modular Vanilla JS (`face-tracker.js`, `ghost-click.js`, `game-void.js`)  

---

## 📂 Repository Structure  

```text
📦 ghost-os
 ┣ 📂 css/
 ┃ ┗ 📜 ghost.css            # Glitch UI, animations, responsive layout
 ┣ 📂 js/
 ┃ ┣ 📜 app-router.js        # Screen transitions
 ┃ ┣ 📜 audio-control.js     # Master volume bus
 ┃ ┣ 📜 face-tracker.js      # MediaPipe AI & Gesture logic
 ┃ ┣ 📜 game-void.js         # Horror game math & audio engine
 ┃ ┣ 📜 ghost-click.js       # Timer-based raycast clicking
 ┃ ┣ 📜 spatial-audio.js     # 3D panning utilities
 ┃ ┣ 📜 studio.js            # Synthesizer & Sequencer
 ┃ ┗ 📜 terminal.js          # Fake terminal UI logic
 ┣ 📜 index.html             # Main DOM structure
 ┗ 📜 README.md              # Project documentation
```

## 💻 How to Run Locally  

### 1. Clone Repository
```bash
git clone [https://github.com/theayanai/ghost-os.git](https://github.com/theayanai/ghost-os.git)
cd ghost-os
```

### 2. Run a Local Server
Because this project accesses the Webcam and Web Audio APIs, it *must* be run on a local server (cannot just double-click the HTML file).

**(Using Python):**
```bash
python -m http.server 8000
```
**(Using Node.js):**
```bash
npx http-server
```

### 3. Open in Browser
```text
http://localhost:8000
```
*Accept the camera permissions when prompted.*

---

## ⚠️ Limitations  

- **Lighting Dependent:** Tracking requires decent room lighting.  
- **Browser Policies:** Audio will not play until the user interacts with the screen at least once.  
- **Performance:** Running two simultaneous AI models (Hands/Face) + Web Audio can be heavy on older mobile devices.  

---

## 🚀 Future Improvements  

- Web Speech API integration for true voice-command Terminal  
- Multiplayer/WebRTC support to see other "ghosts" in The Void  
- Upload custom audio samples to The Studio  
- LocalStorage integration to save high scores and settings  

---

## 👨‍💻 Developer  

**Mohammed Ayan** Building intelligent AI systems, real-time web applications... *and digital nightmares that stare back at you from the screen.*

---

## ⭐ Support  

If you survived The Void or mixed a sick beat in The Studio, consider giving this repository a ⭐ on GitHub!
