/* ==========================================================================
   Music Player - Core Engine & Jamendo API Integration
   Optimized with Multi-Strategy Search, Error Handling & Smooth Playlist Scrolling
   ========================================================================== */

// --- Constants & Config ---
const CLIENT_ID = "d670e1ef";
const BASE_API_URL = "https://api.jamendo.com/v3.0/tracks/";
const DEFAULT_LIMIT = 10;
const FALLBACK_ART = "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80";

// --- State ---
let songs = [];
let currentIndex = 0;
let isSeeking = false;
let isShuffle = false;
let isRepeat = false;
let previousVolume = 0.8;

// --- DOM Elements ---
const audio = document.getElementById("audioPlayer");
const trackArt = document.getElementById("trackArt");
const trackTitle = document.getElementById("trackTitle");
const trackArtist = document.getElementById("trackArtist");
const trackAlbum = document.getElementById("trackAlbum");
const trackCounter = document.getElementById("trackCounter");
const playerStatus = document.getElementById("playerStatus");
const playerCard = document.querySelector(".player-card");

const progressBar = document.getElementById("progressBar");
const currentTimeEl = document.getElementById("currentTime");
const totalDurationEl = document.getElementById("totalDuration");

const btnPlayPause = document.getElementById("btnPlayPause");
const playPauseIcon = document.getElementById("playPauseIcon");
const btnPrev = document.getElementById("btnPrev");
const btnNext = document.getElementById("btnNext");
const btnShuffle = document.getElementById("btnShuffle");
const btnRepeat = document.getElementById("btnRepeat");

const volumeSlider = document.getElementById("volumeSlider");
const btnMute = document.getElementById("btnMute");
const volumeIcon = document.getElementById("volumeIcon");

const inputSearch = document.getElementById("inputSearch");
const btnSearch = document.getElementById("btnSearch");
const btnClearSearch = document.getElementById("btnClearSearch");
const playlistContainer = document.getElementById("playlistContainer");
const playlistCount = document.getElementById("playlistCount");
const toastEl = document.getElementById("toast");

// --- Handle Image Errors ---
trackArt.addEventListener("error", () => {
    trackArt.src = FALLBACK_ART;
});

// --- Helper: Render Lucide Icons ---
function refreshIcons() {
    if (window.lucide && typeof window.lucide.createIcons === "function") {
        window.lucide.createIcons();
    }
}

// --- Helper: Format Time in MM:SS ---
function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

// --- Helper: Update Slider Fill Gradient ---
function updateSliderFill(slider, value, max = 100) {
    const percent = Math.min(Math.max((value / max) * 100, 0), 100);
    slider.style.background = `linear-gradient(to right, var(--accent-indigo) ${percent}%, rgba(255, 255, 255, 0.12) ${percent}%)`;
}

// --- Helper: Show Toast Notification ---
let toastTimeout;
function showToast(message, isError = false) {
    clearTimeout(toastTimeout);
    toastEl.textContent = message;
    toastEl.style.borderColor = isError ? "#ef4444" : "var(--border-accent)";
    toastEl.classList.add("show");
    toastTimeout = setTimeout(() => {
        toastEl.classList.remove("show");
    }, 2800);
}

