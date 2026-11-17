/**
 * ===================================================================
 * Capybara Studio — Master Pro Beatmap DAW Application
 * Architected for Precision Timing, Multi-Track Sequencing & AI Mapping
 * ===================================================================
 */

// Application Global State
const state = {
  isPlaying: false,
  currentTime: 0,
  playbackSpeed: 1.0,
  audioMuted: false,
  selectedTool: 'tap', // 'tap', 'hold', 'burst'
  holdDuration: 1.0,
  snapDiv: 4, // 1/4 beat default
  zoom: 1.0,
  metronome: true,
  lastMetronomeBeat: -1,
  selectedNoteId: null,
  tapBpmTimes: [],
  isCustomAudio: true,
  audioElement: null,

  // Active Song Data
  song: null
};

// 4 Tracks Identity Configuration
const TRACKS = [
  { index: 0, key: 'D', name: 'Yuzu', color: '#f59e0b', sfx: 'yuzu_pop', icon: '🍊' },
  { index: 1, key: 'F', name: 'Onsen', color: '#00b4d8', sfx: 'water_splash', icon: '💧' },
  { index: 2, key: 'J', name: 'Paw', color: '#10b981', sfx: 'paw_tap', icon: '🐾' },
  { index: 3, key: 'K', name: 'Citrus', color: '#f43f5e', sfx: 'citrus_burst', icon: '⭐' }
];

// Synth Frequencies
const NOTE_FREQS = {
  'C2': 65.41, 'D2': 73.42, 'E2': 82.41, 'F2': 87.31, 'F#2': 92.50, 'G2': 98.00, 'A2': 110.00, 'B2': 123.47,
  'B1': 61.74, 'G1': 49.00, 'A1': 55.00,
  'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
  'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'E4': 329.63, 'F4': 349.23, 'F#4': 369.99,
  'G4': 392.00, 'G#4': 415.30, 'A4': 440.00, 'A#4': 466.16, 'B4': 493.88,
  'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'G5': 783.99
};

/* ===================================================================
   1. AUDIO ENGINE & SOUND EFFECTS (WEB AUDIO API)
   =================================================================== */

class StudioAudioEngine {
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

  playSfx(type) {
    if (!this.ctx) this.init();
    if (state.audioMuted) return;
    const t = this.ctx.currentTime;

    switch (type) {
      case 'yuzu_pop': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(640, t);
        osc.frequency.exponentialRampToValueAtTime(140, t + 0.1);
        gain.gain.setValueAtTime(0.7, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.1);
        break;
      }
      case 'water_splash': {
        const bufferSize = this.ctx.sampleRate * 0.15;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.03));
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1400, t);
        filter.Q.value = 2.5;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
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
        osc.frequency.exponentialRampToValueAtTime(70, t + 0.08);
        gain.gain.setValueAtTime(0.8, t);
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
          const startTime = t + i * 0.03;
          gain.gain.setValueAtTime(0.3, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);
          osc.connect(gain);
          gain.connect(this.sfxGain);
          osc.start(startTime);
          osc.stop(startTime + 0.3);
        });
        break;
      }
      case 'warm_onsen': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(329.63, t);
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.35);
        break;
      }
      case 'metronome': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, t);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.03);
        break;
      }
    }
  }

  playChord(frequencies, duration = 1.5) {
    if (!this.ctx || state.audioMuted) return;
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
    if (!this.ctx || state.audioMuted) return;
    const freq = NOTE_FREQS[pitchName];
    if (!freq) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(gain);
    gain.connect(this.synthGain);
    osc.start(t);
    osc.stop(t + duration);
  }

  playDrum(type) {
    if (!this.ctx || state.audioMuted) return;
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
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      noise.connect(gain);
      gain.connect(this.synthGain);
      noise.start(t);
    }
  }
}

const audio = new StudioAudioEngine();

/* ===================================================================
   2. SONG PRESETS & LOAD PIPELINE
   =================================================================== */

// Preset 1: Kimi no Na wa (Loaded from sample-kimi-no-na-wa.json or embedded)
let PRESET_KIMI_NO_NA_WA = null;

// Preset 2: Onsen Afternoon
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
    description: "Lagu santai berendam di air hangat onsen."
  },
  synthAudio: {
    enabled: true,
    tempo: 86,
    chords: [
      { time: 0.0, chord: ["C4", "E4", "G4", "B4"], duration: 2.79 },
      { time: 2.79, chord: ["A3", "C4", "E4", "G4"], duration: 2.79 },
      { time: 5.58, chord: ["F3", "A3", "C4", "E4"], duration: 2.79 },
      { time: 8.37, chord: ["G3", "B3", "D4", "F4"], duration: 2.79 }
    ],
    bass: [
      { time: 0.0, pitch: "C2", duration: 1.39 },
      { time: 1.39, pitch: "G2", duration: 1.39 }
    ],
    drums: [
      { time: 0.0, type: "kick" }, { time: 0.70, type: "snare" }
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
    { id: 9, time: 7.67, lane: 3, type: "burst", sound: "citrus_burst" }
  ]
};

