# bot.whatsapp

Bot WhatsApp sederhana menggunakan Baileys.

## Cara pakai

1. Jalankan `npm install`.
2. Jalankan `npm start`.
3. Scan QR code yang muncul di terminal dengan WhatsApp di ponsel.
4. Kirim pesan ke nomor bot.

## Contoh perintah

- `ping` → bot membalas `pong`
- `halo` → bot menyapa kembali
- `.say <teks>` → bot mengulangi teks yang dikirimkan

## File penting
- `index.js` - logika utama bot
- `auth_info.json` - data autentikasi WhatsApp (dibuat otomatis)
- `baileys_store.json` - penyimpanan sementara sesi chat
