# 🍊 Panduan Prompt AI: Pembuat Beatmap Capybara Go (Universal AI Prompt Guide)

Panduan ini berisi instruksi dan template prompt yang **bisa kamu berikan ke AI manapun** (seperti ChatGPT, Claude, Google Gemini, DeepSeek, atau Copilot) untuk membuatkan lagu & beatmap lengkap untuk web **Capybara Go Beat Studio**.

Hasil keluaran AI berupa file script format JSON standar yang bisa langsung di-upload ke web dan langsung dimainkan atau diedit!

---

## 📋 1. Prompt Master (Copy-Paste ini ke AI)

Salin teks dalam kotak di bawah ini dan kirimkan ke AI favoritmu. Kamu bisa mengganti bagian dalam kurung siku `[ ... ]` sesuai dengan lagu atau tema yang kamu inginkan.

```markdown
Kamu adalah Rhythm Game Level Designer & Sound Composer ahli untuk game "Capybara Go".
Tugasmu adalah membuat sebuah file script beatmap dan musik sintetis dalam format JSON murni.

Tema game ini adalah Capybara santai, berendam air panas (onsen), jeruk yuzu, dan petualangan yang ceria.

Spesifikasi lagu yang ingin dibuat:
- Judul Lagu: [Contoh: Capybara Afternoon River Walk]
- Artis / Pencipta: [Contoh: Capy Chill Crew]
- Genre & Mood: [Contoh: Cozy Lo-Fi / Relaxing Onsen / Upbeat Citrus Pop / Energetic Boss]
- BPM (Kecepatan): [Pilih antara 70 sampai 140 BPM, contoh: 92]
- Durasi: [Contoh: 30 sampai 60 detik]
- Tingkat Kesulitan: [Easy / Normal / Hard / Master]

ATURAN STRUKTUR JSON (WAJIB DIIKUTI):
1. Output HANYA berupa JSON valid tanpa teks pengantar atau penutup apapun (hanya raw JSON).
2. Struktur JSON harus memiliki 3 bagian utama:
   - "metadata": Informasi judul, artist, bpm, difficulty, dan description.
   - "synthAudio": Musik latar menggunakan Web Audio synth:
     * "tempo": sama dengan bpm metadata.
     * "chords": array objek berisi { "time": detik, "chord": ["C4", "E4", "G4"], "duration": detik }.
     * "bass": array objek berisi { "time": detik, "pitch": "C2", "duration": detik }.
     * "drums": array objek beat { "time": detik, "type": "kick"|"snare"|"splash" }.
   - "notes": Array beatmap yang harus ditekan oleh pemain:
     * "id": nomor urut unik (1, 2, 3...)
     * "time": waktu kemunculan note dalam detik (float, terhitung dari BPM).
     * "lane": jalur note (0 = D / Yuzu Oranye, 1 = F / Air Onsen, 2 = J / Jejak Kaki, 3 = K / Jeruk Emas).
     * "type": jenis note ("tap", "hold", atau "burst").
     * "duration": durasi tahan dalam detik (hanya jika type = "hold").
     * "sound": efek suara saat kena ("yuzu_pop", "water_splash", "paw_tap", "citrus_burst", "warm_onsen").

RUMUS TIMING BEAT:
- 1 ketukan (quarter note) = 60 / BPM detik.
- Contoh BPM 90: 1 beat = 0.667 detik.
- Tempatkan note jatuh selaras dengan drum atau akor agar ritmenya pas dan seru dimainkan!

Buatkan sekarang file JSON lengkapnya:
```

---

## 📝 2. Contoh Respon yang Diharapkan dari AI

AI akan memberikan JSON seperti ini:

```json
{
  "formatVersion": "capybara-go-v1",
  "metadata": {
    "title": "Capybara Floating Melody",
    "artist": "Citrus Valley",
    "genre": "Chill Onsen Hop",
    "bpm": 90,
    "duration": 30.0,
    "difficulty": "Normal",
    "author": "AI Composer",
    "description": "Lagu santai petualangan Capybara memetik jeruk di pinggir sungai."
  },
  "synthAudio": {
    "enabled": true,
    "tempo": 90,
    "chords": [
      { "time": 0.0, "chord": ["C4", "E4", "G4"], "duration": 2.66 },
      { "time": 2.66, "chord": ["A3", "C4", "E4"], "duration": 2.66 },
      { "time": 5.33, "chord": ["F3", "A3", "C4"], "duration": 2.66 },
      { "time": 8.00, "chord": ["G3", "B3", "D4"], "duration": 2.66 }
    ],
    "bass": [
      { "time": 0.0, "pitch": "C2", "duration": 1.33 },
      { "time": 1.33, "pitch": "G2", "duration": 1.33 },
      { "time": 2.66, "pitch": "A2", "duration": 1.33 },
      { "time": 4.00, "pitch": "E2", "duration": 1.33 }
    ],
    "drums": [
      { "time": 0.0, "type": "kick" },
      { "time": 0.67, "type": "snare" },
      { "time": 1.33, "type": "kick" },
      { "time": 2.00, "type": "snare" }
    ]
  },
  "notes": [
    { "id": 1, "time": 1.33, "lane": 0, "type": "tap", "sound": "yuzu_pop" },
    { "id": 2, "time": 2.00, "lane": 1, "type": "tap", "sound": "water_splash" },
    { "id": 3, "time": 2.66, "lane": 2, "type": "tap", "sound": "paw_tap" },
    { "id": 4, "time": 3.33, "lane": 3, "type": "tap", "sound": "citrus_burst" },
    { "id": 5, "time": 4.00, "lane": 1, "type": "hold", "duration": 1.2, "sound": "warm_onsen" }
  ]
}
```

---

## 🚀 3. Cara Memasukkan ke Web Capybara Beat Studio

1. **Simpan sebagai file `.json`**:
   - Salin output JSON dari AI.
   - Buat file baru bernama `laguku.json` di komputer dan tempel isinya.
   - Di web, klik tombol **"📁 Upload Script (.json)"** lalu pilih file tersebut!
   
2. **Atau Menggunakan Fitur API Key Langsung di Web**:
   - Buka tab **"🤖 AI Auto-Mapper"** di web.
   - Masukkan **Google Gemini API Key** (bisa didapatkan gratis di [Google AI Studio](https://aistudio.google.com/)) atau OpenAI API Key.
   - Ketik tema atau deskripsi lagu yang kamu mau, lalu klik **"✨ Generate Beatmap Otomatis"**.
   - AI akan langsung membuatkan notanya dan otomatis termuat ke timeline editor dan siap dimainkan!

---

## 🎯 4. Penjelasan Jalur & Tombol (Lanes)

| Lane | Tombol Default | Simbol Item | Efek Suara |
|:---:|:---:|:---:|:---:|
| **0** | **D** | 🍊 Jeruk Yuzu | `yuzu_pop` (Pop renyah) |
| **1** | **F** | 💧 Air Onsen | `water_splash` (Percikan air rileks) |
| **2** | **J** | 🐾 Jejak Kaki Capy | `paw_tap` (Suara kayu ketuk hangat) |
| **3** | **K** | ⭐ Jeruk Emas / Citrus | `citrus_burst` (Suara lonceng citrus berkilau) |