// --- Multi-tier Jamendo Search Service ---
async function queryJamendoTracks(searchQuery = "") {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
        const defaultUrl = `${BASE_API_URL}?client_id=${CLIENT_ID}&format=jsonpretty&limit=${DEFAULT_LIMIT}&order=popularity_total`;
        const res = await fetch(defaultUrl);
        const data = await res.json();
        return data.results || [];
    }

    // 1. Primary Search: 'search' param handles any string, single letters (e.g. 't'), words, and genres
    try {
        const primaryUrl = `${BASE_API_URL}?client_id=${CLIENT_ID}&format=jsonpretty&limit=${DEFAULT_LIMIT}&search=${encodeURIComponent(trimmed)}&order=popularity_total`;
        const res = await fetch(primaryUrl);
        const data = await res.json();
        if (data.results && data.results.length > 0) {
            return data.results;
        }
    } catch (e) {
        console.warn("Primary search query error:", e);
    }

    // 2. Fallback: namesearch (if >= 2 characters)
    if (trimmed.length >= 2) {
        try {
            const nameUrl = `${BASE_API_URL}?client_id=${CLIENT_ID}&format=jsonpretty&limit=${DEFAULT_LIMIT}&namesearch=${encodeURIComponent(trimmed)}&order=popularity_total`;
            const res = await fetch(nameUrl);
            const data = await res.json();
            if (data.results && data.results.length > 0) {
                return data.results;
            }
        } catch (e) {
            console.warn("Namesearch query error:", e);
        }

        // 3. Fallback: tags / genre search
        try {
            const tagUrl = `${BASE_API_URL}?client_id=${CLIENT_ID}&format=jsonpretty&limit=${DEFAULT_LIMIT}&tags=${encodeURIComponent(trimmed)}&order=popularity_total`;
            const res = await fetch(tagUrl);
            const data = await res.json();
            if (data.results && data.results.length > 0) {
                return data.results;
            }
        } catch (e) {
            console.warn("Tag query error:", e);
        }

        // 4. Fallback: artist search
        try {
            const artistUrl = `${BASE_API_URL}?client_id=${CLIENT_ID}&format=jsonpretty&limit=${DEFAULT_LIMIT}&artist_name=${encodeURIComponent(trimmed)}&order=popularity_total`;
            const res = await fetch(artistUrl);
            const data = await res.json();
            if (data.results && data.results.length > 0) {
                return data.results;
            }
        } catch (e) {
            console.warn("Artist query error:", e);
        }
    }

    return [];
}

// --- Fetch Initial Tracks on Page Load or Search ---
async function fetchTracks(searchQuery = "") {
    const isSearching = !!searchQuery.trim();
    try {
        if (isSearching) {
            btnSearch.disabled = true;
            btnSearch.style.opacity = "0.75";
            btnSearch.innerHTML = `<span class="spinner" style="width:14px;height:14px;border-width:2px;display:inline-block;vertical-align:middle;"></span> <span>Searching...</span>`;

            playlistContainer.innerHTML = `
                <div class="playlist-placeholder">
                    <div class="spinner"></div>
                    <p>Searching tracks for "${searchQuery}"...</p>
                </div>
            `;
        } else {
            playlistContainer.innerHTML = `
                <div class="playlist-placeholder">
                    <div class="spinner"></div>
                    <p>Loading top tracks from Jamendo...</p>
                </div>
            `;
        }

        const results = await queryJamendoTracks(searchQuery);

        if (!results || results.length === 0) {
            if (isSearching) {
                showToast(`No tracks found for "${searchQuery}"`, true);
                renderPlaylist(); // keep previous tracks in playlist
            } else {
                showToast("Failed to fetch initial tracks.", true);
            }
            return;
        }

        songs = results;
        currentIndex = 0;
        loadTrack(currentIndex);
        renderPlaylist();

        if (isSearching) {
            showToast(`Found ${results.length} tracks for "${searchQuery}"`);
            playTrack();
        }

    } catch (error) {
        console.error("Error fetching tracks:", error);
        showToast("Network error while connecting to Jamendo.", true);
        playlistContainer.innerHTML = `
            <div class="playlist-placeholder">
                <p style="color: #ef4444;">Failed to load music. Please check your connection.</p>
            </div>
        `;
    } finally {
        btnSearch.disabled = false;
        btnSearch.style.opacity = "1";
        btnSearch.innerHTML = `<span>Search</span> <i data-lucide="arrow-right" class="btn-icon"></i>`;
        refreshIcons();
    }
}

