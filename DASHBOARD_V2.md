# 📱 WhatsApp Bot Dashboard v2.0
## Multi-Group Management System with Payment & Admin Control

Sistem dashboard lengkap untuk mengelola WhatsApp Bot dengan fitur multi-group, payment system, dan admin control.

---

## 🎯 Fitur Utama

### 1. **🔐 Authentication & User Management**
- Register/Login dengan email & password (hashed & secure)
- Role-based access control (User & Admin)
- User session management dengan token

### 2. **👥 Multi-Group Management**
- Buat dan kelola multiple WhatsApp groups
- Custom settings per grup
- Track bot status per grup (Running/Inactive)

### 3. **💳 Payment & Subscription System**
- 3 pricing plans: Basic, Pro, Enterprise
- Payment verification dengan kode invoice
- Auto-activate bot setelah pembayaran berhasil
- Riwayat transaksi lengkap

### 4. **👨‍💼 Admin Dashboard**
- Manage semua user (lihat, ubah role)
- Grant subscription ke user
- Monitor semua transaksi

### 5. **⚙️ Flexible Settings**
- Custom bot settings per grup
- Auto-reply configuration
- Member management
- Keyword routing

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd /workspaces/bot.whatsapp
npm install
```

### 2. Jalankan Dashboard Server
```bash
npm run dashboard
```

### 3. Akses Dashboard
```
http://localhost:3000
```

### 4. Login atau Register
- **Register**: Buat akun baru
- **Login**: Masuk dengan email & password

---

## 📊 Struktur Dashboard

### Pages
- `login.html` - Login page
- `register.html` - Registration page
- `index.html` (dashboard.html) - Main dashboard
- `auth.css` - Auth page styling
- `style.css` - Dashboard styling
- `script.js` - Old script (deprecated)
- `dashboard.js` - New dashboard logic

### Server (API)
- `server.js` - Express server dengan semua endpoints
- `utils/auth.js` - Authentication utilities (hash, token, verification)
- `utils/db.js` - Database helper untuk JSON storage

### Data Storage
- `data/users.json` - User accounts & subscription data
- `data/groups.json` - Group configurations per user
- `data/transactions.json` - Payment transaction history

---

## 📡 API Endpoints

### Authentication
```
POST   /api/auth/register       - Register user baru
POST   /api/auth/login          - Login
GET    /api/auth/me             - Get user profile (auth required)
```

### Groups
```
GET    /api/groups              - Get user's groups (auth required)
POST   /api/groups              - Create new group (auth required)
PUT    /api/groups/:groupId     - Update group settings (auth required)
DELETE /api/groups/:groupId     - Delete group (auth required)
```

### Payment
```
GET    /api/pricing             - Get available plans
POST   /api/payment/create      - Create invoice (auth required)
POST   /api/payment/verify      - Verify & complete payment (auth required)
GET    /api/transactions        - Get user's transactions (auth required)
```

### Admin (admin only)
```
GET    /api/admin/users         - Get all users
PUT    /api/admin/users/:userId/role           - Change user role
PUT    /api/admin/users/:userId/subscription   - Grant subscription
```

### Health
```
GET    /health                  - Server health check
```

---

## 🔑 User Roles

### User (Default)
- ✅ Buat & manage grup sendiri
- ✅ Akses settings dashboard
- ✅ Lihat & manage transaksi sendiri
- ❌ Tidak bisa manage user lain

### Admin
- ✅ Semua akses user
- ✅ Manage semua user
- ✅ Grant subscription
- ✅ View semua transaksi
- ✅ Change user roles

---

## 💳 Payment Plans

### Basic - Rp 50.000 (30 hari)
- 1 Grup
- Auto Reply
- Member Management

### Pro - Rp 100.000 (30 hari)
- Unlimited Grup
- Advanced Auto Reply
- Member Management
- Analytics

### Enterprise - Rp 500.000 (30 hari)
- Unlimited Grup
- Custom Features
- Priority Support
- Custom Analytics

---

## 🔐 Security

### Password Storage
- Hashing dengan PBKDF2 + salt
- Tidak ada plain text password
- Secure comparison

### Token Management
- Base64 encoded tokens
- Expiry: 7 days
- Required untuk semua protected endpoints

### Database Security
- JSON storage (bisa migrate ke database)
- No sensitive data exposure
- Data folder isolated

---

## 📝 Data Structure

### User Object
```json
{
  "id": "user@email.com",
  "email": "user@email.com",
  "name": "John Doe",
  "password": "salt:hash",
  "role": "user",
  "createdAt": "2026-03-29T10:00:00.000Z",
  "status": "active",
  "subscription": {
    "plan": "pro",
    "expiresAt": "2026-04-29T10:00:00.000Z",
    "active": true
  }
}
```

### Group Object
```json
{
  "id": "userid-timestamp",
  "ownerId": "user@email.com",
  "groupName": "Sales Team",
  "groupId": "62xxx-xxx@g.us",
  "description": "Group untuk sales team",
  "botSettings": { ... },
  "members": [],
  "status": "active",
  "createdAt": "2026-03-29T10:00:00.000Z",
  "botRunning": true,
  "lastPayment": "2026-03-29T10:00:00.000Z"
}
```

### Transaction Object
```json
{
  "id": "INV-timestamp-random",
  "userId": "user@email.com",
  "groupId": "group-id atau null",
  "planId": "pro",
  "amount": 100000,
  "paymentMethod": "transfer_bank",
  "status": "completed",
  "expiresAt": "2026-03-30T10:00:00.000Z",
  "createdAt": "2026-03-29T10:00:00.000Z",
  "paidAt": "2026-03-29T11:00:00.000Z",
  "verificationCode": "ABC123XY"
}
```

---

## 🛠️ Development Tips

### Menjalankan Server Saja
```bash
npm run dashboard
```

### Menjalankan Bot dan Dashboard
```bash
npm run dev
```
(Memerlukan `concurrently` - sudah installed)

### Testing Endpoints
```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"pass123","name":"Test"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"pass123"}'

