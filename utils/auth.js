const crypto = require('crypto')

// Hash password dengan salt
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
  return `${salt}:${hash}`
}

// Verify password
function verifyPassword(password, storedHash) {
  const [salt, hash] = storedHash.split(':')
  const hashVerify = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
  return hash === hashVerify
}

// Generate JWT-like token (simple implementation)
function generateToken(userId) {
  const payload = {
    userId,
    timestamp: Date.now(),
    random: crypto.randomBytes(8).toString('hex')
  }
  return Buffer.from(JSON.stringify(payload)).toString('base64')
}

// Verify token
function verifyToken(token) {
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString())
    // Token valid for 7 days
    const isExpired = (Date.now() - decoded.timestamp) > (7 * 24 * 60 * 60 * 1000)
    return !isExpired ? decoded : null
  } catch (error) {
    return null
  }
}

// Generate invoice/transaction ID
function generateInvoiceId() {
  return `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  generateInvoiceId
}