// Preset 3: Citrus Rush
const PRESET_RUSH = {
  formatVersion: "capybara-go-v1",
  metadata: {
    title: "Capybara Citrus Rush!",
    artist: "DJ Capy & The Crew",
    genre: "Upbeat Dance",
    bpm: 132,
    duration: 30.0,
    difficulty: "Hard",
    author: "CapyDev",
    description: "Lagu cepat bersemangat."
  },
  synthAudio: { enabled: true, tempo: 132 },
  notes: [
    { id: 1, time: 0.91, lane: 0, type: "tap", sound: "yuzu_pop" },
    { id: 2, time: 1.36, lane: 1, type: "tap", sound: "paw_tap" },
    { id: 3, time: 1.82, lane: 2, type: "tap", sound: "water_splash" },
    { id: 4, time: 2.27, lane: 3, type: "burst", sound: "citrus_burst" }
  ]
};

async function initDefaultSong() {
  state.audioElement = document.getElementById('customAudioElement');

  try {
    const resp = await fetch('sample-kimi-no-na-wa.json');
    if (resp.ok) {
      PRESET_KIMI_NO_NA_WA = await resp.json();
    }
  } catch (e) {
    console.warn('Failed to fetch sample-kimi-no-na-wa.json:', e);
  }

  // Load Kimi no Na wa as primary default
  if (PRESET_KIMI_NO_NA_WA) {
    loadSong(PRESET_KIMI_NO_NA_WA, false);
    setupAudioTrack('audio/kimi-no-na-wa.mp3', 'RADWIMPS — Nandemonaiya (Kimi no Na wa)');
  } else {
    loadSong(PRESET_ONSEN, false);
  }
}

function loadSong(songData, notify = true) {
  state.song = JSON.parse(JSON.stringify(songData));
  state.song.notes.sort((a, b) => a.time - b.time);
  
  stopPlayback();
  state.currentTime = 0;
  state.selectedNoteId = null;

  // Sync inputs & HUD
  updateHeaderAndHUD();
  updateTimelineCanvas();
  updateInspector();

  if (notify) {
    showToast(`🌸 Map "${state.song.metadata.title}" dimuat!`);
  }
}

function setupAudioTrack(srcUrl, titleLabel) {
  if (!state.audioElement) state.audioElement = document.getElementById('customAudioElement');
  state.audioElement.src = srcUrl;
  state.isCustomAudio = true;

  state.audioElement.onloadedmetadata = () => {
    state.song.metadata.duration = Math.round(state.audioElement.duration);
    updateHeaderAndHUD();
    updateTimelineCanvas();
  };

  document.getElementById('footerAudioBadge').textContent = `🎵 Source: ${titleLabel || srcUrl}`;
}

function updateHeaderAndHUD() {
  const meta = state.song.metadata;
  document.getElementById('lcdTotalTime').textContent = formatTimePrecise(meta.duration);
  document.getElementById('lcdBpmBadge').textContent = `${meta.bpm} BPM`;
  document.getElementById('lcdNotesCount').textContent = `${state.song.notes.length} NOTES`;

  document.getElementById('inputBpm').value = meta.bpm;
  document.getElementById('inputDuration').value = meta.duration;
  document.getElementById('aiBpm').value = meta.bpm;
  document.getElementById('aiDuration').value = meta.duration;

  updatePromptTemplateText();
}

/* ===================================================================
   3. TRANSPORT PLAYBACK & SYNCHRONIZATION
   =================================================================== */

let lastTimestamp = null;

function togglePlayback() {
  audio.init();
  if (state.isPlaying) {
    pausePlayback();
  } else {
    startPlayback();
  }
}

function startPlayback() {
  state.isPlaying = true;
  lastTimestamp = performance.now();

  if (state.audioElement && state.audioElement.src && !state.audioMuted) {
    state.audioElement.currentTime = state.currentTime;
    state.audioElement.play().catch(e => console.warn('Audio play notice:', e));
  }

  document.getElementById('transportPlayIcon').textContent = '⏸';
  document.getElementById('btnTransportPlay').classList.add('playing');

  requestAnimationFrame(transportLoop);
}

function pausePlayback() {
  state.isPlaying = false;
  if (state.audioElement) {
    state.audioElement.pause();
  }

  document.getElementById('transportPlayIcon').textContent = '▶';
  document.getElementById('btnTransportPlay').classList.remove('playing');
}

function stopPlayback() {
  pausePlayback();
  state.currentTime = 0;
  state.lastMetronomeBeat = -1;

  if (state.audioElement) {
    state.audioElement.currentTime = 0;
  }

  updateTimeDisplays();
  updateTimelineCanvas();
}

