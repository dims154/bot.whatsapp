const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const fs = require('fs')
const path = require('path')
const { hashPassword, verifyPassword, generateToken, verifyToken, generateInvoiceId } = require('./utils/auth')
const db = require('./utils/db')

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(cors())
app.use(bodyParser.json({ limit: '10mb' }))
app.use(express.static('public'))

db.ensureDataDir()

// ===== MIDDLEWARE AUTHENTICATION =====
function checkAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  
  if (!token) {
    return res.status(401).json({ error: 'Token tidak ditemukan' })
  }
  
  const decoded = verifyToken(token)
  if (!decoded) {
    return res.status(401).json({ error: 'Token tidak valid atau sudah expired' })
  }
  
  req.userId = decoded.userId
  next()
}

function checkAdminAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  
  if (!token) {
    return res.status(401).json({ error: 'Token tidak ditemukan' })
  }
  
  const decoded = verifyToken(token)
  if (!decoded) {
    return res.status(401).json({ error: 'Token tidak valid' })
  }
  
  const users = db.readData('users', {})
  const user = users[decoded.userId]
  
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Anda tidak memiliki akses admin' })
  }
  
  req.userId = decoded.userId
  req.user = user
  next()
}

// ===== AUTH ROUTES =====

// Register
app.post('/api/auth/register', (req, res) => {
  try {
    const { email, password, name } = req.body
    
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, dan nama harus diisi' })
    }
    
    const users = db.readData('users', {})
    
    if (users[email]) {
      return res.status(400).json({ error: 'Email sudah terdaftar' })
    }
    
    const userId = email
    const hashedPassword = hashPassword(password)
    
    users[userId] = {
      id: userId,
      email,
      name,
      password: hashedPassword,
      role: 'user',
      createdAt: new Date().toISOString(),
      status: 'active',
      subscription: {
        plan: 'free',
        expiresAt: null,
        active: false
      }
    }
    
    db.saveData('users', users)
    
    const token = generateToken(userId)
    
    res.json({
      success: true,
      message: 'Akun berhasil dibuat',
      token,
      user: {
        id: userId,
        email,
        name,
        role: users[userId].role
      }
    })
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({ error: 'Gagal membuat akun' })
  }
})

// Login
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email dan password harus diisi' })
    }
    
    const users = db.readData('users', {})
    const user = users[email]
    
    if (!user || !verifyPassword(password, user.password)) {
      return res.status(401).json({ error: 'Email atau password salah' })
    }
    
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Akun Anda telah dinonaktifkan' })
    }
    
    const token = generateToken(email)
    
    res.json({
      success: true,
      message: 'Login berhasil',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        subscription: user.subscription
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Gagal login' })
  }
})

// Get current user
app.get('/api/auth/me', checkAuth, (req, res) => {
  try {
    const users = db.readData('users', {})
    const user = users[req.userId]
    
    if (!user) {
      return res.status(404).json({ error: 'User tidak ditemukan' })
    }
    
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      subscription: user.subscription
    })
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil data user' })
  }
})

// ===== ADMIN ROUTES - USER MANAGEMENT =====

// Get all users (admin only)
app.get('/api/admin/users', checkAdminAuth, (req, res) => {
  try {
    const users = db.readData('users', {})
    const userList = Object.values(users).map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      status: u.status,
      subscription: u.subscription,
      createdAt: u.createdAt
    }))
    
    res.json({ success: true, users: userList })
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil data user' })
  }
})

// Update user role (admin only)
app.put('/api/admin/users/:userId/role', checkAdminAuth, (req, res) => {
  try {
    const { userId } = req.params
    const { role } = req.body
    
    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ error: 'Role tidak valid' })
    }
    
    const users = db.readData('users', {})
    if (!users[userId]) {
      return res.status(404).json({ error: 'User tidak ditemukan' })
    }
    
    users[userId].role = role
    db.saveData('users', users)
    
    res.json({
      success: true,
      message: `Role ${userId} berhasil diubah menjadi ${role}`,
      user: users[userId]
    })
  } catch (error) {
    res.status(500).json({ error: 'Gagal update role' })
  }
})

