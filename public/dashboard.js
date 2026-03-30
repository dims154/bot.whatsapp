// ===== CONFIGURATION =====
const API_BASE = 'http://localhost:3000/api'
let currentUser = null
let currentToken = null

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', async () => {
    await initializeDashboard()
})

async function initializeDashboard() {
    currentToken = localStorage.getItem('token')
    const userStr = localStorage.getItem('user')
    
    if (!currentToken || !userStr) {
        window.location.href = '/login.html'
        return
    }

    currentUser = JSON.parse(userStr)
    
    // Set user button
    document.getElementById('userBtn').textContent = `👤 ${currentUser.name}`
    document.getElementById('userName').textContent = currentUser.name
    document.getElementById('userEmail').textContent = currentUser.email
    document.getElementById('settingsName').value = currentUser.name
    document.getElementById('settingsEmail').value = currentUser.email
    
    // Show admin tab if user is admin
    if (currentUser.role === 'admin') {
        document.getElementById('adminTab').style.display = 'block'
    }

    // Load initial data
    await loadUserData()
    await loadGroups()
    await loadPaymentPlans()
    await loadTransactions()
    
    if (currentUser.role === 'admin') {
        await loadAllUsers()
    }

    // Setup event listeners
    setupEventListeners()
}

function setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            switchTab(btn.getAttribute('data-tab'))
        })
    })

    // Form submissions
    document.getElementById('groupForm')?.addEventListener('submit', handleAddGroup)
    document.getElementById('settingsForm')?.addEventListener('submit', e => e.preventDefault())
    document.getElementById('paymentForm')?.addEventListener('submit', handlePaymentVerify)

    // User dropdown
    document.getElementById('userBtn').addEventListener('click', () => {
        const dropdown = document.getElementById('userDropdown')
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none'
    })

    // Close dropdown on click outside
    document.addEventListener('click', (e) => {
        const userMenu = document.querySelector('.user-menu')
        if (!userMenu.contains(e.target)) {
            document.getElementById('userDropdown').style.display = 'none'
        }
    })
}

// ===== TAB NAVIGATION =====
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active')
    })
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active')
    })
    
    const tab = document.getElementById(tabName)
    if (tab) {
        tab.classList.add('active')
    }
    document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active')
}

// ===== USER DATA =====
async function loadUserData() {
    try {
        const res = await fetch(`${API_BASE}/auth/me`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        })
        
        if (res.ok) {
            const user = await res.json()
            currentUser = user
            document.getElementById('userPlan').textContent = user.subscription?.plan || 'Free'
            document.getElementById('userStatus').textContent = 
                (user.subscription?.active ? '✅ Aktif' : '❌ Tidak Aktif')
        }
    } catch (error) {
        console.error('Error loading user data:', error)
    }
}

// ===== GROUP MANAGEMENT =====
async function loadGroups() {
    try {
        const res = await fetch(`${API_BASE}/groups`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        })
        
        const data = await res.json()
        const groups = data.groups || []
        
        document.getElementById('groupCount').textContent = groups.length
        
        const container = document.getElementById('groupsList')
        if (groups.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">Belum ada grup terdaftar</p>'
            return
        }

        container.innerHTML = groups.map((group, idx) => `
            <div class="group-card">
                <div class="group-header">
                    <h3>${group.groupName}</h3>
                    <span class="status-badge ${group.botRunning ? 'active' : 'inactive'}">
                        ${group.botRunning ? '🟢 Running' : '🔴 Inactive'}
                    </span>
                </div>
                <p class="group-id">ID: ${group.groupId}</p>
                <p>${group.description || 'Tidak ada deskripsi'}</p>
                <div class="group-actions">
                    <button class="btn btn-small btn-primary" onclick="editGroup('${group.id}')">✏️ Edit</button>
                    <button class="btn btn-small btn-warning" onclick="activateGroup('${group.id}')">💳 Bayar & Aktifkan</button>
                    <button class="btn btn-small btn-danger" onclick="deleteGroup('${group.id}')">🗑️ Hapus</button>
                </div>
            </div>
        `).join('')
    } catch (error) {
        console.error('Error loading groups:', error)
        showToast('Gagal memuat grup', 'error')
    }
}

async function handleAddGroup(e) {
    e.preventDefault()
    
    const groupName = document.getElementById('groupName').value
    const groupId = document.getElementById('groupId').value
    const description = document.getElementById('groupDesc').value

    try {
        const res = await fetch(`${API_BASE}/groups`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ groupName, groupId, description })
        })

        const data = await res.json()

        if (res.ok) {
            showToast('Grup berhasil dibuat', 'success')
            document.getElementById('groupForm').reset()
            await loadGroups()
        } else {
            showToast(data.error || 'Gagal membuat grup', 'error')
        }
    } catch (error) {
        console.error('Error:', error)
        showToast('Gagal membuat grup', 'error')
    }
}