function transportLoop(timestamp) {
  if (!state.isPlaying) return;

  const delta = (timestamp - lastTimestamp) / 1000;
  lastTimestamp = timestamp;

  const prevTime = state.currentTime;

  // Synchronize with audio element if playing custom audio
  if (state.audioElement && !state.audioElement.paused && state.audioElement.duration) {
    state.currentTime = state.audioElement.currentTime;
  } else {
    state.currentTime += delta * state.playbackSpeed;
  }

  const duration = state.song.metadata.duration;

  // Auto-stop at end of song
  if (state.currentTime >= duration) {
    stopPlayback();
    showToast('✨ Pratinjau lagu selesai.');
    return;
  }

  // Trigger synth music if enabled
  if (state.song.synthAudio && state.song.synthAudio.enabled && !state.audioMuted) {
    checkSynthTriggers(prevTime, state.currentTime);
  }

  // Trigger note hit sound effects when playhead crosses a note
  checkNoteTriggers(prevTime, state.currentTime);

  // Metronome tick
  if (state.metronome) {
    const beatInterval = 60 / state.song.metadata.bpm;
    const currentBeat = Math.floor(state.currentTime / beatInterval);
    if (currentBeat > state.lastMetronomeBeat) {
      state.lastMetronomeBeat = currentBeat;
      audio.playSfx('metronome');
    }
  }

  updateTimeDisplays();
  updateTimelineCanvas();

  requestAnimationFrame(transportLoop);
}

function checkSynthTriggers(prevTime, currTime) {
  const synth = state.song.synthAudio;
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

function checkNoteTriggers(prevTime, currTime) {
  state.song.notes.forEach(note => {
    if (note.time >= prevTime && note.time < currTime) {
      audio.playSfx(note.sound || TRACKS[note.lane].sfx);
    }
  });
}

function updateTimeDisplays() {
  document.getElementById('lcdCurrentTime').textContent = formatTimePrecise(state.currentTime);

  const secondsPerBeat = 60 / state.song.metadata.bpm;
  const totalBeats = state.currentTime / secondsPerBeat;
  const bar = Math.floor(totalBeats / 4) + 1;
  const beatInBar = (totalBeats % 4) + 1;

  document.getElementById('lcdBarBeat').textContent = `BAR ${String(bar).padStart(2, '0')} • BEAT ${beatInBar.toFixed(1)}`;
}

/* ===================================================================
   4. SEQUENCER CANVAS DAW (RENDERER & INTERACTIVE EDITING)
   =================================================================== */

function updateTimelineCanvas() {
  const canvas = document.getElementById('timelineCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const bpm = state.song.metadata.bpm;
  const duration = state.song.metadata.duration;
  const pixelsPerSecond = 140 * state.zoom;
  const totalWidth = Math.max(1600, Math.ceil(duration * pixelsPerSecond + 300));

  if (canvas.width !== totalWidth) {
    canvas.width = totalWidth;
  }

  const w = canvas.width;
  const h = canvas.height;
  const headerHeight = 36;
  const laneHeight = (h - headerHeight) / 4;

  // Background Obsidian
  ctx.fillStyle = '#090b0e';
  ctx.fillRect(0, 0, w, h);

  // Top Ruler Background
  ctx.fillStyle = '#101319';
  ctx.fillRect(0, 0, w, headerHeight);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, headerHeight);
  ctx.lineTo(w, headerHeight);
  ctx.stroke();

  // Grid calculations
  const secondsPerBeat = 60 / bpm;
  const snapInterval = secondsPerBeat / state.snapDiv;
  const totalSnaps = Math.ceil(duration / snapInterval);

  for (let s = 0; s <= totalSnaps; s++) {
    const snapTime = s * snapInterval;
    const x = snapTime * pixelsPerSecond;
    const isQuarterBeat = s % state.snapDiv === 0;
    const isBar = s % (state.snapDiv * 4) === 0;

    // Grid lines
    if (isBar) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
      ctx.lineWidth = 1.5;
    } else if (isQuarterBeat) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = 1;
    } else {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
      ctx.lineWidth = 0.8;
    }

    ctx.beginPath();
    ctx.moveTo(x, isBar ? 0 : headerHeight);
    ctx.lineTo(x, h);
    ctx.stroke();

    // Bar Numbers & Timestamp in Ruler
    if (isBar && x < w - 60) {
      const barNum = Math.floor(s / (state.snapDiv * 4)) + 1;
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 10px JetBrains Mono, monospace';
      ctx.fillText(`${barNum}`, x + 5, 15);

      ctx.fillStyle = '#6b7280';
      ctx.font = '9px JetBrains Mono, monospace';
      ctx.fillText(`${formatTimeShort(snapTime)}`, x + 5, 28);
    }
  }

  // Draw 4 Track Lane Separators & Subtle Shading
  for (let i = 0; i < 4; i++) {
    const ly = headerHeight + i * laneHeight;

    if (i % 2 === 1) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.012)';
      ctx.fillRect(0, ly, w, laneHeight);
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, ly);
    ctx.lineTo(w, ly);
    ctx.stroke();
  }

  // Draw Notes on Sequencer
  state.song.notes.forEach(note => {
    const nx = note.time * pixelsPerSecond;
    const ny = headerHeight + note.lane * laneHeight + 6;
    const nh = laneHeight - 12;
    const track = TRACKS[note.lane];
    const isSelected = note.id === state.selectedNoteId;

    ctx.save();

    // Hold note tail
    if (note.type === 'hold') {
      const holdW = (note.duration || 1.0) * pixelsPerSecond;
      const tailGrad = ctx.createLinearGradient(nx, ny, nx + holdW, ny);
      tailGrad.addColorStop(0, track.color + 'aa');
      tailGrad.addColorStop(1, track.color + '33');

      ctx.fillStyle = tailGrad;
      ctx.fillRect(nx, ny, holdW, nh);

      // Border outline
      ctx.strokeStyle = track.color;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(nx, ny, holdW, nh);

      // Grip stripes
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      for (let sx = nx + 12; sx < nx + holdW - 6; sx += 12) {
        ctx.beginPath();
        ctx.moveTo(sx, ny + 4);
        ctx.lineTo(sx, ny + nh - 4);
        ctx.stroke();
      }
    }

    // Main Note Body Card
    const cardW = 34;
    ctx.fillStyle = isSelected ? '#ffffff' : track.color;
    ctx.shadowColor = track.color;
    ctx.shadowBlur = isSelected ? 16 : 8;

    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(nx - cardW / 2, ny, cardW, nh, 6);
      ctx.fill();
    } else {
      ctx.fillRect(nx - cardW / 2, ny, cardW, nh);
    }

    // Active Selection Ring
    if (isSelected) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Inner Icon
    ctx.shadowBlur = 0;
    ctx.fillStyle = isSelected ? '#000' : '#fff';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(track.icon, nx, ny + nh / 2);

    ctx.restore();
  });

  // Playhead Scrubber Needle
  const playheadX = state.currentTime * pixelsPerSecond;
  ctx.strokeStyle = '#f43f5e';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(playheadX, 0);
  ctx.lineTo(playheadX, h);
  ctx.stroke();

  // Pointer Head
  ctx.fillStyle = '#f43f5e';
  ctx.beginPath();
  ctx.moveTo(playheadX - 7, 0);
  ctx.lineTo(playheadX + 7, 0);
  ctx.lineTo(playheadX, 12);
  ctx.closePath();
  ctx.fill();
}