// Update user subscription (admin only)
app.put('/api/admin/users/:userId/subscription', checkAdminAuth, (req, res) => {
  try {
    const { userId } = req.params
    const { plan, daysValid } = req.body
    
    const users = db.readData('users', {})
    if (!users[userId]) {
      return res.status(404).json({ error: 'User tidak ditemukan' })
    }
    
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + daysValid)
    
    users[userId].subscription = {
      plan,
      expiresAt: expiresAt.toISOString(),
      active: true
    }
    
    db.saveData('users', users)
    
    res.json({
      success: true,
      message: `Subscription ${userId} berhasil diupdate`,
      subscription: users[userId].subscription
    })
  } catch (error) {
    res.status(500).json({ error: 'Gagal update subscription' })
  }
})

// ===== GROUP MANAGEMENT =====

// Get user groups
app.get('/api/groups', checkAuth, (req, res) => {
  try {
    const groups = db.readData('groups', [])
    const userGroups = groups.filter(g => g.ownerId === req.userId)
    
    res.json({
      success: true,
      groups: userGroups
    })
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil grup' })
  }
})

// Create new group
app.post('/api/groups', checkAuth, (req, res) => {
  try {
    const { groupName, groupId, description, botSettings } = req.body
    
    if (!groupName || !groupId) {
      return res.status(400).json({ error: 'Nama grup dan ID grup harus diisi' })
    }
    
    const groups = db.readData('groups', [])
    
    if (groups.find(g => g.groupId === groupId && g.ownerId === req.userId)) {
      return res.status(400).json({ error: 'Grup dengan ID ini sudah ada' })
    }
    
    const newGroup = {
      id: `${req.userId}-${Date.now()}`,
      ownerId: req.userId,
      groupName,
      groupId,
      description: description || '',
      botSettings: botSettings || getDefaultBotSettings(),
      members: [],
      status: 'active',
      createdAt: new Date().toISOString(),
      botRunning: false,
      lastPayment: null
    }
    
    groups.push(newGroup)
    db.saveData('groups', groups)
    
    res.json({
      success: true,
      message: 'Grup berhasil dibuat',
      group: newGroup
    })
  } catch (error) {
    console.error('Error creating group:', error)
    res.status(500).json({ error: 'Gagal membuat grup' })
  }
})

// Update group settings
app.put('/api/groups/:groupId', checkAuth, (req, res) => {
  try {
    const { groupId } = req.params
    const { groupName, description, botSettings } = req.body
    
    const groups = db.readData('groups', [])
    const groupIndex = groups.findIndex(g => g.id === groupId && g.ownerId === req.userId)
    
    if (groupIndex < 0) {
      return res.status(404).json({ error: 'Grup tidak ditemukan' })
    }
    
    groups[groupIndex].groupName = groupName || groups[groupIndex].groupName
    groups[groupIndex].description = description || groups[groupIndex].description
    groups[groupIndex].botSettings = botSettings || groups[groupIndex].botSettings
    groups[groupIndex].updatedAt = new Date().toISOString()
    
    db.saveData('groups', groups)
    
    res.json({
      success: true,
      message: 'Grup berhasil diupdate',
      group: groups[groupIndex]
    })
  } catch (error) {
    res.status(500).json({ error: 'Gagal update grup' })
  }
})

// Delete group
app.delete('/api/groups/:groupId', checkAuth, (req, res) => {
  try {
    const { groupId } = req.params
    
    const groups = db.readData('groups', [])
    const filtered = groups.filter(g => !(g.id === groupId && g.ownerId === req.userId))
    
    db.saveData('groups', filtered)
    
    res.json({
      success: true,
      message: 'Grup berhasil dihapus'
    })
  } catch (error) {
    res.status(500).json({ error: 'Gagal menghapus grup' })
  }
})

// ===== PAYMENT / TRANSACTION =====

// Get pricing plans
app.get('/api/pricing', (req, res) => {
  const plans = {
    basic: {
      id: 'basic',
      name: 'Basic',
      price: 50000,
      currency: 'IDR',
      duration: 30,
      features: ['1 Grup', 'Auto Reply', 'Member Management']
    },
    pro: {
      id: 'pro',
      name: 'Pro',
      price: 100000,
      currency: 'IDR',
      duration: 30,
      features: ['Unlimited Grup', 'Advanced Auto Reply', 'Member Management', 'Analytics']
    },
    enterprise: {
      id: 'enterprise',
      name: 'Enterprise',
      price: 500000,
      currency: 'IDR',
      duration: 30,
      features: ['Unlimited Grup', 'Custom Features', 'Priority Support', 'Custom Analytics']
    }
  }
  
  res.json({ success: true, plans })
})

