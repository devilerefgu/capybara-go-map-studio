/**
 * ===================================================================
 * Capybara Go! Map Studio - Master Application Logic
 * Dedicated Beatmap Editor, Audio Uploader, & AI Auto-Composer
 * ===================================================================
 */

// Application State
const state = {
  isPlaying: false,
  currentTime: 0,
  playbackSpeed: 1.0,
  synthMuted: false,
  selectedTool: 'tap', // 'tap', 'hold', 'burst'
  holdDuration: 1.0,
  snapDiv: 4, // 1/4 beat
  zoom: 1.0,
  metronome: true,
  lastMetronomeBeat: -1,
  selectedNoteId: null,
  tapBpmTimes: [],
  isCustomAudio: false,
  customAudioUrl: null,
  
  // Active Song Data
  song: null
};

// 4 Lane Configuration
const LANES = [
  { index: 0, key: 'D', name: 'Yuzu', color: '#f59e0b', sfx: 'yuzu_pop', icon: '🍊' },
  { index: 1, key: 'F', name: 'Onsen', color: '#38bdf8', sfx: 'water_splash', icon: '💧' },
  { index: 2, key: 'J', name: 'Paw', color: '#10b981', sfx: 'paw_tap', icon: '🐾' },
  { index: 3, key: 'K', name: 'Citrus', color: '#ec4899', sfx: 'citrus_burst', icon: '⭐' }
];

// Note Pitch Frequencies for Synth
const NOTE_FREQS = {
  'C2': 65.41, 'D2': 73.42, 'E2': 82.41, 'F2': 87.31, 'F#2': 92.50, 'G2': 98.00, 'A2': 110.00, 'B2': 123.47,
  'B1': 61.74, 'G1': 49.00, 'A1': 55.00,
  'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
  'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'E4': 329.63, 'F4': 349.23, 'F#4': 369.99,
  'G4': 392.00, 'G#4': 415.30, 'A4': 440.00, 'A#4': 466.16, 'B4': 493.88,
  'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'G5': 783.99
};

/* ===================================================================
   1. WEB AUDIO SYNTHESIZER & SOUND ENGINE
   =================================================================== */

class CapyAudioEngine {
  constructor() {
    this.ctx = null;
    this.synthGain = null;
    this.sfxGain = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      
      this.synthGain = this.ctx.createGain();
      this.synthGain.gain.value = 0.5;
      this.synthGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.8;
      this.sfxGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setSynthMuted(muted) {
    if (this.synthGain) {
      this.synthGain.gain.value = muted ? 0 : 0.5;
    }
  }

  // --- SOUND EFFECTS (SFX) ---
  playSfx(type) {
    if (!this.ctx) this.init();
    const t = this.ctx.currentTime;

    switch (type) {
      case 'yuzu_pop': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(680, t);
        osc.frequency.exponentialRampToValueAtTime(140, t + 0.12);
        gain.gain.setValueAtTime(0.7, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.12);
        break;
      }
      case 'water_splash': {
        const bufferSize = this.ctx.sampleRate * 0.18;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.04));
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1200, t);
        filter.Q.value = 3.0;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.6, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.18);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);
        noise.start(t);
        break;
      }
      case 'paw_tap': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(420, t);
        osc.frequency.exponentialRampToValueAtTime(80, t + 0.08);
        gain.gain.setValueAtTime(0.75, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.08);
        break;
      }
      case 'citrus_burst': {
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = freq;
          const startTime = t + i * 0.035;
          gain.gain.setValueAtTime(0.35, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);
          osc.connect(gain);
          gain.connect(this.sfxGain);
          osc.start(startTime);
          osc.stop(startTime + 0.35);
        });
        break;
      }
      case 'warm_onsen': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(329.63, t);
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.4);
        break;
      }
      case 'metronome': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1000, t);
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.04);
        break;
      }
    }
  }

  // --- SYNTH AUDIO PLAYBACK ---
  playChord(frequencies, duration = 1.5) {
    if (!this.ctx || state.synthMuted) return;
    const t = this.ctx.currentTime;
    frequencies.forEach(pitchName => {
      const freq = NOTE_FREQS[pitchName];
      if (!freq) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.18, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      osc.connect(gain);
      gain.connect(this.synthGain);
      osc.start(t);
      osc.stop(t + duration);
    });
  }

  playBass(pitchName, duration = 0.8) {
    if (!this.ctx || state.synthMuted) return;
    const freq = NOTE_FREQS[pitchName];
    if (!freq) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(gain);
    gain.connect(this.synthGain);
    osc.start(t);
    osc.stop(t + duration);
  }

  playDrum(type) {
    if (!this.ctx || state.synthMuted) return;
    const t = this.ctx.currentTime;
    if (type === 'kick') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(35, t + 0.15);
      gain.gain.setValueAtTime(0.65, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.connect(gain);
      gain.connect(this.synthGain);
      osc.start(t);
      osc.stop(t + 0.15);
    } else if (type === 'snare') {
      const bufferSize = this.ctx.sampleRate * 0.1;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      noise.connect(gain);
      gain.connect(this.synthGain);
      noise.start(t);
    }
  }
}

const audio = new CapyAudioEngine();

/* ===================================================================
   2. PRESET BEATMAPS & SONG LOADING
   =================================================================== */