function handleCanvasClick(e) {
  const canvas = document.getElementById('timelineCanvas');
  const rect = canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;

  const pixelsPerSecond = 140 * state.zoom;
  const headerHeight = 36;
  const laneHeight = (canvas.height - headerHeight) / 4;

  // 1. Click on Header Ruler: Scrub Audio Position
  if (clickY <= headerHeight) {
    const targetTime = Math.max(0, Math.min(state.song.metadata.duration, clickX / pixelsPerSecond));
    state.currentTime = targetTime;
    if (state.audioElement) state.audioElement.currentTime = targetTime;
    updateTimeDisplays();
    updateTimelineCanvas();
    return;
  }

  // 2. Click in Tracks
  const clickedLane = Math.floor((clickY - headerHeight) / laneHeight);
  if (clickedLane < 0 || clickedLane > 3) return;

  const rawTime = clickX / pixelsPerSecond;
  const secondsPerBeat = 60 / state.song.metadata.bpm;
  const snapInterval = secondsPerBeat / state.snapDiv;
  const snappedTime = Math.round(rawTime / snapInterval) * snapInterval;

  // Check if clicked an existing note
  const existing = state.song.notes.find(n => n.lane === clickedLane && Math.abs(n.time - rawTime) * pixelsPerSecond < 20);

  if (existing) {
    // Select this note
    state.selectedNoteId = existing.id;
    audio.playSfx(existing.sound || TRACKS[existing.lane].sfx);
    updateInspector();
    updateTimelineCanvas();
  } else {
    // Add new note
    const newNote = {
      id: Date.now(),
      time: parseFloat(snappedTime.toFixed(3)),
      lane: clickedLane,
      type: state.selectedTool,
      sound: TRACKS[clickedLane].sfx
    };
    if (state.selectedTool === 'hold') {
      newNote.duration = parseFloat(state.holdDuration) || 1.0;
    }

    state.song.notes.push(newNote);
    state.song.notes.sort((a, b) => a.time - b.time);
    state.selectedNoteId = newNote.id;

    audio.playSfx(newNote.sound);
    showToast(`Note diletakkan di Track ${clickedLane} (${snappedTime.toFixed(2)}s)`);

    updateHeaderAndHUD();
    updateInspector();
    updateTimelineCanvas();
  }
}

function handleCanvasDblClick(e) {
  const canvas = document.getElementById('timelineCanvas');
  const rect = canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;

  const pixelsPerSecond = 140 * state.zoom;
  const headerHeight = 36;
  const laneHeight = (canvas.height - headerHeight) / 4;
  if (clickY <= headerHeight) return;

  const clickedLane = Math.floor((clickY - headerHeight) / laneHeight);
  const rawTime = clickX / pixelsPerSecond;

  const noteIdx = state.song.notes.findIndex(n => n.lane === clickedLane && Math.abs(n.time - rawTime) * pixelsPerSecond < 22);
  if (noteIdx !== -1) {
    const deleted = state.song.notes.splice(noteIdx, 1)[0];
    if (state.selectedNoteId === deleted.id) state.selectedNoteId = null;
    audio.playSfx('water_splash');
    showToast(`🗑️ Note pada ${deleted.time}s dihapus.`);
    updateHeaderAndHUD();
    updateInspector();
    updateTimelineCanvas();
  }
}