async function deleteGroup(groupId) {
    if (!confirm('Hapus grup ini? Tindakan ini tidak dapat dibatalkan.')) return

    try {
        const res = await fetch(`${API_BASE}/groups/${groupId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${currentToken}` }
        })

        if (res.ok) {
            showToast('Grup berhasil dihapus', 'success')
            await loadGroups()
        } else {
            showToast('Gagal menghapus grup', 'error')
        }
    } catch (error) {
        console.error('Error:', error)
        showToast('Gagal menghapus grup', 'error')
    }
}

async function activateGroup(groupId) {
    try {
        const res = await fetch(`${API_BASE}/groups`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        })
        
        const data = await res.json()
        const group = data.groups.find(g => g.id === groupId)
        
        if (!group) {
            showToast('Grup tidak ditemukan', 'error')
            return
        }

        // Simpan groupId untuk pembayaran
        localStorage.setItem('selectedGroupId', groupId)
        switchTab('payment')
        showToast('Pilih paket pembayaran untuk aktivasi bot', 'info')
    } catch (error) {
        console.error('Error:', error)
        showToast('Gagal memproses aktivasi', 'error')
    }
}

// ===== PAYMENT =====
async function loadPaymentPlans() {
    try {
        const res = await fetch(`${API_BASE}/pricing`)
        const data = await res.json()
        const plans = data.plans || {}

        const container = document.getElementById('plansContainer')
        container.innerHTML = Object.values(plans).map(plan => `
            <div class="plan-card">
                <h3>${plan.name}</h3>
                <div class="price">Rp ${plan.price.toLocaleString('id-ID')}</div>
                <p class="duration">${plan.duration} hari</p>
                <ul class="features">
                    ${plan.features.map(f => `<li>✓ ${f}</li>`).join('')}
                </ul>
                <button class="btn btn-primary btn-block" onclick="selectPaymentPlan('${plan.id}')">
                    Pilih Plan
                </button>
            </div>
        `).join('')
    } catch (error) {
        console.error('Error loading plans:', error)
        showToast('Gagal memuat paket pembayaran', 'error')
    }
}

async function selectPaymentPlan(planId) {
    const groupId = localStorage.getItem('selectedGroupId')
    const paymentMethod = 'transfer_bank' // Bisa dipilih user nantinya

    try {
        const res = await fetch(`${API_BASE}/payment/create`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                planId,
                groupId: groupId || null,
                paymentMethod
            })
        })

        const data = await res.json()

        if (res.ok) {
            showPaymentModal(data.transaction)
        } else {
            showToast(data.error || 'Gagal membuat transaksi', 'error')
        }
    } catch (error) {
        console.error('Error:', error)
        showToast('Gagal membuat transaksi', 'error')
    }
}

function showPaymentModal(transaction) {
    document.getElementById('invoiceId').value = transaction.id
    document.getElementById('paymentAmount').value = `Rp ${transaction.amount.toLocaleString('id-ID')}`
    document.getElementById('paymentMethod').textContent = 'Transfer Bank'
    
    const instructions = `
    1. Transfer ke rekening kami sesuai jumlah di atas
    2. Gunakan Kode Invoice sebagai Berita Transfer: ${transaction.id}
    3. Setelah transfer, masukkan Kode Verifikasi yang Anda terima
    4. Klik tombol "Verifikasi Pembayaran"
    
    ⏰ Transaksi berlaku hingga: ${new Date(transaction.expiresAt).toLocaleString('id-ID')}
    `
    
    document.getElementById('paymentInstructions').textContent = instructions
    document.getElementById('verificationCode').value = ''
    
    // Store transaction data
    sessionStorage.setItem('currentTransaction', JSON.stringify(transaction))
    
    document.getElementById('paymentModal').style.display = 'block'
}

function closePaymentModal() {
    document.getElementById('paymentModal').style.display = 'none'
}

async function handlePaymentVerify(e) {
    e.preventDefault()

    const transaction = JSON.parse(sessionStorage.getItem('currentTransaction'))
    const verificationCode = document.getElementById('verificationCode').value.toUpperCase()

    try {
        const res = await fetch(`${API_BASE}/payment/verify`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                invoiceId: transaction.id,
                verificationCode
            })
        })

        const data = await res.json()

        if (res.ok) {
            showToast(data.message, 'success')
            closePaymentModal()
            await loadUserData()
            await loadGroups()
            await loadTransactions()
            localStorage.removeItem('selectedGroupId')
        } else {
            showToast(data.error || 'Verifikasi gagal', 'error')
        }
    } catch (error) {
        console.error('Error:', error)
        showToast('Gagal memverifikasi pembayaran', 'error')
    }
}