const PRESET_ONSEN = {
  formatVersion: "capybara-go-v1",
  metadata: {
    title: "Capybara Onsen Afternoon",
    artist: "Capy Chillhop Collective",
    genre: "Lo-Fi Onsen Beat",
    bpm: 86,
    duration: 34.0,
    difficulty: "Normal",
    author: "CapyDev",
    description: "Lagu santai berendam di air hangat onsen dengan aroma jeruk yuzu yang segar."
  },
  synthAudio: {
    enabled: true,
    tempo: 86,
    chords: [
      { time: 0.0, chord: ["C4", "E4", "G4", "B4"], duration: 2.79 },
      { time: 2.79, chord: ["A3", "C4", "E4", "G4"], duration: 2.79 },
      { time: 5.58, chord: ["F3", "A3", "C4", "E4"], duration: 2.79 },
      { time: 8.37, chord: ["G3", "B3", "D4", "F4"], duration: 2.79 },
      { time: 11.16, chord: ["C4", "E4", "G4", "B4"], duration: 2.79 },
      { time: 13.95, chord: ["A3", "C4", "E4", "G4"], duration: 2.79 },
      { time: 16.74, chord: ["F3", "A3", "C4", "E4"], duration: 2.79 },
      { time: 19.53, chord: ["G3", "B3", "D4", "F4"], duration: 2.79 },
      { time: 22.32, chord: ["C4", "E4", "G4", "B4"], duration: 2.79 },
      { time: 25.11, chord: ["A3", "C4", "E4", "G4"], duration: 2.79 },
      { time: 27.90, chord: ["F3", "A3", "C4", "E4"], duration: 2.79 },
      { time: 30.69, chord: ["C4", "G4", "C5"], duration: 3.31 }
    ],
    bass: [
      { time: 0.0, pitch: "C2", duration: 1.39 },
      { time: 1.39, pitch: "G2", duration: 1.39 },
      { time: 2.79, pitch: "A2", duration: 1.39 },
      { time: 4.18, pitch: "E2", duration: 1.39 },
      { time: 5.58, pitch: "F2", duration: 1.39 },
      { time: 6.97, pitch: "C2", duration: 1.39 },
      { time: 8.37, pitch: "G2", duration: 1.39 },
      { time: 9.76, pitch: "D2", duration: 1.39 },
      { time: 11.16, pitch: "C2", duration: 1.39 },
      { time: 12.55, pitch: "G2", duration: 1.39 },
      { time: 13.95, pitch: "A2", duration: 1.39 },
      { time: 15.34, pitch: "E2", duration: 1.39 },
      { time: 16.74, pitch: "F2", duration: 1.39 },
      { time: 18.13, pitch: "C2", duration: 1.39 },
      { time: 19.53, pitch: "G2", duration: 1.39 },
      { time: 20.92, pitch: "D2", duration: 1.39 },
      { time: 22.32, pitch: "C2", duration: 1.39 },
      { time: 23.71, pitch: "G2", duration: 1.39 },
      { time: 25.11, pitch: "A2", duration: 1.39 },
      { time: 26.50, pitch: "E2", duration: 1.39 },
      { time: 27.90, pitch: "F2", duration: 1.39 },
      { time: 29.29, pitch: "G2", duration: 1.39 },
      { time: 30.69, pitch: "C2", duration: 3.31 }
    ],
    drums: [
      { time: 0.0, type: "kick" }, { time: 0.70, type: "snare" }, { time: 1.39, type: "snare" },
      { time: 2.09, type: "kick" }, { time: 2.79, type: "snare" }, { time: 3.49, type: "kick" },
      { time: 4.18, type: "snare" }, { time: 4.88, type: "kick" }, { time: 5.58, type: "snare" },
      { time: 6.28, type: "kick" }, { time: 6.97, type: "snare" }, { time: 7.67, type: "kick" },
      { time: 8.37, type: "snare" }, { time: 9.07, type: "kick" }, { time: 9.76, type: "snare" },
      { time: 10.46, type: "kick" }, { time: 11.16, type: "snare" }, { time: 11.86, type: "kick" },
      { time: 12.55, type: "snare" }, { time: 13.25, type: "kick" }, { time: 13.95, type: "snare" },
      { time: 14.65, type: "kick" }, { time: 15.34, type: "snare" }, { time: 16.04, type: "kick" },
      { time: 16.74, type: "snare" }, { time: 17.44, type: "kick" }, { time: 18.13, type: "snare" },
      { time: 18.83, type: "kick" }, { time: 19.53, type: "snare" }, { time: 20.23, type: "kick" },
      { time: 20.92, type: "snare" }, { time: 21.62, type: "kick" }, { time: 22.32, type: "snare" },
      { time: 23.02, type: "kick" }, { time: 23.71, type: "snare" }, { time: 24.41, type: "kick" },
      { time: 25.11, type: "snare" }, { time: 25.81, type: "kick" }, { time: 26.50, type: "snare" },
      { time: 27.20, type: "kick" }, { time: 27.90, type: "snare" }, { time: 28.60, type: "kick" },
      { time: 29.29, type: "snare" }
    ]
  },
  notes: [
    { id: 1, time: 1.40, lane: 0, type: "tap", sound: "yuzu_pop" },
    { id: 2, time: 2.09, lane: 1, type: "tap", sound: "water_splash" },
    { id: 3, time: 2.79, lane: 2, type: "tap", sound: "paw_tap" },
    { id: 4, time: 3.49, lane: 3, type: "tap", sound: "yuzu_pop" },
    { id: 5, time: 4.18, lane: 1, type: "tap", sound: "water_splash" },
    { id: 6, time: 4.88, lane: 0, type: "tap", sound: "paw_tap" },
    { id: 7, time: 5.58, lane: 2, type: "hold", duration: 1.0, sound: "warm_onsen" },
    { id: 8, time: 6.98, lane: 1, type: "tap", sound: "water_splash" },
    { id: 9, time: 7.67, lane: 3, type: "tap", sound: "yuzu_pop" },
    { id: 10, time: 8.37, lane: 0, type: "tap", sound: "paw_tap" },
    { id: 11, time: 9.07, lane: 2, type: "tap", sound: "water_splash" },
    { id: 12, time: 9.77, lane: 1, type: "tap", sound: "yuzu_pop" },
    { id: 13, time: 10.46, lane: 3, type: "burst", sound: "citrus_burst" },
    { id: 14, time: 11.16, lane: 0, type: "tap", sound: "paw_tap" },
    { id: 15, time: 11.86, lane: 1, type: "tap", sound: "water_splash" },
    { id: 16, time: 12.56, lane: 2, type: "tap", sound: "yuzu_pop" },
    { id: 17, time: 13.25, lane: 3, type: "tap", sound: "paw_tap" },
    { id: 18, time: 13.95, lane: 1, type: "hold", duration: 1.2, sound: "warm_onsen" },
    { id: 19, time: 15.34, lane: 0, type: "tap", sound: "water_splash" },
    { id: 20, time: 16.04, lane: 2, type: "tap", sound: "yuzu_pop" },
    { id: 21, time: 16.74, lane: 3, type: "tap", sound: "paw_tap" },
    { id: 22, time: 17.44, lane: 1, type: "tap", sound: "water_splash" },
    { id: 23, time: 18.14, lane: 0, type: "tap", sound: "yuzu_pop" },
    { id: 24, time: 18.84, lane: 2, type: "tap", sound: "citrus_burst" },
    { id: 25, time: 19.53, lane: 3, type: "hold", duration: 1.4, sound: "warm_onsen" },
    { id: 26, time: 21.62, lane: 0, type: "tap", sound: "paw_tap" },
    { id: 27, time: 22.32, lane: 1, type: "tap", sound: "yuzu_pop" },
    { id: 28, time: 23.02, lane: 2, type: "tap", sound: "water_splash" },
    { id: 29, time: 23.72, lane: 3, type: "tap", sound: "paw_tap" },
    { id: 30, time: 24.41, lane: 2, type: "tap", sound: "yuzu_pop" },
    { id: 31, time: 25.11, lane: 1, type: "tap", sound: "water_splash" },
    { id: 32, time: 25.81, lane: 0, type: "tap", sound: "citrus_burst" },
    { id: 33, time: 26.51, lane: 1, type: "tap", sound: "paw_tap" },
    { id: 34, time: 27.20, lane: 2, type: "tap", sound: "water_splash" },
    { id: 35, time: 27.90, lane: 3, type: "hold", duration: 1.5, sound: "warm_onsen" },
    { id: 36, time: 30.69, lane: 1, type: "burst", sound: "citrus_burst" }
  ]
};