/* ===================================================================
   5. NOTE INSPECTOR (DETAIL EDITOR)
   =================================================================== */

function updateInspector() {
  const container = document.getElementById('inspectorContent');
  const badge = document.getElementById('inspectorStatusBadge');

  if (!state.selectedNoteId) {
    badge.textContent = 'NONE';
    container.className = 'inspector-empty';
    container.innerHTML = '<p>Klik note manapun di timeline untuk membuka editor properti presisi.</p>';
    return;
  }

  const note = state.song.notes.find(n => n.id === state.selectedNoteId);
  if (!note) {
    state.selectedNoteId = null;
    updateInspector();
    return;
  }

  badge.textContent = `ID #${note.id.toString().slice(-4)}`;
  container.className = 'inspector-grid';
  container.innerHTML = `
    <div class="inspector-row">
      <label>Timestamp (s):</label>
      <input type="number" id="inspTimeInput" class="dock-input-num" value="${note.time}" step="0.05" min="0">
    </div>
    <div class="inspector-row">
      <label>Track Lane:</label>
      <select id="inspLaneSelect" class="dock-select">
        <option value="0" ${note.lane === 0 ? 'selected' : ''}>🍊 Track 0 (Yuzu)</option>
        <option value="1" ${note.lane === 1 ? 'selected' : ''}>💧 Track 1 (Onsen)</option>
        <option value="2" ${note.lane === 2 ? 'selected' : ''}>🐾 Track 2 (Paw)</option>
        <option value="3" ${note.lane === 3 ? 'selected' : ''}>⭐ Track 3 (Citrus)</option>
      </select>
    </div>
    <div class="inspector-row">
      <label>Note Type:</label>
      <select id="inspTypeSelect" class="dock-select">
        <option value="tap" ${note.type === 'tap' ? 'selected' : ''}>Tap</option>
        <option value="hold" ${note.type === 'hold' ? 'selected' : ''}>Hold</option>
        <option value="burst" ${note.type === 'burst' ? 'selected' : ''}>Burst</option>
      </select>
    </div>
    ${note.type === 'hold' ? `
    <div class="inspector-row">
      <label>Duration (s):</label>
      <input type="number" id="inspDurationInput" class="dock-input-num" value="${note.duration || 1.0}" step="0.1" min="0.2">
    </div>` : ''}
    <div style="display: flex; gap: 6px; margin-top: 8px;">
      <button class="btn btn-xs btn-primary btn-block" id="btnInspSave">Terapkan</button>
      <button class="btn btn-xs btn-danger-dark btn-block" id="btnInspDel">Hapus Note</button>
    </div>
  `;

  document.getElementById('btnInspSave').addEventListener('click', () => {
    note.time = parseFloat(document.getElementById('inspTimeInput').value) || note.time;
    note.lane = parseInt(document.getElementById('inspLaneSelect').value);
    note.type = document.getElementById('inspTypeSelect').value;
    note.sound = TRACKS[note.lane].sfx;
    if (note.type === 'hold') {
      const durEl = document.getElementById('inspDurationInput');
      note.duration = durEl ? (parseFloat(durEl.value) || 1.0) : 1.0;
    }
    state.song.notes.sort((a, b) => a.time - b.time);
    showToast('✅ Note berhasil diupdate.');
    updateInspector();
    updateTimelineCanvas();
  });

  document.getElementById('btnInspDel').addEventListener('click', () => {
    const idx = state.song.notes.findIndex(n => n.id === note.id);
    if (idx !== -1) {
      state.song.notes.splice(idx, 1);
      state.selectedNoteId = null;
      audio.playSfx('water_splash');
      showToast('🗑️ Note dihapus.');
      updateHeaderAndHUD();
      updateInspector();
      updateTimelineCanvas();
    }
  });
}

/* ===================================================================
   6. BATCH OPERATIONS & TAP BPM
   =================================================================== */

function mirrorTracks() {
  state.song.notes.forEach(n => {
    n.lane = 3 - n.lane;
    n.sound = TRACKS[n.lane].sfx;
  });
  updateTimelineCanvas();
  updateInspector();
  showToast('🪞 Semua track berhasil dicerminkan!');
}

function shiftNotes() {
  const secondsPerBeat = 60 / state.song.metadata.bpm;
  state.song.notes.forEach(n => {
    n.time = parseFloat((n.time + secondsPerBeat).toFixed(3));
  });
  updateTimelineCanvas();
  updateInspector();
  showToast(`⏩ Semua note digeser maju 1 beat (+${secondsPerBeat.toFixed(2)}s).`);
}