// --- Load Track Data into UI ---
function loadTrack(index) {
    if (!songs || songs.length === 0 || !songs[index]) return;

    const track = songs[index];

    // Audio stream source
    audio.src = track.audio;
    audio.loop = isRepeat;

    // Cover art (fallback to high quality photo if absent)
    const artworkUrl = track.image || track.album_image || FALLBACK_ART;
    trackArt.src = artworkUrl;
    trackArt.alt = `${track.name} by ${track.artist_name}`;

    // Metadata
    trackTitle.textContent = track.name || "Untitled Track";
    trackArtist.textContent = track.artist_name || "Unknown Artist";
    trackAlbum.textContent = track.album_name ? `Album: ${track.album_name}` : "";

    // Track Counter
    trackCounter.textContent = `${index + 1} / ${songs.length}`;

    // Document Title
    document.title = `🎵 ${track.name} - ${track.artist_name} | Music Player`;

    // Reset progress
    progressBar.value = 0;
    updateSliderFill(progressBar, 0);
    currentTimeEl.textContent = "0:00";
    totalDurationEl.textContent = formatTime(track.duration || 0);

    // Update active state in playlist
    updatePlaylistActiveState();
}

// --- Native Audio State Synchronization ---
audio.addEventListener("play", () => {
    playerCard.classList.add("playing");
    playerStatus.textContent = "Playing";
    btnPlayPause.innerHTML = `<i data-lucide="pause" id="playPauseIcon"></i>`;
    btnPlayPause.title = "Pause";
    refreshIcons();
    updatePlaylistActiveState();
});

audio.addEventListener("pause", () => {
    playerCard.classList.remove("playing");
    playerStatus.textContent = "Paused";
    btnPlayPause.innerHTML = `<i data-lucide="play" id="playPauseIcon"></i>`;
    btnPlayPause.title = "Play";
    refreshIcons();
    updatePlaylistActiveState();
});

// --- Play / Pause Logic ---
async function playTrack() {
    try {
        if (!audio.src) return;
        await audio.play();
    } catch (err) {
        console.warn("Playback error or prevented:", err);
    }
}

function pauseTrack() {
    audio.pause();
}

function togglePlayPause() {
    if (!songs || songs.length === 0) return;
    if (audio.paused) {
        playTrack();
    } else {
        pauseTrack();
    }
}

// --- Navigation: Next & Prev Tracks ---
function nextTrack(isAuto = false) {
    if (!songs || songs.length === 0) return;

    // If repeat is enabled and song ended automatically, it loops natively via audio.loop
    if (isRepeat && isAuto) {
        audio.currentTime = 0;
        playTrack();
        return;
    }

    if (isShuffle) {
        let randomIndex = Math.floor(Math.random() * songs.length);
        if (songs.length > 1 && randomIndex === currentIndex) {
            randomIndex = (randomIndex + 1) % songs.length;
        }
        currentIndex = randomIndex;
    } else {
        currentIndex = (currentIndex + 1) % songs.length;
    }

    loadTrack(currentIndex);
    playTrack();
}

function prevTrack() {
    if (!songs || songs.length === 0) return;

    // If more than 3 seconds in, restart current track first
    if (audio.currentTime > 3) {
        audio.currentTime = 0;
        progressBar.value = 0;
        updateSliderFill(progressBar, 0);
        currentTimeEl.textContent = "0:00";
        if (audio.paused) {
            playTrack();
        }
        return;
    }

    currentIndex = (currentIndex - 1 + songs.length) % songs.length;
    loadTrack(currentIndex);
    playTrack();
}

// --- Progress Bar & Audio Time Updates ---
audio.addEventListener("timeupdate", () => {
    if (isSeeking || isNaN(audio.duration)) return;

    const current = audio.currentTime;
    const duration = audio.duration;
    const progressPercent = duration > 0 ? (current / duration) * 100 : 0;

    progressBar.value = progressPercent;
    updateSliderFill(progressBar, progressPercent);
    currentTimeEl.textContent = formatTime(current);
});

audio.addEventListener("loadedmetadata", () => {
    totalDurationEl.textContent = formatTime(audio.duration);
});

// Audio stream error handler (fallback to next track)
audio.addEventListener("error", () => {
    if (songs.length > 0 && !audio.paused) {
        showToast("Track stream unavailable, skipping to next...", true);
        setTimeout(() => nextTrack(true), 1000);
    }
});