const PRESET_RUSH = {
  formatVersion: "capybara-go-v1",
  metadata: {
    title: "Capybara Citrus Rush!",
    artist: "DJ Capy & The Hotspring Crew",
    genre: "Capy Speed / Citrus Dance",
    bpm: 132,
    duration: 30.0,
    difficulty: "Hard",
    author: "CapyDev",
    description: "Lagu bersemangat saat Capybara berlari mengumpulkan jeruk yuzu emas melintasi sungai bambu!"
  },
  synthAudio: {
    enabled: true,
    tempo: 132,
    chords: [
      { time: 0.0, chord: ["D4", "F#4", "A4"], duration: 1.82 },
      { time: 1.82, chord: ["B3", "D4", "F#4"], duration: 1.82 },
      { time: 3.64, chord: ["G3", "B3", "D4"], duration: 1.82 },
      { time: 5.45, chord: ["A3", "C#4", "E4"], duration: 1.82 }
    ],
    bass: [
      { time: 0.0, pitch: "D2", duration: 0.45 },
      { time: 0.45, pitch: "D2", duration: 0.45 },
      { time: 0.91, pitch: "A2", duration: 0.45 }
    ],
    drums: [
      { time: 0.0, type: "kick" },
      { time: 0.45, type: "snare" },
      { time: 0.91, type: "kick" }
    ]
  },
  notes: [
    { id: 1, time: 0.91, lane: 0, type: "tap", sound: "yuzu_pop" },
    { id: 2, time: 1.36, lane: 1, type: "tap", sound: "paw_tap" },
    { id: 3, time: 1.82, lane: 2, type: "tap", sound: "water_splash" },
    { id: 4, time: 2.27, lane: 3, type: "tap", sound: "citrus_burst" },
    { id: 5, time: 2.73, lane: 1, type: "tap", sound: "yuzu_pop" },
    { id: 6, time: 3.18, lane: 2, type: "tap", sound: "paw_tap" },
    { id: 7, time: 3.64, lane: 0, type: "tap", sound: "water_splash" },
    { id: 8, time: 4.09, lane: 3, type: "tap", sound: "citrus_burst" },
    { id: 9, time: 4.55, lane: 1, type: "hold", duration: 0.8, sound: "warm_onsen" },
    { id: 10, time: 5.45, lane: 2, type: "tap", sound: "yuzu_pop" },
    { id: 11, time: 5.91, lane: 0, type: "tap", sound: "paw_tap" },
    { id: 12, time: 6.36, lane: 3, type: "tap", sound: "citrus_burst" }
  ]
};

function loadSong(songData, showToastMsg = true) {
  state.song = JSON.parse(JSON.stringify(songData));
  state.song.notes.sort((a, b) => a.time - b.time);
  
  stopPlayback();
  state.currentTime = 0;
  state.selectedNoteId = null;

  updateUIElements();
  updateTimelineCanvas();
  updateInspector();

  if (showToastMsg) {
    showToast(`🍊 Map "${state.song.metadata.title}" berhasil dimuat!`);
  }
}

function updateUIElements() {
  const meta = state.song.metadata;
  document.getElementById('pillSongTitle').textContent = meta.title;
  document.getElementById('pillSongMeta').textContent = `${meta.bpm} BPM • ${state.song.notes.length} Notes • ${meta.difficulty}`;
  document.getElementById('readoutTotalTime').textContent = formatTimePrecise(meta.duration);
  document.getElementById('mascotNotesCount').textContent = `${state.song.notes.length} notes terpola`;

  // Update inputs
  document.getElementById('inputBpm').value = meta.bpm;
  document.getElementById('inputDuration').value = meta.duration;
  document.getElementById('aiBpm').value = meta.bpm;
  document.getElementById('aiDuration').value = meta.duration;

  updatePromptTemplateText();
}

/* ===================================================================
   3. TRANSPORT PLAYBACK ENGINE & AUDIO PREVIEW
   =================================================================== */

let lastFrameTimestamp = null;

function togglePlayback() {
  if (state.isPlaying) {
    pausePlayback();
  } else {
    startPlayback();
  }
}

function startPlayback() {
  audio.init();
  state.isPlaying = true;
  lastFrameTimestamp = performance.now();

  const customAudio = document.getElementById('customAudioElement');
  if (state.isCustomAudio && customAudio.src) {
    customAudio.currentTime = state.currentTime;
    customAudio.play().catch(e => console.warn('Audio play err:', e));
  }

  document.getElementById('transportPlayText').textContent = 'Jeda (Spasi)';
  document.getElementById('transportPlayIcon').textContent = '⏸';
  document.getElementById('mascotMood').textContent = 'Mendengarkan Beat 🎵';

  requestAnimationFrame(transportLoop);
}

function pausePlayback() {
  state.isPlaying = false;
  const customAudio = document.getElementById('customAudioElement');
  if (state.isCustomAudio && customAudio.src) {
    customAudio.pause();
  }

  document.getElementById('transportPlayText').textContent = 'Preview Lagu (Spasi)';
  document.getElementById('transportPlayIcon').textContent = '▶';
  document.getElementById('mascotMood').textContent = 'Santai Berendam';
}

function stopPlayback() {
  pausePlayback();
  state.currentTime = 0;
  state.lastMetronomeBeat = -1;

  const customAudio = document.getElementById('customAudioElement');
  if (state.isCustomAudio && customAudio.src) {
    customAudio.currentTime = 0;
  }

  updateTimeDisplays();
  updateTimelineCanvas();
}

function transportLoop(currentTimestamp) {
  if (!state.isPlaying) return;

  const delta = (currentTimestamp - lastFrameTimestamp) / 1000;
  lastFrameTimestamp = currentTimestamp;

  const prevTime = state.currentTime;
  state.currentTime += delta * state.playbackSpeed;

  const duration = state.song.metadata.duration;

  // Auto-stop at end
  if (state.currentTime >= duration) {
    stopPlayback();
    showToast('✨ Selesai memutar pratinjau lagu.');
    return;
  }

  // Synth Audio Scheduling (if synth audio is enabled and not using custom mp3)
  if (!state.isCustomAudio && state.song.synthAudio && state.song.synthAudio.enabled && !state.synthMuted) {
    checkAndTriggerSynthEvents(prevTime, state.currentTime);
  }

  // Trigger Note SFX when playhead crosses a note
  checkAndTriggerNoteSfx(prevTime, state.currentTime);

  // Metronome tick
  if (state.metronome) {
    const beatInterval = 60 / state.song.metadata.bpm;
    const currentBeat = Math.floor(state.currentTime / beatInterval);
    if (currentBeat > state.lastMetronomeBeat) {
      state.lastMetronomeBeat = currentBeat;
      audio.playSfx('metronome');
    }
  }

  // Mascot Bobbing effect
  const bpm = state.song.metadata.bpm;
  const beatProgress = (state.currentTime * (bpm / 60)) % 1;
  const bob = Math.sin(beatProgress * Math.PI * 2) * 5;
  document.getElementById('mascotAvatar').style.transform = `translateY(${bob}px)`;

  updateTimeDisplays();
  updateTimelineCanvas();

  requestAnimationFrame(transportLoop);
}

function checkAndTriggerSynthEvents(prevTime, currTime) {
  const synth = state.song.synthAudio;
  if (!synth) return;

  if (synth.chords) {
    synth.chords.forEach(c => {
      if (c.time >= prevTime && c.time < currTime) audio.playChord(c.chord, c.duration);
    });
  }
  if (synth.bass) {
    synth.bass.forEach(b => {
      if (b.time >= prevTime && b.time < currTime) audio.playBass(b.pitch, b.duration);
    });
  }
  if (synth.drums) {
    synth.drums.forEach(d => {
      if (d.time >= prevTime && d.time < currTime) audio.playDrum(d.type);
    });
  }
}