function clearAllNotes() {
  if (confirm('Hapus semua note di beatmap ini?')) {
    state.song.notes = [];
    state.selectedNoteId = null;
    updateHeaderAndHUD();
    updateInspector();
    updateTimelineCanvas();
    showToast('🗑️ Semua note telah dikosongkan.');
  }
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
    const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const detected = Math.round(60000 / avg);
    if (detected >= 40 && detected <= 240) {
      document.getElementById('bpmDetectVal').textContent = detected;
    }
  }
}

/* ===================================================================
   7. FILE IMPORT & EXPORT
   =================================================================== */

function handleJsonUpload(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (!parsed.notes || !parsed.metadata) throw new Error('Struktur beatmap capybara-go-v1 tidak valid.');
      loadSong(parsed);
      closeModals();
      showToast(`📁 File script "${file.name}" berhasil dimuat!`);
    } catch (err) {
      alert(`Gagal memuat JSON: ${err.message}`);
    }
  };
  reader.readAsText(file);
}

function handleAudioUpload(file) {
  if (!file) return;
  const url = URL.createObjectURL(file);
  setupAudioTrack(url, file.name);
  closeModals();
  showToast(`🎵 Lagu audio "${file.name}" dipasang!`);
}

function exportJson() {
  const jsonStr = JSON.stringify(state.song, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeTitle = state.song.metadata.title.toLowerCase().replace(/[^a-z0-9]/g, '-');
  a.href = url;
  a.download = `${safeTitle}-beatmap.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('💾 Script JSON berhasil diunduh!');
}

function copyJsonToClipboard() {
  const jsonStr = JSON.stringify(state.song, null, 2);
  navigator.clipboard.writeText(jsonStr).then(() => {
    showToast('📋 Script JSON berhasil disalin ke clipboard!');
  }).catch(() => alert('Gagal copy clipboard.'));
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
  const title = document.getElementById('aiSongTitle') ? document.getElementById('aiSongTitle').value : "Kimi no Na wa";
  const bpm = document.getElementById('aiBpm') ? document.getElementById('aiBpm').value : "86";
  const duration = document.getElementById('aiDuration') ? document.getElementById('aiDuration').value : "181";
  const difficulty = document.getElementById('aiDifficulty') ? document.getElementById('aiDifficulty').value : "Master";

  const template = `Kamu adalah Level Designer & Music Composer rhythm game untuk game "Capybara Go".
Tugasmu adalah membuat script beatmap dalam format JSON murni yang valid tanpa teks pembuka/penutup.

Spesifikasi:
- Lagu: ${title}
- BPM: ${bpm}
- Durasi: ${duration} detik
- Difficulty: ${difficulty}

ATURAN STRUKTUR JSON:
1. "formatVersion": "capybara-go-v1"
2. "metadata": { "title": "${title}", "artist": "RADWIMPS", "genre": "Anime Rock", "bpm": ${bpm}, "duration": ${duration}, "difficulty": "${difficulty}", "author": "AI", "description": "Lagu anime." }
3. "notes": [
     { "id": 1, "time": 1.40, "lane": 0, "type": "tap", "sound": "yuzu_pop" },
     { "id": 2, "time": 2.09, "lane": 1, "type": "tap", "sound": "water_splash" },
     { "id": 3, "time": 2.79, "lane": 2, "type": "tap", "sound": "paw_tap" },
     { "id": 4, "time": 3.49, "lane": 3, "type": "burst", "sound": "citrus_burst" }
   ]

Catatan jalur (lane): 0 = D (Yuzu), 1 = F (Onsen), 2 = J (Paw), 3 = K (Citrus).
Output HANYA berupa JSON murni!`;

  const textarea = document.getElementById('aiPromptTextArea');
  if (textarea) textarea.value = template;
}

async function runAiGeneration() {
  saveAiConfig();
  const apiKey = document.getElementById('aiApiKeyInput').value.trim();
  const provider = document.getElementById('aiProviderSelect').value;

  if (!apiKey) {
    showToast('⚠️ Masukkan API Key kamu dulu, atau klik "Auto-Generate Algoritmik"!');
    return;
  }

  const title = document.getElementById('aiSongTitle').value.trim() || 'Anime Theme';
  const bpm = parseInt(document.getElementById('aiBpm').value) || 86;
  const duration = parseInt(document.getElementById('aiDuration').value) || 181;
  const difficulty = document.getElementById('aiDifficulty').value;
  const density = document.getElementById('aiDensity').value;

  const statusBox = document.getElementById('aiStatusBox');
  const statusText = document.getElementById('aiStatusText');
  statusBox.style.display = 'flex';
  statusText.textContent = `Menghubungi ${provider.toUpperCase()} untuk merancang beatmap...`;

  const systemInstruction = `You are an expert rhythm game beatmap mapper. Generate a valid JSON beatmap adhering strictly to formatVersion "capybara-go-v1". No markdown codeblocks, only pure JSON.`;
  const userPrompt = `Create a rhythmic, well-timed beatmap for: "${title}", BPM: ${bpm}, Duration: ${duration}s, Difficulty: ${difficulty}, Density: ${density}. Lane 0 to 3, with taps, holds, and bursts.`;

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
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
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
      closeModals();
      showToast(`✨ Beatmap AI "${resultJson.metadata.title}" berhasil dibuat!`);
    } else {
      throw new Error('Format output JSON dari AI tidak sesuai skema.');
    }

  } catch (err) {
    console.error('AI Gen Error:', err);
    alert(`Gagal generate via AI: ${err.message}\n\nTips: Periksa API Key atau gunakan tombol "Auto-Generate Algoritmik".`);
  } finally {
    statusBox.style.display = 'none';
  }
}

function runProceduralGeneration() {
  const title = document.getElementById('aiSongTitle').value.trim() || 'Anime Ballad';
  const bpm = parseInt(document.getElementById('aiBpm').value) || 86;
  const duration = parseInt(document.getElementById('aiDuration').value) || 181;
  const difficulty = document.getElementById('aiDifficulty').value;
  const density = document.getElementById('aiDensity').value;

  const secondsPerBeat = 60 / bpm;
  const totalBeats = Math.floor(duration / secondsPerBeat);
  const notes = [];
  let noteId = 1;

  let step = density === 'dense' ? 0.5 : 1;
  let currentLane = 0;

  for (let b = 2; b < totalBeats - 2; b += step) {
    const time = parseFloat((b * secondsPerBeat).toFixed(3));
    if (Math.random() > 0.15) {
      currentLane = (currentLane + Math.floor(Math.random() * 3) + 1) % 4;
      const r = Math.random();
      let type = 'tap';
      let holdDur = undefined;

      if (r > 0.85 && b + 1.5 < totalBeats) {
        type = 'hold';
        holdDur = parseFloat((secondsPerBeat * 1.5).toFixed(2));
      } else if (r > 0.72) {
        type = 'burst';
      }

      const nObj = {
        id: noteId++,
        time: time,
        lane: currentLane,
        type: type,
        sound: TRACKS[currentLane].sfx
      };
      if (holdDur) nObj.duration = holdDur;
      notes.push(nObj);
    }
  }

  const generated = {
    formatVersion: "capybara-go-v1",
    metadata: {
      title: title,
      artist: "RADWIMPS",
      genre: "Anime",
      bpm: bpm,
      duration: duration,
      difficulty: difficulty,
      author: "Procedural",
      description: `Pola beatmap ${difficulty} otomatis.`
    },
    synthAudio: { enabled: false },
    notes: notes
  };

  loadSong(generated);
  closeModals();
  showToast(`🎲 Beatmap "${title}" berhasil disusun otomatis!`);
}

/* ===================================================================
   9. UI HELPERS & MODALS
   =================================================================== */

function openUploadModal() {
  document.getElementById('uploadModalOverlay').classList.add('active');
}

function openAiModal() {
  document.getElementById('aiModalOverlay').classList.add('active');
  updatePromptTemplateText();
}

function closeModals() {
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
}

function showToast(msg) {
  const toast = document.getElementById('capyToast');
  if (!toast) return;
  toast.textContent = msg;
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

function formatTimeShort(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

/* ===================================================================
   10. INITIALIZATION & EVENT LISTENERS
   =================================================================== */

window.addEventListener('DOMContentLoaded', () => {
  initDefaultSong();
  initAiConfig();

  // Transport Buttons
  document.getElementById('btnTransportPlay').addEventListener('click', togglePlayback);
  document.getElementById('btnTransportStop').addEventListener('click', stopPlayback);

  document.getElementById('btnToggleMetronome').addEventListener('click', () => {
    state.metronome = !state.metronome;
    document.getElementById('btnToggleMetronome').classList.toggle('active', state.metronome);
    showToast(state.metronome ? '⏲️ Metronom diaktifkan' : '⏲️ Metronom dimatikan');
  });

  document.getElementById('btnToggleAudioMute').addEventListener('click', () => {
    state.audioMuted = !state.audioMuted;
    if (state.audioElement) state.audioElement.muted = state.audioMuted;
    document.getElementById('btnToggleAudioMute').classList.toggle('active', !state.audioMuted);
    document.getElementById('muteIcon').textContent = state.audioMuted ? '🔇' : '🔊';
    showToast(state.audioMuted ? '🔇 Audio dibisukan' : '🔊 Audio bersuara');
  });

  // Song Selector Dropdown
  document.getElementById('headerSongSelect').addEventListener('change', (e) => {
    const val = e.target.value;
    if (val === 'kimi-no-na-wa') {
      if (PRESET_KIMI_NO_NA_WA) {
        loadSong(PRESET_KIMI_NO_NA_WA);
        setupAudioTrack('audio/kimi-no-na-wa.mp3', 'RADWIMPS — Nandemonaiya');
      }
    } else if (val === 'onsen') {
      loadSong(PRESET_ONSEN);
      document.getElementById('footerAudioBadge').textContent = '🎵 Source: Lo-Fi Synth Audio';
    } else if (val === 'rush') {
      loadSong(PRESET_RUSH);
      document.getElementById('footerAudioBadge').textContent = '🎵 Source: 132 BPM Synth Audio';
    } else if (val === 'blank') {
      const blank = {
        formatVersion: "capybara-go-v1",
        metadata: { title: "Map Baru", artist: "Artist", bpm: 90, duration: 60, difficulty: "Normal" },
        synthAudio: { enabled: false },
        notes: []
      };
      loadSong(blank);
    }
  });

  // Canvas Interactions
  const canvas = document.getElementById('timelineCanvas');
  canvas.addEventListener('click', handleCanvasClick);
  canvas.addEventListener('dblclick', handleCanvasDblClick);

  // Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

    if (e.code === 'Space') {
      e.preventDefault();
      togglePlayback();
    } else if (e.code === 'Digit1') {
      selectTool('tap');
    } else if (e.code === 'Digit2') {
      selectTool('hold');
    } else if (e.code === 'Digit3') {
      selectTool('burst');
    } else if (e.code === 'Delete' || e.code === 'Backspace') {
      if (state.selectedNoteId) {
        const idx = state.song.notes.findIndex(n => n.id === state.selectedNoteId);
        if (idx !== -1) {
          state.song.notes.splice(idx, 1);
          state.selectedNoteId = null;
          updateHeaderAndHUD();
          updateInspector();
          updateTimelineCanvas();
          showToast('🗑️ Note dihapus.');
        }
      }
    }
  });

  function selectTool(toolName) {
    state.selectedTool = toolName;
    document.querySelectorAll('.palette-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tool === toolName);
    });
    document.getElementById('holdDurationSettings').style.display = toolName === 'hold' ? 'flex' : 'none';
  }

  // Tool Palette Clicks
  document.querySelectorAll('.palette-btn').forEach(btn => {
    btn.addEventListener('click', () => selectTool(btn.dataset.tool));
  });

  document.getElementById('holdDurationSlider').addEventListener('input', (e) => {
    state.holdDuration = parseFloat(e.target.value) || 1.0;
    document.getElementById('holdDurationVal').textContent = `${state.holdDuration.toFixed(1)}s`;
  });

  // Quantize & Zoom
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

  // BPM & Duration
  document.getElementById('inputBpm').addEventListener('change', (e) => {
    const bpm = parseInt(e.target.value) || 86;
    state.song.metadata.bpm = bpm;
    updateHeaderAndHUD();
    updateTimelineCanvas();
  });

  document.getElementById('inputDuration').addEventListener('change', (e) => {
    const dur = parseFloat(e.target.value) || 180;
    state.song.metadata.duration = dur;
    updateHeaderAndHUD();
    updateTimelineCanvas();
  });

  document.getElementById('btnTapBpm').addEventListener('click', handleBpmTap);
  document.getElementById('btnApplyBpm').addEventListener('click', () => {
    const detected = parseInt(document.getElementById('bpmDetectVal').textContent);
    if (detected) {
      state.song.metadata.bpm = detected;
      document.getElementById('inputBpm').value = detected;
      updateHeaderAndHUD();
      updateTimelineCanvas();
      showToast(`BPM disetel ke ${detected}`);
    }
  });

  // Batch Operations
  document.getElementById('btnMirrorLanes').addEventListener('click', mirrorTracks);
  document.getElementById('btnShiftNotesForward').addEventListener('click', shiftNotes);
  document.getElementById('btnClearAllNotes').addEventListener('click', clearAllNotes);

  // Modals
  document.getElementById('btnOpenUploadModal').addEventListener('click', openUploadModal);
  document.getElementById('btnCloseUploadModal').addEventListener('click', closeModals);
  document.getElementById('btnOpenAiModal').addEventListener('click', openAiModal);
  document.getElementById('btnCloseAiModal').addEventListener('click', closeModals);

  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModals();
    });
  });

  // Upload Handlers
  document.getElementById('btnPickJsonFile').addEventListener('click', () => document.getElementById('fileInputJson').click());
  document.getElementById('fileInputJson').addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleJsonUpload(e.target.files[0]);
  });

  document.getElementById('btnPickAudioFile').addEventListener('click', () => document.getElementById('fileInputAudio').click());
  document.getElementById('fileInputAudio').addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleAudioUpload(e.target.files[0]);
  });

  // Export Handlers
  document.getElementById('btnExportJsonFile').addEventListener('click', exportJson);
  document.getElementById('btnModalExportJson').addEventListener('click', exportJson);
  document.getElementById('btnModalCopyJson').addEventListener('click', copyJsonToClipboard);

  // AI Generator Handlers
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
    navigator.clipboard.writeText(text).then(() => showToast('📋 Master Prompt disalin!'));
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
      closeModals();
      showToast('📥 Berhasil memuat script JSON hasil AI!');
    } catch (e) {
      alert(`Format JSON tidak valid: ${e.message}`);
    }
  });

  // Initial draw
  updateTimelineCanvas();
});