// Auto next when song ends
audio.addEventListener("ended", () => {
    if (!isRepeat) {
        nextTrack(true);
    }
});

// Progress Bar Scrubbing
progressBar.addEventListener("input", (e) => {
    isSeeking = true;
    const percent = parseFloat(e.target.value);
    updateSliderFill(progressBar, percent);
    if (!isNaN(audio.duration)) {
        currentTimeEl.textContent = formatTime((percent / 100) * audio.duration);
    }
});

progressBar.addEventListener("change", (e) => {
    const percent = parseFloat(e.target.value);
    if (!isNaN(audio.duration)) {
        audio.currentTime = (percent / 100) * audio.duration;
    }
    isSeeking = false;
});

// Safety for mouseup / touchend anywhere on window while seeking
window.addEventListener("mouseup", () => {
    if (isSeeking) {
        isSeeking = false;
        if (!isNaN(audio.duration)) {
            audio.currentTime = (parseFloat(progressBar.value) / 100) * audio.duration;
        }
    }
});

// --- Volume Controls ---
function updateVolumeIcon(vol) {
    if (vol === 0 || audio.muted) {
        btnMute.innerHTML = `<i data-lucide="volume-x" id="volumeIcon" class="volume-icon"></i>`;
    } else if (vol < 0.5) {
        btnMute.innerHTML = `<i data-lucide="volume-1" id="volumeIcon" class="volume-icon"></i>`;
    } else {
        btnMute.innerHTML = `<i data-lucide="volume-2" id="volumeIcon" class="volume-icon"></i>`;
    }
    refreshIcons();
}

volumeSlider.addEventListener("input", (e) => {
    const vol = parseFloat(e.target.value);
    audio.muted = (vol === 0);
    audio.volume = vol;
    if (vol > 0) previousVolume = vol;
    updateSliderFill(volumeSlider, vol, 1);
    updateVolumeIcon(vol);
});

btnMute.addEventListener("click", () => {
    if (audio.muted || audio.volume === 0) {
        const restored = previousVolume > 0 ? previousVolume : 0.8;
        audio.muted = false;
        audio.volume = restored;
        volumeSlider.value = restored;
        updateSliderFill(volumeSlider, restored, 1);
        updateVolumeIcon(restored);
        showToast(`Volume: ${Math.round(restored * 100)}%`);
    } else {
        previousVolume = audio.volume;
        audio.volume = 0;
        audio.muted = true;
        volumeSlider.value = 0;
        updateSliderFill(volumeSlider, 0, 1);
        updateVolumeIcon(0);
        showToast("Muted");
    }
});

// --- Shuffle & Repeat Toggles ---
btnShuffle.addEventListener("click", () => {
    isShuffle = !isShuffle;
    btnShuffle.classList.toggle("active", isShuffle);
    showToast(isShuffle ? "Shuffle mode: ON" : "Shuffle mode: OFF");
});

btnRepeat.addEventListener("click", () => {
    isRepeat = !isRepeat;
    audio.loop = isRepeat;
    btnRepeat.classList.toggle("active", isRepeat);
    showToast(isRepeat ? "Repeat mode: Current song" : "Repeat mode: OFF");
});

// --- Buttons Event Listeners ---
btnPlayPause.addEventListener("click", togglePlayPause);
btnPrev.addEventListener("click", prevTrack);
btnNext.addEventListener("click", () => nextTrack(false));

// --- Search Functionality ---
function executeSearch() {
    const query = inputSearch.value.trim();
    if (!query) {
        showToast("Showing popular tracks");
        fetchTracks(""); // Reload default tracks if cleared
        return;
    }
    fetchTracks(query);
}

btnSearch.addEventListener("click", (e) => {
    e.preventDefault();
    executeSearch();
});

inputSearch.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        executeSearch();
    }
});