function checkAndTriggerNoteSfx(prevTime, currTime) {
  state.song.notes.forEach(note => {
    if (note.time >= prevTime && note.time < currTime) {
      audio.playSfx(note.sound || LANES[note.lane].sfx);
    }
  });
}

function updateTimeDisplays() {
  document.getElementById('readoutCurrentTime').textContent = formatTimePrecise(state.currentTime);

  // Calculate Bar & Beat
  const secondsPerBeat = 60 / state.song.metadata.bpm;
  const totalBeats = state.currentTime / secondsPerBeat;
  const bar = Math.floor(totalBeats / 4) + 1;
  const beatInBar = (totalBeats % 4) + 1;

  document.getElementById('readoutBarBeat').textContent = `Bar ${bar} • Beat ${beatInBar.toFixed(2)}`;
}

/* ===================================================================
   4. TIMELINE MULTI-LANE CANVAS DAW
   =================================================================== */

function updateTimelineCanvas() {
  const canvas = document.getElementById('timelineCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const bpm = state.song.metadata.bpm;
  const duration = state.song.metadata.duration;
  const pixelsPerSecond = 140 * state.zoom;
  const totalWidth = Math.max(1400, Math.ceil(duration * pixelsPerSecond + 260));

  if (canvas.width !== totalWidth) {
    canvas.width = totalWidth;
  }

  const w = canvas.width;
  const h = canvas.height;
  const headerHeight = 38;
  const laneHeight = (h - headerHeight) / 4;

  // Background
  ctx.fillStyle = '#1c140d';
  ctx.fillRect(0, 0, w, h);

  // Time Ruler Top Header
  ctx.fillStyle = '#2c1e13';
  ctx.fillRect(0, 0, w, headerHeight);
  ctx.strokeStyle = '#5a3d24';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, headerHeight);
  ctx.lineTo(w, headerHeight);
  ctx.stroke();

  // Grid Lines calculation (Beats & Sub-beats)
  const secondsPerBeat = 60 / bpm;
  const snapInterval = secondsPerBeat / state.snapDiv;
  const totalSnaps = Math.ceil(duration / snapInterval);

  for (let s = 0; s <= totalSnaps; s++) {
    const snapTime = s * snapInterval;
    const x = snapTime * pixelsPerSecond;
    const isQuarterBeat = s % state.snapDiv === 0;
    const isBar = s % (state.snapDiv * 4) === 0;

    // Line style
    if (isBar) {
      ctx.strokeStyle = '#a46d3e';
      ctx.lineWidth = 2;
    } else if (isQuarterBeat) {
      ctx.strokeStyle = '#6d4321';
      ctx.lineWidth = 1.2;
    } else {
      ctx.strokeStyle = '#322013';
      ctx.lineWidth = 0.8;
    }

    ctx.beginPath();
    ctx.moveTo(x, isBar ? 0 : headerHeight);
    ctx.lineTo(x, h);
    ctx.stroke();

    // Bar number & Time label on Bar lines
    if (isBar && x < w - 60) {
      const barNum = Math.floor(s / (state.snapDiv * 4)) + 1;
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(`BAR ${barNum}`, x + 6, 16);

      ctx.fillStyle = '#d4bda8';
      ctx.font = '10px sans-serif';
      ctx.fillText(`${snapTime.toFixed(1)}s`, x + 6, 30);
    }
  }

  // Draw 4 Lanes Background & Dividers
  for (let i = 0; i < 4; i++) {
    const ly = headerHeight + i * laneHeight;

    // Alternate lane background tint
    if (i % 2 === 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.015)';
      ctx.fillRect(0, ly, w, laneHeight);
    }

    ctx.strokeStyle = '#3e2817';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, ly);
    ctx.lineTo(w, ly);
    ctx.stroke();
  }

  // Draw Notes
  state.song.notes.forEach(note => {
    const nx = note.time * pixelsPerSecond;
    const ny = headerHeight + note.lane * laneHeight + 6;
    const nh = laneHeight - 12;
    const laneConfig = LANES[note.lane];
    const isSelected = note.id === state.selectedNoteId;

    ctx.save();

    // If hold note, draw tail
    if (note.type === 'hold') {
      const holdW = (note.duration || 1.0) * pixelsPerSecond;
      ctx.fillStyle = isSelected ? 'rgba(251, 191, 36, 0.65)' : 'rgba(245, 158, 11, 0.35)';
      ctx.fillRect(nx, ny, holdW, nh);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.strokeRect(nx, ny, holdW, nh);
    }

    // Main Note Block
    ctx.fillStyle = isSelected ? '#ffffff' : laneConfig.color;
    ctx.shadowColor = laneConfig.color;
    ctx.shadowBlur = isSelected ? 16 : 6;

    const blockWidth = 32;
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(nx - blockWidth / 2, ny, blockWidth, nh, 8);
      ctx.fill();
    } else {
      ctx.fillRect(nx - blockWidth / 2, ny, blockWidth, nh);
    }

    // Border if selected
    if (isSelected) {
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Icon inside note
    ctx.shadowBlur = 0;
    ctx.fillStyle = isSelected ? '#000000' : '#ffffff';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(laneConfig.icon, nx, ny + nh / 2);

    ctx.restore();
  });

  // Audio Playhead Needle (Scrubber)
  const playheadX = state.currentTime * pixelsPerSecond;
  ctx.strokeStyle = '#f43f5e';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(playheadX, 0);
  ctx.lineTo(playheadX, h);
  ctx.stroke();

  // Playhead Pointer Cap
  ctx.fillStyle = '#f43f5e';
  ctx.beginPath();
  ctx.moveTo(playheadX - 8, 0);
  ctx.lineTo(playheadX + 8, 0);
  ctx.lineTo(playheadX, 14);
  ctx.closePath();
  ctx.fill();
}

function handleTimelineCanvasClick(e) {
  const canvas = document.getElementById('timelineCanvas');
  const rect = canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;

  const pixelsPerSecond = 140 * state.zoom;
  const headerHeight = 38;
  const laneHeight = (canvas.height - headerHeight) / 4;

  // 1. Click on Header Ruler: Scrub audio position
  if (clickY <= headerHeight) {
    const targetTime = Math.max(0, Math.min(state.song.metadata.duration, clickX / pixelsPerSecond));
    state.currentTime = targetTime;
    const customAudio = document.getElementById('customAudioElement');
    if (state.isCustomAudio && customAudio.src) customAudio.currentTime = targetTime;
    updateTimeDisplays();
    updateTimelineCanvas();
    return;
  }

  // 2. Click in Lanes: Select, Add, or Move Note
  const clickedLane = Math.floor((clickY - headerHeight) / laneHeight);
  if (clickedLane < 0 || clickedLane > 3) return;

  const rawTime = clickX / pixelsPerSecond;
  const secondsPerBeat = 60 / state.song.metadata.bpm;
  const snapInterval = secondsPerBeat / state.snapDiv;
  const snappedTime = Math.round(rawTime / snapInterval) * snapInterval;

  // Check if clicked directly on an existing note
  const existingNote = state.song.notes.find(n => n.lane === clickedLane && Math.abs(n.time - rawTime) * pixelsPerSecond < 20);

  if (existingNote) {
    // Select this note
    state.selectedNoteId = existingNote.id;
    audio.playSfx(existingNote.sound || LANES[existingNote.lane].sfx);
    updateInspector();
    updateTimelineCanvas();
  } else {
    // Insert new note of currently selected tool
    const newNote = {
      id: Date.now(),
      time: parseFloat(snappedTime.toFixed(3)),
      lane: clickedLane,
      type: state.selectedTool,
      sound: LANES[clickedLane].sfx
    };
    if (state.selectedTool === 'hold') {
      newNote.duration = parseFloat(state.holdDuration) || 1.0;
    }

    state.song.notes.push(newNote);
    state.song.notes.sort((a, b) => a.time - b.time);
    state.selectedNoteId = newNote.id;

    audio.playSfx(newNote.sound);
    showToast(`🍊 Note ditambah di Lane ${clickedLane} (${snappedTime.toFixed(2)}s)`);

    updateUIElements();
    updateInspector();
    updateTimelineCanvas();
  }
}

