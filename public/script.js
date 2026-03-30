// ===== UTILITY FUNCTIONS =====
const API_BASE = 'http://localhost:3000/api'

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast')
    toast.textContent = message
    toast.className = `toast show ${type}`
    
    setTimeout(() => {
        toast.classList.remove('show')
    }, 3000)
}

function log(message) {
    console.log(`[Dashboard] ${message}`)
}

// ===== TAB NAVIGATION =====
document.querySelectorAll('.tab-btn').forEach(button => {
    button.addEventListener('click', () => {
        const tabName = button.getAttribute('data-tab')
        switchTab(tabName)
    })
})

function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active')
    })
    
    // Remove active from all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active')
    })
    
    // Show selected tab
    document.getElementById(tabName).classList.add('active')
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active')
    
    log(`Switched to tab: ${tabName}`)
}

// ===== SETTINGS =====
async function loadSettings() {
    try {
        const response = await fetch(`${API_BASE}/settings`)
        const settings = await response.json()
        
        document.getElementById('botName').value = settings.botName || ''
        document.getElementById('botStatus').value = settings.botStatus || 'Online'
        document.getElementById('autoReply').checked = settings.autoReply || false
        document.getElementById('autoReplyMessage').value = settings.autoReplyMessage || ''
        document.getElementById('welcomeMessage').value = settings.welcomeMessage || ''
        document.getElementById('responseDelay').value = settings.responseDelay || 1000
        document.getElementById('debugMode').checked = settings.debugMode || false
        
        // Load admin dan blacklist
        document.getElementById('adminList').innerHTML = ''
        document.getElementById('blacklistList').innerHTML = ''
        
        if (settings.adminNumbers) {
            settings.adminNumbers.forEach(num => renderAdminNumber(num))
        }
        
        if (settings.blacklistNumbers) {
            settings.blacklistNumbers.forEach(num => renderBlacklistNumber(num))
        }
        
        log('Settings loaded')
    } catch (error) {
        console.error('Error loading settings:', error)
        showToast('Gagal memuat settings', 'error')
    }
}

