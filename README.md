# 🍊 Capybara Go! Beat Studio

**Capybara Go! Beat Studio** adalah aplikasi web pembuat dan pemain beatmap musik ritme bertema petualangan santai **Capybara Go**. Didesain khusus dengan atmosfer onsen air hangat, bambu alami, buah jeruk yuzu, dan jejak kaki capybara yang imut (bukan kloningan osu! yang bernuansa neon atau techno futuristik).

Aplikasi ini dilengkapi dengan:
- **Game Mode Ritme Interaktif** (4 Jalur: D, F, J, K / Touch / Klik) dengan animasi Capybara yang berendam dan bergoyang sesuai tempo (BPM) musik, efek percikan air, yuzu pop, dan sistem skor akurasi.
- **Editor Beatmap Multi-Lane Visual** dengan grid snap (1/1, 1/2, 1/4, 1/8 beat), zoom, scrubber audio, metronom, dan deteksi tempo otomatis (Tap BPM Tempo Calculator).
- **Audio Synthesizer Terintegrasi (Web Audio API)** sehingga lagu langsung memiliki alunan melodi Lo-Fi, bass hangat, dan instrumen drum akustik tanpa perlu file MP3 eksternal (kamu juga bisa mengunggah file MP3/WAV milikmu sendiri jika mau!).
- **AI Auto-Mapper Bawaan**: Masukkan API Key (Google Gemini atau OpenAI) untuk menyuruh AI merancang tangga nada dan ritme lagu secara otomatis saat kamu sedang santai.
- **Generator Algoritmik Cepat (Tanpa API Key)**: Buat lagu dan beatmap instan hanya dengan memilih BPM dan tingkat kesulitan.
- **Format Script Universal (`capybara-go-v1`)**: File format JSON yang mudah dibaca oleh AI manapun (ChatGPT, Claude, Gemini, DeepSeek, Grok) beserta panduan prompt siap pakai.

---

## 🚀 Cara Menjalankan Aplikasi

Kamu bisa langsung menjalankan web ini dengan cara yang sangat mudah:

### Cara 1: Buka Langsung di Browser (Paling Cepat)
1. Buka folder `C:\CapybaraBeatStudio` di File Explorer Windows.
2. Klik ganda file `index.html` (akan terbuka langsung di Google Chrome, Microsoft Edge, atau browser favoritmu).
3. Selesai! Web siap digunakan 100% secara offline tanpa perlu instalasi server atau `npm`.

### Cara 2: Menjalankan via Local Web Server (Opsional)
Jika kamu memiliki Python atau Node.js dan ingin menjalankannya sebagai server lokal:
```bash
# Menggunakan Python:
cd C:\CapybaraBeatStudio
python -m http.server 8080

# Lalu buka browser di: http://localhost:8080
```

---

## 📂 Struktur File di `C:\CapybaraBeatStudio`

```text
C:\CapybaraBeatStudio\
├── index.html                  # Halaman utama aplikasi web
├── styles.css                  # Desain visual hangat bertema Capybara Onsen
├── app.js                      # Mesin game, Web Audio synth, editor, & AI
├── sample-capybara-onsen.json  # Contoh lagu 1: Lo-Fi Onsen Chill (86 BPM)
├── sample-citrus-rush.json     # Contoh lagu 2: Upbeat Dance Rush (132 BPM)
├── AI_PROMPT_GUIDE.md          # Panduan lengkap instruksi prompt untuk semua AI
└── README.md                   # Petunjuk penggunaan ini
```

---

## 🎮 Kontrol Game & Jalur (Lanes)

| Jalur (Lane) | Tombol Keyboard | Simbol | Efek Suara | Karakteristik |
|:---:|:---:|:---:|:---:|:---|
| **Lane 0** | <kbd>D</kbd> atau <kbd>1</kbd> | 🍊 | `yuzu_pop` | Jeruk Yuzu segar melompat di atas air |
| **Lane 1** | <kbd>F</kbd> atau <kbd>2</kbd> | 💧 | `water_splash` | Percikan air hangat onsen yang menenangkan |
| **Lane 2** | <kbd>J</kbd> atau <kbd>3</kbd> | 🐾 | `paw_tap` | Jejak ketukan kaki kayu bambu |
| **Lane 3** | <kbd>K</kbd> atau <kbd>4</kbd> | ⭐ | `citrus_burst` | Letupan aroma jeruk emas bernilai tinggi |

- **Spasi**: Memulai / Menjeda (Play / Pause) lagu.
- Kamu juga bisa mengklik langsung tombol di bagian bawah layar jika menggunakan layar sentuh atau mouse.

---

## 🤖 Menggunakan Fitur AI Auto-Mapper

### Opsi A: Menggunakan API Key Langsung di Web
1. Buka tab **"🤖 AI Auto-Mapper"** di navigasi atas.
2. Masukkan API Key kamu:
   - **Google Gemini**: Dapatkan gratis tanpa kartu kredit di [Google AI Studio](https://aistudio.google.com/app/apikey).
   - **OpenAI**: Menggunakan API Key OpenAI (GPT-4o / GPT-4o-mini).
3. Atur judul lagu, BPM, durasi (misal 30 detik), dan tingkat kesulitan (Easy/Normal/Hard/Master).
4. Klik **"✨ Generate Beatmap Otomatis (via API Key)"**. AI akan langsung menghasilkan melodi dan ketukan, lalu memuatnya langsung ke game!

### Opsi B: Menggunakan ChatGPT, Claude, atau DeepSeek
1. Buka tab **"🤖 AI Auto-Mapper"** lalu lihat kolom sebelah kanan (**Master Prompt**).
2. Klik tombol **"📋 Salin Prompt ke Clipboard"**.
3. Buka ChatGPT, Claude, atau DeepSeek dan paste prompt tersebut.
4. Salin kode JSON yang dihasilkan AI, lalu paste ke kotak **"Quick Paste JSON"** di web dan klik **"📥 Muat Script JSON Ini"**!
5. Atau kamu juga bisa melihat panduan selengkapnya di file [AI_PROMPT_GUIDE.md](file:///C:/CapybaraBeatStudio/AI_PROMPT_GUIDE.md).

### Opsi C: Generator Algoritmik Instan (Tanpa API Key)
- Jika kamu tidak memiliki API key saat ini, cukup klik **"🎲 Buat Otomatis Tanpa API Key"**. Mesin matematika bawaan web ini akan menyusun lagu bertema santai beserta ketukan nada yang sinkron secara instan!