function handleTimelineCanvasDblClick(e) {
  const canvas = document.getElementById('timelineCanvas');
  const rect = canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;

  const pixelsPerSecond = 140 * state.zoom;
  const headerHeight = 38;
  const laneHeight = (canvas.height - headerHeight) / 4;
  if (clickY <= headerHeight) return;

  const clickedLane = Math.floor((clickY - headerHeight) / laneHeight);
  const rawTime = clickX / pixelsPerSecond;

  const noteIndex = state.song.notes.findIndex(n => n.lane === clickedLane && Math.abs(n.time - rawTime) * pixelsPerSecond < 22);
  if (noteIndex !== -1) {
    const deleted = state.song.notes.splice(noteIndex, 1)[0];
    if (state.selectedNoteId === deleted.id) state.selectedNoteId = null;
    audio.playSfx('water_splash');
    showToast(`🗑️ Note pada ${deleted.time}s dihapus.`);
    updateUIElements();
    updateInspector();
    updateTimelineCanvas();
  }
}

/* ===================================================================
   5. NOTE INSPECTOR (EDIT SELECTED NOTE)
   =================================================================== */

function updateInspector() {
  const container = document.getElementById('inspectorContent');
  if (!state.selectedNoteId) {
    container.className = 'inspector-empty';
    container.innerHTML = '<p>Klik salah satu note di timeline untuk mengedit waktu, jalur, atau menghapusnya.</p>';
    return;
  }

  const note = state.song.notes.find(n => n.id === state.selectedNoteId);
  if (!note) {
    state.selectedNoteId = null;
    updateInspector();
    return;
  }

  container.className = 'inspector-data';
  container.innerHTML = `
    <div class="inspector-field">
      <label>Waktu (detik):</label>
      <input type="number" id="inspTimeInput" class="form-input-sm" value="${note.time}" step="0.05" min="0">
    </div>
    <div class="inspector-field">
      <label>Jalur (Lane):</label>
      <select id="inspLaneSelect" class="form-select-sm">
        <option value="0" ${note.lane === 0 ? 'selected' : ''}>🍊 Lane 0 (Yuzu)</option>
        <option value="1" ${note.lane === 1 ? 'selected' : ''}>💧 Lane 1 (Onsen)</option>
        <option value="2" ${note.lane === 2 ? 'selected' : ''}>🐾 Lane 2 (Paw)</option>
        <option value="3" ${note.lane === 3 ? 'selected' : ''}>⭐ Lane 3 (Citrus)</option>
      </select>
    </div>
    <div class="inspector-field">
      <label>Tipe Note:</label>
      <select id="inspTypeSelect" class="form-select-sm">
        <option value="tap" ${note.type === 'tap' ? 'selected' : ''}>Tap</option>
        <option value="hold" ${note.type === 'hold' ? 'selected' : ''}>Hold</option>
        <option value="burst" ${note.type === 'burst' ? 'selected' : ''}>Burst</option>
      </select>
    </div>
    ${note.type === 'hold' ? `
    <div class="inspector-field">
      <label>Durasi Tahan:</label>
      <input type="number" id="inspDurationInput" class="form-input-sm" value="${note.duration || 1.0}" step="0.1" min="0.2">
    </div>` : ''}
    <div style="display: flex; gap: 6px; margin-top: 6px;">
      <button class="btn btn-xs btn-primary btn-block" id="btnInspApply">Terapkan</button>
      <button class="btn btn-xs btn-danger btn-block" id="btnInspDelete">Hapus</button>
    </div>
  `;

  document.getElementById('btnInspApply').addEventListener('click', () => {
    note.time = parseFloat(document.getElementById('inspTimeInput').value) || note.time;
    note.lane = parseInt(document.getElementById('inspLaneSelect').value);
    note.type = document.getElementById('inspTypeSelect').value;
    note.sound = LANES[note.lane].sfx;
    if (note.type === 'hold') {
      const dInput = document.getElementById('inspDurationInput');
      note.duration = dInput ? (parseFloat(dInput.value) || 1.0) : 1.0;
    }
    state.song.notes.sort((a, b) => a.time - b.time);
    showToast('✅ Note diperbarui.');
    updateInspector();
    updateTimelineCanvas();
  });

  document.getElementById('btnInspDelete').addEventListener('click', () => {
    const idx = state.song.notes.findIndex(n => n.id === note.id);
    if (idx !== -1) {
      state.song.notes.splice(idx, 1);
      state.selectedNoteId = null;
      audio.playSfx('water_splash');
      showToast('🗑️ Note dihapus.');
      updateUIElements();
      updateInspector();
      updateTimelineCanvas();
    }
  });
}

/* ===================================================================
   6. BATCH OPERATIONS & BPM TAP
   =================================================================== */

function mirrorLanes() {
  state.song.notes.forEach(n => {
    n.lane = 3 - n.lane;
    n.sound = LANES[n.lane].sfx;
  });
  updateTimelineCanvas();
  updateInspector();
  showToast('🪞 Jalur note berhasil dicerminkan (Mirrored)!');
}

function shiftNotesForward() {
  const secondsPerBeat = 60 / state.song.metadata.bpm;
  state.song.notes.forEach(n => {
    n.time = parseFloat((n.time + secondsPerBeat).toFixed(3));
  });
  updateTimelineCanvas();
  updateInspector();
  showToast(`⏩ Semua note digeser maju 1 beat (+${secondsPerBeat.toFixed(2)}s).`);
}

function clearAllNotes() {
  if (confirm('Hapus semua note di lagu ini?')) {
    state.song.notes = [];
    state.selectedNoteId = null;
    updateUIElements();
    updateInspector();
    updateTimelineCanvas();
    showToast('🗑️ Semua note telah dikosongkan.');
  }
}

function createBlankMap() {
  const blank = {
    formatVersion: "capybara-go-v1",
    metadata: {
      title: "Map Baru Capybara",
      artist: "Pencipta",
      genre: "Rhythm",
      bpm: 96,
      duration: 30.0,
      difficulty: "Normal",
      author: "Editor",
      description: "Map kosong siap edit."
    },
    synthAudio: { enabled: false },
    notes: []
  };
  loadSong(blank);
  showToast('📄 Map baru berhasil dibuat!');
}