document.getElementById('settingsForm').addEventListener('submit', async (e) => {
    e.preventDefault()
    
    const settings = {
        botName: document.getElementById('botName').value,
        botStatus: document.getElementById('botStatus').value,
        autoReply: document.getElementById('autoReply').checked,
        autoReplyMessage: document.getElementById('autoReplyMessage').value,
        welcomeMessage: document.getElementById('welcomeMessage').value,
        responseDelay: parseInt(document.getElementById('responseDelay').value),
        debugMode: document.getElementById('debugMode').checked,
        adminNumbers: Array.from(document.querySelectorAll('#adminList .number-tag')).map(tag => tag.textContent.trim()),
        blacklistNumbers: Array.from(document.querySelectorAll('#blacklistList .number-tag')).map(tag => tag.textContent.trim())
    }
    
    try {
        const response = await fetch(`${API_BASE}/settings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(settings)
        })
        
        const result = await response.json()
        
        if (result.success) {
            showToast('Settings berhasil disimpan!', 'success')
            log('Settings saved')
        } else {
            showToast('Gagal menyimpan settings', 'error')
        }
    } catch (error) {
        console.error('Error saving settings:', error)
        showToast('Terjadi error saat menyimpan', 'error')
    }
})

// ===== ADMIN & BLACKLIST =====
function addAdmin() {
    const input = document.getElementById('adminNumber')
    const number = input.value.trim()
    
    if (!number) {
        showToast('Masukkan nomor terlebih dahulu', 'warning')
        return
    }
    
    renderAdminNumber(number)
    input.value = ''
    log(`Admin number added: ${number}`)
}

function addBlacklist() {
    const input = document.getElementById('blacklistNumber')
    const number = input.value.trim()
    
    if (!number) {
        showToast('Masukkan nomor terlebih dahulu', 'warning')
        return
    }
    
    renderBlacklistNumber(number)
    input.value = ''
    log(`Blacklist number added: ${number}`)
}

function renderAdminNumber(number) {
    const list = document.getElementById('adminList')
    const tag = document.createElement('div')
    tag.className = 'number-tag'
    tag.innerHTML = `
        ${number}
        <button onclick="this.parentElement.remove(); showToast('Nomor dihapus')">✕</button>
    `
    list.appendChild(tag)
}

function renderBlacklistNumber(number) {
    const list = document.getElementById('blacklistList')
    const tag = document.createElement('div')
    tag.className = 'number-tag'
    tag.innerHTML = `
        ${number}
        <button onclick="this.parentElement.remove(); showToast('Nomor dihapus')">✕</button>
    `
    list.appendChild(tag)
}

// ===== KARYAWAN MANAGEMENT =====
async function loadKaryawan() {
    try {
        const response = await fetch(`${API_BASE}/karyawan`)
        const data = await response.json()
        
        const tbody = document.getElementById('karyawanBody')
        tbody.innerHTML = ''
        
        let no = 1
        for (const [nomorWA, nama] of Object.entries(data)) {
            const row = document.createElement('tr')
            row.innerHTML = `
                <td>${no++}</td>
                <td>${nomorWA}</td>
                <td>${nama}</td>
                <td>
                    <button class="btn btn-danger btn-small" onclick="deleteKaryawan('${nomorWA}')">Hapus</button>
                </td>
            `
            tbody.appendChild(row)
        }
        
        if (no === 1) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #999;">Belum ada data karyawan</td></tr>'
        }
        
        log('Karyawan data loaded')
    } catch (error) {
        console.error('Error loading karyawan:', error)
        showToast('Gagal memuat data karyawan', 'error')
    }
}

document.getElementById('karyawanForm').addEventListener('submit', async (e) => {
    e.preventDefault()
    
    const nomorWA = document.getElementById('nomorWA').value.trim()
    const nama = document.getElementById('namaKaryawan').value.trim()
    
    if (!nomorWA || !nama) {
        showToast('Lengkapi semua data', 'warning')
        return
    }
    
    try {
        const response = await fetch(`${API_BASE}/karyawan`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nomorWA, nama })
        })
        
        const result = await response.json()
        
        if (result.success) {
            showToast('Karyawan berhasil ditambahkan', 'success')
            document.getElementById('karyawanForm').reset()
            loadKaryawan()
            log(`Karyawan added: ${nama}`)
        } else {
            showToast(result.error || 'Gagal menambahkan karyawan', 'error')
        }
    } catch (error) {
        console.error('Error adding karyawan:', error)
        showToast('Terjadi error', 'error')
    }
})

async function deleteKaryawan(nomorWA) {
    if (!confirm(`Hapus karyawan ini?`)) return
    
    try {
        const response = await fetch(`${API_BASE}/karyawan/${nomorWA}`, {
            method: 'DELETE'
        })
        
        const result = await response.json()
        
        if (result.success) {
            showToast('Karyawan berhasil dihapus', 'success')
            loadKaryawan()
            log(`Karyawan deleted: ${nomorWA}`)
        } else {
            showToast('Gagal menghapus karyawan', 'error')
        }
    } catch (error) {
        console.error('Error deleting karyawan:', error)
        showToast('Terjadi error', 'error')
    }
}

// ===== BOT STATUS =====
async function checkBotStatus() {
    try {
        const response = await fetch(`${API_BASE}/status`)
        const status = await response.json()
        
        const badge = document.getElementById('statusBadge')
        const statusDot = badge.querySelector('.status-dot')
        const statusText = document.getElementById('statusText')
        
        if (response.ok) {
            statusDot.classList.remove('disconnected')
            statusDot.classList.add('connected')
            statusText.textContent = 'Bot Connected'
        } else {
            statusDot.classList.remove('connected')
            statusDot.classList.add('disconnected')
            statusText.textContent = 'Bot Disconnected'
        }
    } catch (error) {
        const badge = document.getElementById('statusBadge')
        const statusDot = badge.querySelector('.status-dot')
        const statusText = document.getElementById('statusText')
        statusDot.classList.remove('connected')
        statusDot.classList.add('disconnected')
        statusText.textContent = 'Connection Error'
    }
}

function clearLogs() {
    if (confirm('Hapus semua logs?')) {
        document.getElementById('logsList').innerHTML = '<p style="text-align: center; color: #999;">Logs telah dihapus</p>'
        showToast('Logs berhasil dihapus', 'success')
    }
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    log('Dashboard initialized')
    loadSettings()
    loadKaryawan()
    checkBotStatus()
    
    // Check bot status every 5 seconds
    setInterval(checkBotStatus, 5000)
})