// Create payment/transaction
app.post('/api/payment/create', checkAuth, (req, res) => {
  try {
    const { planId, groupId, paymentMethod } = req.body
    
    if (!planId || !paymentMethod) {
      return res.status(400).json({ error: 'Plan dan metode pembayaran harus diisi' })
    }
    
    const plans = {
      basic: { price: 50000, duration: 30 },
      pro: { price: 100000, duration: 30 },
      enterprise: { price: 500000, duration: 30 }
    }
    
    const plan = plans[planId]
    if (!plan) {
      return res.status(400).json({ error: 'Plan tidak valid' })
    }
    
    const invoiceId = generateInvoiceId()
    const transaction = {
      id: invoiceId,
      userId: req.userId,
      groupId: groupId || null,
      planId,
      amount: plan.price,
      paymentMethod,
      status: 'pending',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      paidAt: null,
      verificationCode: generateInvoiceId().substring(0, 8).toUpperCase()
    }
    
    const transactions = db.readData('transactions', [])
    transactions.push(transaction)
    db.saveData('transactions', transactions)
    
    res.json({
      success: true,
      message: 'Invoice berhasil dibuat',
      transaction: {
        ...transaction,
        amount: plan.price
      }
    })
  } catch (error) {
    console.error('Payment creation error:', error)
    res.status(500).json({ error: 'Gagal membuat transaksi' })
  }
})

// Verify payment
app.post('/api/payment/verify', checkAuth, (req, res) => {
  try {
    const { invoiceId, verificationCode } = req.body
    
    if (!invoiceId || !verificationCode) {
      return res.status(400).json({ error: 'Invoice ID dan kode verifikasi harus diisi' })
    }
    
    const transactions = db.readData('transactions', [])
    const transactionIndex = transactions.findIndex(t => t.id === invoiceId)
    
    if (transactionIndex < 0) {
      return res.status(404).json({ error: 'Transaksi tidak ditemukan' })
    }
    
    const transaction = transactions[transactionIndex]
    
    if (transaction.userId !== req.userId) {
      return res.status(403).json({ error: 'Transaksi bukan milik Anda' })
    }
    
    if (transaction.status !== 'pending') {
      return res.status(400).json({ error: 'Transaksi sudah diproses' })
    }
    
    if (transaction.verificationCode !== verificationCode) {
      return res.status(400).json({ error: 'Kode verifikasi salah' })
    }
    
    // Mark as paid
    transactions[transactionIndex].status = 'completed'
    transactions[transactionIndex].paidAt = new Date().toISOString()
    
    db.saveData('transactions', transactions)
    
    // Update subscription
    const users = db.readData('users', {})
    const plan = { basic: 30, pro: 30, enterprise: 30 }[transaction.planId]
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + plan)
    
    users[req.userId].subscription = {
      plan: transaction.planId,
      expiresAt: expiresAt.toISOString(),
      active: true
    }
    
    db.saveData('users', users)
    
    // Activate bot for group if specified
    if (transaction.groupId) {
      const groups = db.readData('groups', [])
      const groupIndex = groups.findIndex(g => g.id === transaction.groupId)
      if (groupIndex >= 0) {
        groups[groupIndex].botRunning = true
        groups[groupIndex].lastPayment = new Date().toISOString()
        db.saveData('groups', groups)
      }
    }
    
    res.json({
      success: true,
      message: 'Pembayaran berhasil diverifikasi. Bot sekarang aktif!',
      transaction: transactions[transactionIndex],
      subscription: users[req.userId].subscription
    })
  } catch (error) {
    console.error('Payment verification error:', error)
    res.status(500).json({ error: 'Gagal memverifikasi pembayaran' })
  }
})

// Get user transactions
app.get('/api/transactions', checkAuth, (req, res) => {
  try {
    const transactions = db.readData('transactions', [])
    const userTransactions = transactions.filter(t => t.userId === req.userId)
    
    res.json({
      success: true,
      transactions: userTransactions
    })
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil transaksi' })
  }
})

// ===== HELPER FUNCTIONS =====
function getDefaultBotSettings() {
  return {
    autoReply: true,
    autoReplyMessage: 'Terima kasih telah menghubungi kami!',
    welcomeMessage: 'Selamat datang!',
    responseDelay: 1000,
    debugMode: false,
    keywords: {},
    autoResponders: []
  }
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.listen(PORT, () => {
  console.log(`🌐 Dashboard server running on http://localhost:${PORT}`)
  console.log(`📊 Buka http://localhost:${PORT} di browser`)
})