# Get current user
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🎨 Customization

### Mengubah Warna
Edit `public/style.css` dan `public/auth.css`:
```css
:root {
    --primary: #25D366;      /* Hijau WhatsApp */
    --secondary: #128C7E;    /* Tema sekunder */
    --danger: #E74C3C;       /* Merah error */
}
```

### Menambah Plan Baru
Edit di `server.js`:
```javascript
const plans = {
    basic: { ... },
    pro: { ... },
    enterprise: { ... },
    custom: { price: XXX, duration: 30 }  // Tambah di sini
}
```

---

## 🐛 Troubleshooting

### Port 3000 Sudah Digunakan
```bash
# Cari process yang menggunakan port 3000
lsof -i :3000

# Kill process (ganti PID dengan nilai dari lsof)
kill -9 PID
```

### Login Gagal
- Verifikasi email & password benar
- Pastikan user sudah terdaftar
- Cek file `data/users.json` ada

### Grup Tidak Muncul
- Pastikan sudah login
- Check browser console untuk error
- Verifikasi token masih valid

### Payment Error
- Pastikan invoice ID benar
- Cek verification code cocok
- Transaksi belum expired?

---

## 📈 Roadmap

### Phase 2
- [ ] Database integration (PostgreSQL/MongoDB)
- [ ] Email verification
- [ ] Two-factor authentication
- [ ] Webhook untuk payment gateway
- [ ] Real payment gateway integration
- [ ] API documentation (Swagger)
- [ ] Mobile app

### Phase 3
- [ ] Advanced analytics
- [ ] Team collaboration
- [ ] Custom branding
- [ ] Auto-scaling
- [ ] Advanced automation rules

---

## 📞 Support & Contributing

Untuk bantuan atau request fitur, silakan buat issue di GitHub repository.

---

## 📄 License

MIT License - Bebas digunakan untuk project pribadi maupun komersial

---

**Version:** 2.0.0  
**Last Updated:** March 30, 2026  
**Created with ❤️ for WhatsApp Bot Management**