function handleBpmTap() {
  const now = performance.now();
  state.tapBpmTimes.push(now);
  if (state.tapBpmTimes.length > 6) state.tapBpmTimes.shift();

  if (state.tapBpmTimes.length >= 2) {
    const intervals = [];
    for (let i = 1; i < state.tapBpmTimes.length; i++) {
      intervals.push(state.tapBpmTimes[i] - state.tapBpmTimes[i - 1]);
    }
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const detectedBpm = Math.round(60000 / avgInterval);
    if (detectedBpm >= 40 && detectedBpm <= 240) {
      document.getElementById('bpmDetectVal').textContent = detectedBpm;
    }
  }
}

/* ===================================================================
   7. FILE IMPORT, EXPORT, & AUDIO UPLOAD
   =================================================================== */

function handleJsonUpload(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (!parsed.notes || !parsed.metadata) {
        throw new Error('File tidak memiliki struktur beatmap Capybara Go yang valid.');
      }
      loadSong(parsed);
      closeAllModals();
      showToast(`📁 File script "${file.name}" berhasil dimuat!`);
    } catch (err) {
      alert(`Gagal memuat file JSON: ${err.message}`);
    }
  };
  reader.readAsText(file);
}

function handleAudioUpload(file) {
  if (!file) return;
  const audioElem = document.getElementById('customAudioElement');
  if (state.customAudioUrl) {
    URL.revokeObjectURL(state.customAudioUrl);
  }
  state.customAudioUrl = URL.createObjectURL(file);
  state.isCustomAudio = true;

  audioElem.src = state.customAudioUrl;
  audioElem.onloadedmetadata = () => {
    state.song.metadata.duration = Math.round(audioElem.duration);
    document.getElementById('audioStatusDot').style.background = '#38bdf8';
    document.getElementById('audioStatusLabel').textContent = `Audio: ${file.name.substring(0, 18)}...`;
    updateUIElements();
    updateTimelineCanvas();
    closeAllModals();
    showToast(`🎵 Lagu audio "${file.name}" berhasil dipasang!`);
  };
}