// Show/hide clear button dynamically as user types
if (inputSearch && btnClearSearch) {
    inputSearch.addEventListener("input", () => {
        if (inputSearch.value.trim().length > 0) {
            btnClearSearch.style.display = "inline-flex";
            refreshIcons();
        } else {
            btnClearSearch.style.display = "none";
        }
    });

    btnClearSearch.addEventListener("click", () => {
        inputSearch.value = "";
        btnClearSearch.style.display = "none";
        inputSearch.focus();
        fetchTracks("");
    });
}

// --- Render Playlist UI ---
function renderPlaylist() {
    if (!songs || songs.length === 0) {
        playlistContainer.innerHTML = `
            <div class="playlist-placeholder">
                <p>No tracks available.</p>
            </div>
        `;
        playlistCount.textContent = "0 tracks";
        return;
    }

    playlistCount.textContent = `${songs.length} tracks`;
    playlistContainer.innerHTML = "";

    songs.forEach((track, index) => {
        const item = document.createElement("div");
        item.className = `playlist-item ${index === currentIndex ? "active" : ""}`;
        item.setAttribute("data-index", index);

        const artwork = track.image || track.album_image || FALLBACK_ART;

        item.innerHTML = `
            <img src="${artwork}" alt="${track.name}" class="playlist-item-art" loading="lazy" onerror="this.src='${FALLBACK_ART}'">
            <div class="playlist-item-info">
                <h4 class="playlist-item-title">${track.name}</h4>
                <p class="playlist-item-artist">${track.artist_name}</p>
            </div>
            <div class="playlist-item-right">
                ${index === currentIndex && !audio.paused ? `
                    <div class="equalizer">
                        <span class="equalizer-bar"></span>
                        <span class="equalizer-bar"></span>
                        <span class="equalizer-bar"></span>
                    </div>
                ` : ""}
                <span class="playlist-item-duration">${formatTime(track.duration || 0)}</span>
            </div>
        `;

        item.addEventListener("click", () => {
            if (currentIndex === index) {
                togglePlayPause();
            } else {
                currentIndex = index;
                loadTrack(currentIndex);
                playTrack();
            }
        });

        playlistContainer.appendChild(item);
    });
}

function updatePlaylistActiveState() {
    const items = playlistContainer.querySelectorAll(".playlist-item");
    items.forEach((item, index) => {
        const isActive = index === currentIndex;
        item.classList.toggle("active", isActive);

        const rightCol = item.querySelector(".playlist-item-right");
        if (rightCol) {
            const existingEq = rightCol.querySelector(".equalizer");
            if (isActive && !audio.paused) {
                if (!existingEq) {
                    const eq = document.createElement("div");
                    eq.className = "equalizer";
                    eq.innerHTML = `
                        <span class="equalizer-bar"></span>
                        <span class="equalizer-bar"></span>
                        <span class="equalizer-bar"></span>
                    `;
                    rightCol.prepend(eq);
                }
            } else if (existingEq) {
                existingEq.remove();
            }
        }

        // Smoothly scroll active track into view inside playlist container
        if (isActive) {
            item.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
    });
}

// --- Keyboard Shortcuts (Space for Play/Pause, Arrow Left/Right for Seek) ---
document.addEventListener("keydown", (e) => {
    // Ignore if user is typing in search input
    if (document.activeElement === inputSearch) return;

    if (e.code === "Space") {
        e.preventDefault();
        togglePlayPause();
    } else if (e.code === "ArrowRight") {
        if (!isNaN(audio.duration)) {
            audio.currentTime = Math.min(audio.currentTime + 5, audio.duration);
        }
    } else if (e.code === "ArrowLeft") {
        if (!isNaN(audio.duration)) {
            audio.currentTime = Math.max(audio.currentTime - 5, 0);
        }
    }
});

// --- Initialization on Load ---
document.addEventListener("DOMContentLoaded", () => {
    // Set initial volume
    audio.volume = 0.8;
    volumeSlider.value = 0.8;
    updateSliderFill(volumeSlider, 0.8, 1);
    updateSliderFill(progressBar, 0);

    // Render initial icons
    refreshIcons();

    // Fetch initial tracks
    fetchTracks();
});
