# 📊 WhatsApp Bot Dashboard

Dashboard web untuk mengelola pengaturan WhatsApp Bot Anda dengan mudah.

## 🚀 Fitur

- ⚙️ **Settings Management** - Kelola pengaturan bot (nama, status, auto-reply, dll)
- 👥 **Karyawan Management** - Tambah, hapus, dan kelola daftar karyawan
- 🔐 **Admin & Blacklist** - Atur nomor admin dan nomor yang diblokir
- 📊 **Status Monitoring** - Monitor status koneksi bot real-time
- 💬 **Message Logs** - Lihat pesan dan riwayat aktivitas
- 📱 **Responsive Design** - UI yang responsif dan user-friendly

## 📋 Cara Menggunakan

### 1. Install Dependencies (jika belum)
```bash
npm install
```

### 2. Jalankan Dashboard Server
```bash
npm run dashboard
```
Server akan berjalan di `http://localhost:3000`

### 3. Akses Dashboard
Buka browser dan kunjungi:
```
http://localhost:3000
```

### 4. Jalankan Bot & Dashboard Bersamaan (Optional)
```bash
npm run dev
```
Ini akan menjalankan bot dan dashboard secara bersamaan (memerlukan `concurrently`)

## 📁 Struktur File

```
bot.whatsapp/
├── server.js              # Express server untuk dashboard
├── settings.json          # File pengaturan bot
├── package.json           # Dependencies
├── public/
│   ├── index.html         # Dashboard UI
│   ├── style.css          # Styling
│   └── script.js          # Frontend logic
└── index.js               # Bot utama
```

## 🔧 API Endpoints

### Settings
- `GET /api/settings` - Ambil semua pengaturan
- `POST /api/settings` - Update pengaturan

### Karyawan
- `GET /api/karyawan` - Ambil daftar karyawan
- `POST /api/karyawan` - Tambah karyawan baru
- `DELETE /api/karyawan/:nomorWA` - Hapus karyawan

### Status
- `GET /api/status` - Cek status bot
- `GET /health` - Health check

## ⚙️ Konfigurasi

Edit `settings.json` untuk mengubah pengaturan default:

```json
{
  "botName": "WhatsApp Bot",
  "botStatus": "Online",
  "autoReply": true,
  "autoReplyMessage": "Terima kasih telah menghubungi kami!",
  "welcomeMessage": "Selamat datang!",
  "adminNumbers": [],
  "blacklistNumbers": [],
  "responseDelay": 1000,
  "debugMode": false
}
```

## 🎨 Customization

### Mengubah Warna
Edit `public/style.css` dan ubah CSS variables:
```css
:root {
    --primary: #25D366;      /* Warna hijau WhatsApp */
    --secondary: #128C7E;    /* Warna tema sekunder */
    --danger: #E74C3C;       /* Warna danger/bahaya */
    --warning: #F39C12;      /* Warna warning */
}
```

### Menambah Fitur Baru
1. Tambahkan endpoint baru di `server.js`
2. Buat form/section baru di `public/index.html`
3. Tambahkan fungsi di `public/script.js`

## 🐛 Troubleshooting

### Dashboard tidak terbuka
- Pastikan server berjalan: `npm run dashboard`
- Cek port 3000 sudah bebas: `lsof -i :3000`
- Buka `http://localhost:3000` di browser

### Settings tidak tersimpan
- Pastikan file `settings.json` ada dan readable
- Check permission folder: `ls -la settings.json`
- Lihat error di console: `npm run dashboard` tanpa timeout

### Karyawan tidak tampil
- Cek file `karyawan.json` ada dan valid JSON
- Pastikan format nomor benar: `62812345678` (tanpa +)

## 📝 Notes

- Bot harus tetap berjalan saat menggunakan dashboard
- Gunakan nomor WA dengan format: `62` (bukan `+62`)
- Simpan settings secara berkala untuk mencegah kehilangan data

## 🔐 Security Tips

- Jalankan di network internal saja
- Ganti port default jika perlu
- Tambahkan authentication jika diperlukan
- Jangan expose dashboard ke internet tanpa SSL

## 📞 Support

Untuk bantuan lebih lanjut, silakan buat issue di GitHub.

---
**Version:** 1.0.0 | **Last Updated:** March 2026