function exportSongAsJson() {
  const jsonStr = JSON.stringify(state.song, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeTitle = state.song.metadata.title.toLowerCase().replace(/[^a-z0-9]/g, '-');
  a.href = url;
  a.download = `${safeTitle}-capy-beatmap.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('💾 File JSON berhasil diunduh!');
}

function copyJsonToClipboard() {
  const jsonStr = JSON.stringify(state.song, null, 2);
  navigator.clipboard.writeText(jsonStr).then(() => {
    showToast('📋 Script JSON berhasil disalin ke clipboard!');
  }).catch(() => {
    alert('Gagal menyalin ke clipboard.');
  });
}

/* ===================================================================
   8. AI AUTO-MAPPER ENGINE
   =================================================================== */

function initAiConfig() {
  const savedKey = localStorage.getItem('capy_ai_key');
  const savedProvider = localStorage.getItem('capy_ai_provider');
  if (savedKey) document.getElementById('aiApiKeyInput').value = savedKey;
  if (savedProvider) document.getElementById('aiProviderSelect').value = savedProvider;
}

function saveAiConfig() {
  const key = document.getElementById('aiApiKeyInput').value.trim();
  const provider = document.getElementById('aiProviderSelect').value;
  localStorage.setItem('capy_ai_key', key);
  localStorage.setItem('capy_ai_provider', provider);
}

function updatePromptTemplateText() {
  const title = document.getElementById('aiSongTitle') ? document.getElementById('aiSongTitle').value : "Capybara River Dance";
  const bpm = document.getElementById('aiBpm') ? document.getElementById('aiBpm').value : "96";
  const duration = document.getElementById('aiDuration') ? document.getElementById('aiDuration').value : "30";
  const difficulty = document.getElementById('aiDifficulty') ? document.getElementById('aiDifficulty').value : "Normal";

  const template = `Kamu adalah Rhythm Game Composer & Level Designer untuk game "Capybara Go".
Buat script beatmap dan musik sintetis format JSON murni yang valid tanpa teks pembuka/penutup.

Tema lagu: ${title}
BPM: ${bpm}
Durasi: ${duration} detik
Tingkat Kesulitan: ${difficulty}

ATURAN WAJIB STRUKTUR JSON:
1. "formatVersion": "capybara-go-v1"
2. "metadata": { "title": "${title}", "artist": "AI Capy Composer", "genre": "Cozy Onsen", "bpm": ${bpm}, "duration": ${duration}, "difficulty": "${difficulty}", "author": "AI", "description": "Lagu santai Capybara." }
3. "synthAudio": {
     "enabled": true,
     "tempo": ${bpm},
     "chords": [ { "time": 0.0, "chord": ["C4", "E4", "G4"], "duration": 2.5 } ],
     "bass": [ { "time": 0.0, "pitch": "C2", "duration": 1.25 } ],
     "drums": [ { "time": 0.0, "type": "kick" }, { "time": 0.625, "type": "snare" } ]
   }
4. "notes": [
     { "id": 1, "time": 1.25, "lane": 0, "type": "tap", "sound": "yuzu_pop" },
     { "id": 2, "time": 1.875, "lane": 1, "type": "tap", "sound": "water_splash" },
     { "id": 3, "time": 2.5, "lane": 2, "type": "tap", "sound": "paw_tap" },
     { "id": 4, "time": 3.125, "lane": 3, "type": "burst", "sound": "citrus_burst" }
   ]

Catatan teknis:
- Lane 0 = D (Yuzu Oranye), Lane 1 = F (Air Onsen), Lane 2 = J (Jejak Paw), Lane 3 = K (Jeruk Emas).
- Waktu "time" dihitung presisi dari BPM (${(60/bpm).toFixed(3)}s per beat).
- Berikan HANYA raw JSON!`;

  const textarea = document.getElementById('aiPromptTextArea');
  if (textarea) textarea.value = template;
}

async function runAiGeneration() {
  saveAiConfig();
  const apiKey = document.getElementById('aiApiKeyInput').value.trim();
  const provider = document.getElementById('aiProviderSelect').value;

  if (!apiKey) {
    showToast('⚠️ Masukkan API Key kamu dulu, atau klik "Buat Otomatis Tanpa API Key"!');
    return;
  }

  const title = document.getElementById('aiSongTitle').value.trim() || 'Capybara Dance';
  const bpm = parseInt(document.getElementById('aiBpm').value) || 96;
  const duration = parseInt(document.getElementById('aiDuration').value) || 30;
  const difficulty = document.getElementById('aiDifficulty').value;
  const density = document.getElementById('aiDensity').value;

  const statusBox = document.getElementById('aiStatusBox');
  const statusText = document.getElementById('aiStatusText');
  statusBox.style.display = 'flex';
  statusText.textContent = `Menghubungi ${provider.toUpperCase()} untuk mengkomposisi beatmap "${title}"...`;

  const systemInstruction = `You are an expert rhythm game designer for "Capybara Go". Generate a valid JSON beatmap adhering strictly to formatVersion "capybara-go-v1". No markdown codeblocks, only pure JSON.`;
  const userPrompt = `Create a complete Capybara Go rhythm beatmap and synthetic audio tracks:
Title: "${title}", BPM: ${bpm}, Duration: ${duration} seconds, Difficulty: "${difficulty}", Density: "${density}".
Make sure synthAudio has rich chords, warm bassline, and drum beats. Place notes (lanes 0 to 3) synchronized to the beats.`;

  try {
    let resultJson = null;

    if (provider === 'gemini') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      const payload = {
        contents: [{ role: 'user', parts: [{ text: `${systemInstruction}\n\n${userPrompt}` }] }],
        generationConfig: { response_mime_type: "application/json" }
      };

      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error?.message || `HTTP ${resp.status}`);
      }

      const data = await resp.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      resultJson = JSON.parse(rawText.replace(/```json/g, '').replace(/```/g, '').trim());

    } else if (provider === 'openai') {
      const url = 'https://api.openai.com/v1/chat/completions';
      const payload = {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' }
      };

      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload)
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error?.message || `HTTP ${resp.status}`);
      }

      const data = await resp.json();
      resultJson = JSON.parse(data.choices[0].message.content);
    }

    if (resultJson && resultJson.notes && resultJson.metadata) {
      loadSong(resultJson);
      closeAllModals();
      showToast(`✨ Sukses! Lagu AI "${resultJson.metadata.title}" telah dimuat!`);
    } else {
      throw new Error('Format output JSON dari AI tidak sesuai skema.');
    }

  } catch (err) {
    console.error('AI Gen Error:', err);
    alert(`Gagal generate via AI: ${err.message}\n\nTips: Periksa API Key atau gunakan tombol "Generator Algoritmik (Tanpa API Key)".`);
  } finally {
    statusBox.style.display = 'none';
  }
}

function runProceduralGeneration() {
  const title = document.getElementById('aiSongTitle').value.trim() || 'Capybara Valley Trek';
  const bpm = parseInt(document.getElementById('aiBpm').value) || 96;
  const duration = parseInt(document.getElementById('aiDuration').value) || 30;
  const difficulty = document.getElementById('aiDifficulty').value;
  const density = document.getElementById('aiDensity').value;

  const secondsPerBeat = 60 / bpm;
  const totalBeats = Math.floor(duration / secondsPerBeat);

  const chordOptions = [
    { chord: ["C4", "E4", "G4", "B4"], bass: "C2" },
    { chord: ["A3", "C4", "E4", "G4"], bass: "A2" },
    { chord: ["F3", "A3", "C4", "E4"], bass: "F2" },
    { chord: ["G3", "B3", "D4", "F4"], bass: "G2" }
  ];

  const chords = [];
  const bass = [];
  const drums = [];
  const notes = [];
  let noteId = 1;

  for (let b = 0; b < totalBeats; b += 4) {
    const chordIdx = Math.floor((b / 4) % chordOptions.length);
    const chosen = chordOptions[chordIdx];
    const time = parseFloat((b * secondsPerBeat).toFixed(3));
    const chordDuration = parseFloat((secondsPerBeat * 4).toFixed(3));

    chords.push({ time, chord: chosen.chord, duration: chordDuration });
    bass.push({ time, pitch: chosen.bass, duration: chordDuration / 2 });
    bass.push({ time: parseFloat((time + chordDuration / 2).toFixed(3)), pitch: chosen.bass, duration: chordDuration / 2 });
  }

  let stepDiv = density === 'dense' ? 0.5 : (density === 'relaxed' ? 2 : 1);
  if (difficulty === 'Hard' || difficulty === 'Master') stepDiv = 0.5;

  let currentLane = 0;
  for (let b = 1; b < totalBeats - 1; b += stepDiv) {
    const time = parseFloat((b * secondsPerBeat).toFixed(3));

    if (b % 2 === 0) drums.push({ time, type: 'kick' });
    else if (b % 2 === 1) drums.push({ time, type: 'snare' });

    if (Math.random() > 0.18) {
      currentLane = (currentLane + Math.floor(Math.random() * 3) + 1) % 4;
      const typeRand = Math.random();
      let type = 'tap';
      let durationHold = undefined;

      if (typeRand > 0.82 && b + 1.5 < totalBeats) {
        type = 'hold';
        durationHold = parseFloat((secondsPerBeat * 1.5).toFixed(2));
      } else if (typeRand > 0.7) {
        type = 'burst';
      }

      const noteObj = {
        id: noteId++,
        time: time,
        lane: currentLane,
        type: type,
        sound: LANES[currentLane].sfx
      };
      if (durationHold) noteObj.duration = durationHold;

      notes.push(noteObj);
    }
  }

  const generatedSong = {
    formatVersion: "capybara-go-v1",
    metadata: {
      title: title,
      artist: "Capy Procedural Composer",
      genre: "Algorithmic Onsen",
      bpm: bpm,
      duration: duration,
      difficulty: difficulty,
      author: "Procedural",
      description: `Lagu ${difficulty} dibuat otomatis menggunakan Capy Algorithm Engine.`
    },
    synthAudio: {
      enabled: true,
      tempo: bpm,
      chords: chords,
      bass: bass,
      drums: drums
    },
    notes: notes
  };

  loadSong(generatedSong);
  closeAllModals();
  showToast(`🎲 Map "${title}" berhasil dibuat secara otomatis!`);
}

/* ===================================================================
   9. MODALS, TOAST, & UI HELPERS
   =================================================================== */

function openUploadModal() {
  document.getElementById('uploadModalOverlay').classList.add('active');
}

function openAiModal() {
  document.getElementById('aiModalOverlay').classList.add('active');
  updatePromptTemplateText();
}

function closeAllModals() {
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
}

function showToast(message) {
  const toast = document.getElementById('capyToast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => toast.classList.remove('show'), 2600);
}

function formatTimePrecise(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
}

/* ===================================================================
   10. INITIALIZATION ON DOM READY
   =================================================================== */

window.addEventListener('DOMContentLoaded', () => {
  // 1. Initial Load Preset
  loadSong(PRESET_ONSEN, false);
  initAiConfig();

  // 2. Transport Bar Buttons
  document.getElementById('btnTransportPlay').addEventListener('click', togglePlayback);
  document.getElementById('btnTransportStop').addEventListener('click', stopPlayback);

  document.getElementById('btnToggleSynthMute').addEventListener('click', () => {
    state.synthMuted = !state.synthMuted;
    audio.setSynthMuted(state.synthMuted);
    document.getElementById('btnToggleSynthMute').textContent = state.synthMuted ? '🔇 Bisu' : '🔊 Suara';
    showToast(state.synthMuted ? '🔇 Audio musik dibisukan' : '🔊 Audio musik diaktifkan');
  });

  // 3. Canvas Click Events
  const canvas = document.getElementById('timelineCanvas');
  canvas.addEventListener('click', handleTimelineCanvasClick);
  canvas.addEventListener('dblclick', handleTimelineCanvasDblClick);

  // 4. Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
    if (e.code === 'Space') {
      e.preventDefault();
      togglePlayback();
    } else if (e.code === 'Delete' || e.code === 'Backspace') {
      if (state.selectedNoteId) {
        const idx = state.song.notes.findIndex(n => n.id === state.selectedNoteId);
        if (idx !== -1) {
          state.song.notes.splice(idx, 1);
          state.selectedNoteId = null;
          updateUIElements();
          updateInspector();
          updateTimelineCanvas();
          showToast('🗑️ Note dihapus.');
        }
      }
    }
  });

  // 5. Tool Selection (Tap, Hold, Burst)
  document.querySelectorAll('.tool-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.tool-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      state.selectedTool = card.dataset.tool;

      const holdSettings = document.getElementById('holdDurationSettings');
      holdSettings.style.display = state.selectedTool === 'hold' ? 'flex' : 'none';
    });
  });

  document.getElementById('holdDurationInput').addEventListener('input', (e) => {
    state.holdDuration = parseFloat(e.target.value) || 1.0;
  });

  // 6. Grid Snapping & Zoom
  document.getElementById('editSnapSelect').addEventListener('change', (e) => {
    state.snapDiv = parseInt(e.target.value);
    updateTimelineCanvas();
  });

  document.getElementById('btnZoomIn').addEventListener('click', () => {
    state.zoom = Math.min(3.0, state.zoom + 0.25);
    document.getElementById('zoomDisplay').textContent = `${state.zoom.toFixed(1)}x`;
    updateTimelineCanvas();
  });

  document.getElementById('btnZoomOut').addEventListener('click', () => {
    state.zoom = Math.max(0.5, state.zoom - 0.25);
    document.getElementById('zoomDisplay').textContent = `${state.zoom.toFixed(1)}x`;
    updateTimelineCanvas();
  });

  document.getElementById('checkMetronome').addEventListener('change', (e) => {
    state.metronome = e.target.checked;
  });

  // 7. Song Settings & Tap BPM
  document.getElementById('inputBpm').addEventListener('change', (e) => {
    const bpm = parseInt(e.target.value) || 96;
    state.song.metadata.bpm = bpm;
    if (state.song.synthAudio) state.song.synthAudio.tempo = bpm;
    updateUIElements();
    updateTimelineCanvas();
    showToast(`🥁 BPM diubah ke ${bpm}`);
  });

  document.getElementById('inputDuration').addEventListener('change', (e) => {
    const dur = parseFloat(e.target.value) || 30;
    state.song.metadata.duration = dur;
    updateUIElements();
    updateTimelineCanvas();
  });

  document.getElementById('btnTapBpm').addEventListener('click', handleBpmTap);
  document.getElementById('btnApplyBpm').addEventListener('click', () => {
    const detected = parseInt(document.getElementById('bpmDetectVal').textContent);
    if (detected) {
      state.song.metadata.bpm = detected;
      if (state.song.synthAudio) state.song.synthAudio.tempo = detected;
      document.getElementById('inputBpm').value = detected;
      updateUIElements();
      updateTimelineCanvas();
      showToast(`🥁 BPM diterapkan: ${detected}`);
    }
  });

  // 8. Batch Operations
  document.getElementById('btnMirrorLanes').addEventListener('click', mirrorLanes);
  document.getElementById('btnShiftNotesForward').addEventListener('click', shiftNotesForward);
  document.getElementById('btnClearAllNotes').addEventListener('click', clearAllNotes);

  // 9. Quick Presets
  document.getElementById('btnLoadPresetOnsen').addEventListener('click', () => {
    loadSong(PRESET_ONSEN);
    document.querySelectorAll('.preset-pill').forEach(p => p.classList.remove('active'));
    document.getElementById('btnLoadPresetOnsen').classList.add('active');
  });

  document.getElementById('btnLoadPresetRush').addEventListener('click', () => {
    loadSong(PRESET_RUSH);
    document.querySelectorAll('.preset-pill').forEach(p => p.classList.remove('active'));
    document.getElementById('btnLoadPresetRush').classList.add('active');
  });

  document.getElementById('btnCreateBlankMap').addEventListener('click', createBlankMap);

  // 10. Modals Trigger
  document.getElementById('btnOpenUploadModal').addEventListener('click', openUploadModal);
  document.getElementById('btnCloseUploadModal').addEventListener('click', closeAllModals);
  document.getElementById('btnOpenAiModal').addEventListener('click', openAiModal);
  document.getElementById('btnCloseAiModal').addEventListener('click', closeAllModals);

  // Modal backdrop click to close
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeAllModals();
    });
  });

  // 11. Upload File Triggers
  document.getElementById('btnPickJsonFile').addEventListener('click', () => {
    document.getElementById('fileInputJson').click();
  });
  document.getElementById('fileInputJson').addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleJsonUpload(e.target.files[0]);
  });

  document.getElementById('btnPickAudioFile').addEventListener('click', () => {
    document.getElementById('fileInputAudio').click();
  });
  document.getElementById('fileInputAudio').addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleAudioUpload(e.target.files[0]);
  });

  // Drag and Drop support
  const dropJson = document.getElementById('dropZoneJson');
  dropJson.addEventListener('dragover', (e) => { e.preventDefault(); dropJson.classList.add('hover'); });
  dropJson.addEventListener('dragleave', () => dropJson.classList.remove('hover'));
  dropJson.addEventListener('drop', (e) => {
    e.preventDefault();
    dropJson.classList.remove('hover');
    if (e.dataTransfer.files.length > 0) handleJsonUpload(e.dataTransfer.files[0]);
  });

  const dropAudio = document.getElementById('dropZoneAudio');
  dropAudio.addEventListener('dragover', (e) => { e.preventDefault(); dropAudio.classList.add('hover'); });
  dropAudio.addEventListener('dragleave', () => dropAudio.classList.remove('hover'));
  dropAudio.addEventListener('drop', (e) => {
    e.preventDefault();
    dropAudio.classList.remove('hover');
    if (e.dataTransfer.files.length > 0) handleAudioUpload(e.dataTransfer.files[0]);
  });

  // 12. Export Buttons
  document.getElementById('btnExportJsonFile').addEventListener('click', exportSongAsJson);
  document.getElementById('btnModalExportJson').addEventListener('click', exportSongAsJson);
  document.getElementById('btnModalCopyJson').addEventListener('click', copyJsonToClipboard);

  // 13. AI Generator Controls
  document.getElementById('btnRunAiGenerate').addEventListener('click', runAiGeneration);
  document.getElementById('btnRunProceduralGenerate').addEventListener('click', runProceduralGeneration);

  document.getElementById('btnToggleApiKey').addEventListener('click', () => {
    const input = document.getElementById('aiApiKeyInput');
    input.type = input.type === 'password' ? 'text' : 'password';
  });

  ['aiSongTitle', 'aiBpm', 'aiDuration', 'aiDifficulty'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', updatePromptTemplateText);
  });

  document.getElementById('btnRefreshPromptTemplate').addEventListener('click', updatePromptTemplateText);
  document.getElementById('btnCopyPromptTemplate').addEventListener('click', () => {
    const text = document.getElementById('aiPromptTextArea').value;
    navigator.clipboard.writeText(text).then(() => {
      showToast('📋 Master Prompt berhasil disalin!');
    });
  });

  document.getElementById('btnApplyPastedJson').addEventListener('click', () => {
    const val = document.getElementById('aiPasteJsonInput').value.trim();
    if (!val) {
      showToast('⚠️ Tempel JSON dari AI terlebih dahulu!');
      return;
    }
    try {
      const parsed = JSON.parse(val.replace(/```json/g, '').replace(/```/g, '').trim());
      loadSong(parsed);
      closeAllModals();
      showToast('📥 Berhasil memuat script JSON hasil AI!');
    } catch (e) {
      alert(`Format JSON tidak valid: ${e.message}`);
    }
  });

  // Initial draw
  updateTimelineCanvas();
});