async function loadTransactions() {
    try {
        const res = await fetch(`${API_BASE}/transactions`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        })

        const data = await res.json()
        const transactions = data.transactions || []

        // Recent transactions in dashboard
        const recentContainer = document.getElementById('recentTransactions')
        if (transactions.length === 0) {
            recentContainer.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">Belum ada transaksi</p>'
        } else {
            recentContainer.innerHTML = transactions.slice(-5).reverse().map(t => `
                <div class="transaction-item">
                    <div>
                        <p class="trans-id">${t.planId.toUpperCase()} - ${t.id}</p>
                        <p class="trans-date">${new Date(t.createdAt).toLocaleString('id-ID')}</p>
                    </div>
                    <div>
                        <p class="trans-amount">Rp ${t.amount.toLocaleString('id-ID')}</p>
                        <span class="badge ${t.status}">${t.status === 'completed' ? '✅ Selesai' : '⏳ Menunggu'}</span>
                    </div>
                </div>
            `).join('')
        }

        // All transactions
        const allContainer = document.getElementById('allTransactions')
        if (transactions.length === 0) {
            allContainer.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">Belum ada transaksi</p>'
        } else {
            allContainer.innerHTML = transactions.map(t => `
                <div class="transaction-item">
                    <div>
                        <p class="trans-id">${t.planId.toUpperCase()} - ${t.id}</p>
                        <p class="trans-date">${new Date(t.createdAt).toLocaleString('id-ID')}</p>
                    </div>
                    <div>
                        <p class="trans-amount">Rp ${t.amount.toLocaleString('id-ID')}</p>
                        <span class="badge ${t.status}">${t.status === 'completed' ? '✅ Selesai' : '⏳ Menunggu'}</span>
                    </div>
                </div>
            `).join('')
        }
    } catch (error) {
        console.error('Error loading transactions:', error)
    }
}

// ===== ADMIN FEATURES =====
async function loadAllUsers() {
    try {
        const res = await fetch(`${API_BASE}/admin/users`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        })

        const data = await res.json()
        const users = data.users || []

        const container = document.getElementById('usersList')
        if (users.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">Tidak ada user</p>'
            return
        }

        container.innerHTML = `
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Nama</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Plan</th>
                        <th>Aksi</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map(user => `
                        <tr>
                            <td>${user.name}</td>
                            <td>${user.email}</td>
                            <td>
                                <select onchange="changeUserRole('${user.id}', this.value)">
                                    <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
                                    <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                                </select>
                            </td>
                            <td>${user.status}</td>
                            <td>${user.subscription?.plan || 'Free'}</td>
                            <td>
                                <button class="btn btn-small" onclick="grantSubscription('${user.id}')">💳 Grant</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `
    } catch (error) {
        console.error('Error loading users:', error)
    }
}

async function changeUserRole(userId, newRole) {
    try {
        const res = await fetch(`${API_BASE}/admin/users/${userId}/role`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${currentToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ role: newRole })
        })

        if (res.ok) {
            showToast('Role berhasil diubah', 'success')
        } else {
            showToast('Gagal mengubah role', 'error')
        }
    } catch (error) {
        console.error('Error:', error)
        showToast('Gagal mengubah role', 'error')
    }
}

async function grantSubscription(userId) {
    const plan = prompt('Pilih plan (basic/pro/enterprise):', 'basic')
    if (!plan) return

    const days = prompt('Berapa hari validitas?', '30')
    if (!days) return

    try {
        const res = await fetch(`${API_BASE}/admin/users/${userId}/subscription`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${currentToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ plan, daysValid: parseInt(days) })
        })

        if (res.ok) {
            showToast('Subscription berhasil diberikan', 'success')
            await loadAllUsers()
        } else {
            showToast('Gagal memberikan subscription', 'error')
        }
    } catch (error) {
        console.error('Error:', error)
        showToast('Gagal memberikan subscription', 'error')
    }
}

// ===== UTILITIES =====
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast')
    toast.textContent = message
    toast.className = `toast show ${type}`
    
    setTimeout(() => {
        toast.classList.remove('show')
    }, 3000)
}

function showMessage(message, type = 'info') {
    showToast(message, type)
}

function editGroup(groupId) {
    showToast('Fitur edit grup akan segera hadir', 'info')
}

function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = '/login.html'
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('paymentModal')
    if (event.target == modal) {
        modal.style.display = 'none'
    }
}
