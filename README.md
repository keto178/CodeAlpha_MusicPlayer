# 🎵 SoundWave - Interactive Music Player

An advanced, responsive Web Audio Player built with vanilla modern web technologies and integrated with the **Jamendo RESTful API** to stream real-time music tracks with search, custom playback controls, and dynamic UI updates.

Developed as part of the **Frontend Development Internship** at **CodeAlpha**.

---

## 🚀 Live Demo & Links

- **Live Preview:** [View Demo on Vercel](https://code-alpha-image-gallery-bice.vercel.app/)
- **Source Code:** [GitHub Repository](https://github.com/keto178/CodeAlpha_MusicPlayer)
- **Portfolio:** [keroloseid.com](https://www.keroloseid.com/en)

---

## ✨ Key Features

- **Live Jamendo API Integration:** Fetches and streams top music tracks and albums dynamically via asynchronous requests (`fetch` / `async-await`).
- **Dynamic Track Search:** Instant search engine querying Jamendo's catalog by track or artist title.
- **Full Playback Engine:**
  - Custom controls: Play, Pause, Previous, Next, Shuffle, and Repeat.
  - Interactive scrubbable progress bar with accurate timing (`currentTime` / `duration`).
  - Seamless volume and mute controls with dynamic speaker icon states.
  - Automatic playback of subsequent tracks upon completion (`ended` event listener).
- **Interactive Playlist & Active Equalizer:** Visual indicator for currently playing tracks and auto-scrolling container.
- **Keyboard Shortcuts:**
  - `Spacebar`: Toggle Play / Pause.
  - `Arrow Right / Left`: Seek forward / backward by 5 seconds.
- **Resilient Error Handling:** Fallback images for missing album art and network toast notifications.
- **Fully Responsive Design:** Modern dark theme optimized for desktop, tablet, and mobile viewports.

---

## 🛠️ Built With

- **HTML5:** Semantic architecture, native audio API handling.
- **CSS3:** Flexbox, Grid, custom sliders, CSS variables, and modern transitions.
- **JavaScript (ES6+):** Async/Await, DOM manipulation, custom event listeners, and Audio object lifecycle management.
- **Icons:** [Lucide Icons](https://lucide.dev/)
- **Data Source:** [Jamendo API](https://developer.jamendo.com/v3.0)

---

## 📂 Project Structure

```text
CodeAlpha_MusicPlayer/
├── index.html          # Application structure & layout
├── styles.css          # Modern dark-mode styling & responsive design
├── script.js           # Core player logic & Jamendo API integration
├── logo.svg            # Custom vector branding
└── README.md           # Documentation

## ⚡ Getting Started

1. **Clone the repository:**
   ```bash
   git clone https://github.com/keto178/CodeAlpha_MusicPlayer.git
   ```

2. **Navigate into the directory:**
   ```bash
   cd CodeAlpha_MusicPlayer
   ```

3. **Run locally:**
   Open `index.html` using a local web server (e.g., VS Code **Live Server** extension or `npx serve`) to ensure unrestricted cross-origin API calls.

---

## 👤 Author

**Kerolos Eid**
- Portfolio: [keroloseid.com](https://www.keroloseid.com/en)
- GitHub: [@keto178](https://github.com/keto178)
