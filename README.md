# 🍊 Capybara Go! Map Studio

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fdevilerefgu%2Fcapybara-go-map-studio)

**Capybara Go! Map Studio** adalah aplikasi web khusus untuk **mengedit dan mengunggah beatmap (peta nada/ritme musik)** untuk game **Capybara Go**. Didesain dengan estetika onsen bambu hangat, buah jeruk yuzu, dan maskot capybara yang imut tanpa nuansa rumit atau permainan falling-notes arcade.

Repository GitHub: **https://github.com/devilerefgu/capybara-go-map-studio**

---

## ⚡ Deploy ke Vercel (1-Click)

Kamu bisa langsung mendeploy web ini ke Vercel secara gratis:

1. Klik tombol **Deploy with Vercel** di atas, atau buka tautan ini:  
   👉 **[Deploy ke Vercel](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fdevilerefgu%2Fcapybara-go-map-studio)**
2. Masuk / Sign in menggunakan akun GitHub kamu (`devilerefgu`).
3. Beri nama proyek (misal: `capybara-go-map-studio`) lalu klik tombol **"Deploy"**.
4. Dalam 10-15 detik, website editor beatmap kamu sudah online dengan domain gratis seperti `capybara-go-map-studio.vercel.app`!

---

## 🎛️ Fitur Khusus Edit & Upload Map:

1. **Multi-Lane Visual DAW Timeline**:
   - 4 Jalur Note (Lane 0: 🍊 Yuzu, Lane 1: 💧 Onsen, Lane 2: 🐾 Paw, Lane 3: ⭐ Citrus).
   - Pengaturan Grid Snap: 1/1, 1/2, 1/4 (standar), 1/8, dan 1/16 Beat.
   - Zoom timeline, Scrubber penunjuk waktu, dan ketukan metronom bawaan.
2. **Note Inspector & Palet**:
   - Pilihan note: **Tap Note**, **Hold Note** (dengan durasi tahan), dan **Citrus Burst**.
   - Klik note manapun di timeline untuk melihat inspector detailnya (bisa ganti waktu, ganti jalur, atau hapus).
   - Double klik note di timeline untuk langsung menghapusnya.
3. **Audio Synthesizer & MP3 Uploader**:
   - Lagu bawaan langsung mengeluarkan suara instrumen akor Lo-Fi & drum akustik via Web Audio API.
   - Bisa mengunggah file musik sendiri (`.mp3`, `.wav`, `.ogg`) untuk dijadikan panduan mapping!
4. **AI Auto-Mapper Terintegrasi**:
   - Masukkan **Google Gemini API Key** (gratis di [Google AI Studio](https://aistudio.google.com/app/apikey)) atau **OpenAI API Key**.
   - Tentukan BPM, durasi, dan tingkat kesulitan, lalu klik *Generate* agar AI yang menaruh note-nya secara otomatis.
   - Generator Algoritmik Instan: Buat pola note otomatis tanpa API key.
   - Master Prompt siap pakai untuk di-copy ke ChatGPT, Claude, atau DeepSeek.
5. **Import & Ekspor Mudah**:
   - Upload file script beatmap format standar `.json`.
   - Download dan salin script ke clipboard hanya dengan 1 klik.
