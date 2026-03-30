const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, jidNormalizedUser } = require('@whiskeysockets/baileys')
const pino = require('pino')
const qrcode = require('qrcode-terminal')
const fs = require('fs')
const PDFDocument = require('pdfkit')

const authFolder = './auth_info'
const reportPath = './pendapatan.json'
const karyawanPath = './karyawan.json'

function getNamaPencuci(washerId) {
  if (!washerId || washerId === 'Tidak diketahui') return 'Tidak diketahui'
  const daftarKaryawan = readKaryawanData()
  const nomorWA = washerId.split('@')[0]
  return daftarKaryawan[nomorWA] || nomorWA // Kembalikan nama jika terdaftar, jika tidak kembalikan nomornya
}

function readKaryawanData() {
  if (!fs.existsSync(karyawanPath)) {
    return {}
  }
  try {
    const fileContent = fs.readFileSync(karyawanPath, 'utf-8')
    return JSON.parse(fileContent)
  } catch (error) {
    console.error('Gagal membaca atau parse file karyawan.json:', error)
    return {}
  }
}

function getMessageType(message) {
  const type = Object.keys(message)[0]
  const map = {
    conversation: 'text',
    extendedTextMessage: 'text',
    imageMessage: 'image',
    videoMessage: 'video',
    stickerMessage: 'sticker',
    audioMessage: 'audio',
    documentMessage: 'document',
    contactMessage: 'contact',
    locationMessage: 'location',
    liveLocationMessage: 'live location',
    contactsArrayMessage: 'contacts',
    reactionMessage: 'reaction',
    buttonsResponseMessage: 'button',
    listResponseMessage: 'list',
    ephemeralMessage: 'ephemeral',
    pollCreationMessage: 'poll',
  }
  return map[type] || type
}

function getMediaFileName(message) {
  return message.imageMessage?.fileName || message.videoMessage?.fileName || message.documentMessage?.fileName || message.audioMessage?.fileName || null
}

function readReportData() {
  if (!fs.existsSync(reportPath)) {
    return []
  }
  try {
    const fileContent = fs.readFileSync(reportPath, 'utf-8')
    return JSON.parse(fileContent)
  } catch (error) {
    console.error('Gagal membaca atau parse file pendapatan.json:', error)
    return []
  }
}

function writeReportData(data) {
  fs.writeFileSync(reportPath, JSON.stringify(data, null, 2))
}

function writeKaryawanData(data) {
  fs.writeFileSync(karyawanPath, JSON.stringify(data, null, 2))
}

async function sendMainMenu(sock, chatId) {
  const text = '*Menu Bot WhatsApp*\n\nPilih kategori menu di bawah ini:\n\n👉 *admin_menu*\n👉 *group_menu*\n👉 *ai_menu*\n\n_Ketik salah satu menu di atas untuk masuk ke submenu._'
  await sock.sendMessage(chatId, { 
    image: { url: 'https://picsum.photos/800/400' }, // Ganti dengan link gambar aslimu
    caption: text 
  })
}

async function sendAdminMenu(sock, chatId) {
  const text = '*ADMIN MENU*\n\nPilih aksi:\n\n👉 *ping*\n👉 *help*\n👉 *back_main* (Kembali)\n\n_Ketik perintah di atas untuk menjalankan._'
  await sock.sendMessage(chatId, { text })
}

async function sendGroupMenu(sock, chatId) {
  const text = '*GROUP MENU*\n\nPilih aksi grup:\n\n👉 *.say <teks>*\n👉 *back_main* (Kembali)'
  await sock.sendMessage(chatId, { text })
}

async function sendAiMenu(sock, chatId) {
  const text = '*AI MENU*\n\nPilih aksi AI:\n\n👉 *.say <teks>*\n👉 *back_main* (Kembali)'
  await sock.sendMessage(chatId, { text })
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(authFolder)
  const { version, isLatest } = await fetchLatestBaileysVersion()
  console.log('Using Baileys version', version.join('.'), isLatest ? '(latest)' : '')

  const sock = makeWASocket({
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    auth: state,
    version,
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update
    if (qr) {
      console.log('Scan this QR code with WhatsApp:')
      qrcode.generate(qr, { small: true })
    }

    if (connection === 'open') {
      console.log('Bot is connected to WhatsApp')
    }

    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode
      const reasonName = DisconnectReason[reason] || 'unknown'
      console.log(`Connection closed: ${reason} (${reasonName})`)
      if (reason !== DisconnectReason.loggedOut) {
        if (reason === DisconnectReason.connectionReplaced) {
          console.log('Session was replaced by another login. Reconnecting...')
        } else {
          console.log('Reconnecting...')
        }
        startBot()
      } else {
        console.log('Logged out. Delete auth_info folder and scan QR again.')
      }
    }
  })

  sock.ev.on('messages.upsert', async (m) => {
    if (m.type !== 'notify') return
    const msg = m.messages[0]
    if (!msg.message || msg.key.remoteJid === 'status@broadcast') return
    if (msg.key.fromMe) return

    const chatId = msg.key.remoteJid // ID Grup atau Chat Pribadi (tempat bot harus membalas)
    const isGroup = chatId.endsWith('@g.us')
    const senderId = jidNormalizedUser(isGroup ? msg.key.participant : chatId) // ID Anggota/Orang yang mengetik pesan
    const chatType = isGroup ? 'Group' : 'Chat'
    const msgType = getMessageType(msg.message)
    const mediaFileName = getMediaFileName(msg.message)
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || msg.message.videoMessage?.caption || msg.message.documentMessage?.caption || ''
    
    const reply = (text || '').trim().toLowerCase()

    // --- PENGATURAN ID GRUP CUCIAN ---
    const GRUP_CUCIAN = '120363388575171133@g.us' // ⚠️ GANTI DENGAN ID GRUP ASLI KAMU!

    // 1. Fitur untuk mengetahui ID Grup (dijalankan sebelum pengecekan grup)
    if (reply === '.id') {
      await sock.sendMessage(chatId, { text: `ID Obrolan/Grup ini adalah:\n*${chatId}*` }, { quoted: msg })
      return
    }

    // 2. BATASI BOT: Jika pesan BUKAN dari Grup Cucian yang ditentukan, bot akan diam (mengabaikan)
    if (chatId !== GRUP_CUCIAN) {
      return
    }
    
    if (!text) {
      console.log(`\n[${chatType}] ${senderId} in ${chatId} sent a ${msgType} message` + (mediaFileName ? ` [file: ${mediaFileName}]` : ''))
      return
    }

    console.log(`\n[${chatType}] ${senderId} in ${chatId} (${msgType}): ${text}` + (mediaFileName ? ` [file: ${mediaFileName}]` : ''))

    if (reply === 'menu' || reply === '.menu' || reply === 'help' || reply === 'admin_menu' || reply === 'group_menu' || reply === 'ai_menu' || reply === 'back_main') {
      if (reply === 'menu' || reply === '.menu' || reply === 'help' || reply === 'back_main') {
        await sendMainMenu(sock, chatId)
      } else if (reply === 'admin_menu') {
        await sendAdminMenu(sock, chatId)
      } else if (reply === 'group_menu') {
        await sendGroupMenu(sock, chatId)
      } else if (reply === 'ai_menu') {
        await sendAiMenu(sock, chatId)
      }
      return
    }

    let response = ''

    // Fitur untuk mendaftar sebagai karyawan
    if (reply.startsWith('.daftar ')) {
      const nama = text.split(' ').slice(1).join(' ')
      if (!nama) {
        response = 'Format salah. Gunakan: *.daftar <Nama Lengkap Anda>*'
      } else {
        const nomorWA = senderId.split('@')[0]
        const daftarKaryawan = readKaryawanData()

        const namaLama = daftarKaryawan[nomorWA]
        daftarKaryawan[nomorWA] = nama
        writeKaryawanData(daftarKaryawan)

        response = namaLama 
          ? `✅ Nama berhasil diperbarui dari *${namaLama}* menjadi *${nama}*.`
          : `✅ Selamat, *${nama}*! Anda telah terdaftar sebagai karyawan.`
      }
    }

    // --- LOGIKA PERINTAH ---

    // Perintah khusus Grup Cucian
    else if (reply.startsWith('.cuci ')) {
      const args = text.slice(6).trim().split(' ')
      const jenis = args[0].toLowerCase()
      const description = args.slice(1).join(' ') || 'Tanpa plat/keterangan'

      let amount = 0
      if (jenis === 'kecil') amount = 12000
      else if (jenis === 'sedang') amount = 15000
      else if (jenis === 'besar') amount = 20000

      if (amount === 0) {
        response = 'Format salah. Gunakan: *.cuci kecil/sedang/besar [plat nomor]*\nContoh: .cuci sedang B 1234 ABC'
      } else {
        const today = new Date().toISOString().slice(0, 10)
        const allData = readReportData()
        allData.push({ date: today, amount, description, jenis, washerId: senderId })
        writeReportData(allData)
        // Alih-alih membalas dengan teks, berikan reaksi centang pada pesan
        await sock.sendMessage(chatId, {
          react: {
            text: '✅',
            key: msg.key
          }
        })
      }
    } else if (reply === '.rekap') {
      const today = new Date().toISOString().slice(0, 10)
      const allData = readReportData()
      const todaysData = allData.filter(item => item.date === today)

      if (todaysData.length === 0) {
        response = 'Belum ada data cucian yang tercatat untuk hari ini.'
      } else {
        // Kelompokkan data berdasarkan pencuci (washerId)
        const groupedData = {}
        todaysData.forEach(item => {
          const wid = item.washerId || 'Tidak diketahui'
          if (!groupedData[wid]) groupedData[wid] = []
          groupedData[wid].push(item)
        })

        let textRekap = `*REKAP CUCIAN HARI INI*\nTanggal: ${new Date().toLocaleDateString('id-ID')}\n\n`
        let grandTotal = 0

        for (const [washerId, items] of Object.entries(groupedData)) {
          const namaPencuci = getNamaPencuci(washerId)
          textRekap += `👷 *Pencuci: ${namaPencuci}*\n`
          
          let washerTotal = 0
          items.forEach((item, index) => {
            textRekap += `  ${index + 1}. Motor ${item.jenis} - ${item.description} (Rp ${item.amount.toLocaleString('id-ID')})\n`
            washerTotal += item.amount
          })
          
          textRekap += `  *Subtotal: Rp ${washerTotal.toLocaleString('id-ID')}*\n\n`
          grandTotal += washerTotal
        }

        textRekap += `💰 *TOTAL KESELURUHAN: Rp ${grandTotal.toLocaleString('id-ID')}*`
        response = textRekap
      }
    } else if (reply === '.laporan') {
      const today = new Date().toISOString().slice(0, 10)
      const allData = readReportData()
      const todaysData = allData.filter(item => item.date === today)

      if (todaysData.length === 0) {
        response = 'Belum ada pendapatan yang dicatat untuk hari ini.'
      } else {
        const pdfPath = './laporan-harian.pdf'
        const doc = new PDFDocument({ margin: 50 })
        const writeStream = fs.createWriteStream(pdfPath)
        doc.pipe(writeStream)

        // --- Isi PDF ---
        doc.fontSize(20).text('Laporan Harian Cucian Motor', { align: 'center' })
        doc.fontSize(12).text(`Tanggal: ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`, { align: 'center' })
        doc.moveDown(2)

        // Kelompokkan data berdasarkan pencuci (washerId)
        const groupedData = {}
        todaysData.forEach(item => {
          const wid = item.washerId || 'Tidak diketahui'
          if (!groupedData[wid]) groupedData[wid] = []
          groupedData[wid].push(item)
        })

        let grandTotal = 0
        const descriptionX = 50
        const typeX = 250
        const amountX = 400

        for (const [washerId, items] of Object.entries(groupedData)) {
          const namaPencuci = getNamaPencuci(washerId)
          doc.fontSize(14).font('Helvetica-Bold').text(`Pencuci: ${namaPencuci}`, descriptionX, doc.y)
          doc.moveDown(0.5)

          const tableTop = doc.y
          doc.fontSize(12).font('Helvetica-Bold')
          doc.text('Plat/Keterangan', descriptionX, tableTop)
          doc.text('Jenis', typeX, tableTop)
          doc.text('Jumlah (Rp)', amountX, tableTop, { align: 'right' })
          doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke()
          doc.font('Helvetica')
          doc.moveDown()

          let washerTotal = 0
          items.forEach(item => {
            const rowY = doc.y
            doc.text(item.description, descriptionX, rowY)
            doc.text(item.jenis || '-', typeX, rowY)
            doc.text(item.amount.toLocaleString('id-ID'), amountX, rowY, { align: 'right' })
            washerTotal += item.amount
            doc.moveDown()
          })
          
          doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke()
          doc.moveDown()

          doc.font('Helvetica-Bold')
          doc.text('Subtotal Pencuci Ini', descriptionX, doc.y)
          doc.text(washerTotal.toLocaleString('id-ID'), amountX, doc.y, { align: 'right' })
          doc.moveDown(2)
          
          grandTotal += washerTotal
        }

        doc.fontSize(14).font('Helvetica-Bold')
        doc.text('TOTAL PENDAPATAN HARI INI', descriptionX, doc.y)
        doc.text(grandTotal.toLocaleString('id-ID'), amountX, doc.y, { align: 'right' })
        doc.end()

        await new Promise(resolve => {
          writeStream.on('finish', async () => {
            await sock.sendMessage(chatId, { text: 'Berikut adalah laporan pendapatan hari ini berdasarkan pencuci.' })
            await sock.sendMessage(chatId, { document: { url: pdfPath }, mimetype: 'application/pdf', fileName: `laporan-cucian-${today}.pdf` })
            fs.unlinkSync(pdfPath) // Hapus file setelah dikirim
            resolve()
          })
        })
        response = '' // Kosongkan response agar tidak mengirim pesan ganda
      }
    } else if (reply.startsWith('.laporanbulan')) {
      const args = text.split(' ')
      let targetMonth = new Date().toISOString().slice(0, 7) // Default: YYYY-MM bulan ini
      
      // Jika user mengetik .laporanbulan 03 (untuk maret) atau .laporanbulan 2026-03
      if (args[1]) {
        if (args[1].length === 2) {
          targetMonth = `${new Date().getFullYear()}-${args[1]}` 
        } else {
          targetMonth = args[1] 
        }
      }

      const allData = readReportData()
      const monthlyData = allData.filter(item => item.date.startsWith(targetMonth))

      if (monthlyData.length === 0) {
        response = `Belum ada data cucian yang tercatat untuk bulan ${targetMonth}.`
      } else {
        const pdfPath = `./laporan-bulanan-${targetMonth}.pdf`
        const doc = new PDFDocument({ margin: 30, size: 'A4' }) // Pakai kertas A4 untuk tabel
        const writeStream = fs.createWriteStream(pdfPath)
        doc.pipe(writeStream)

        // --- Isi PDF (Header) ---
        doc.fontSize(16).font('Helvetica-Bold').text('Laporan Bulanan Cucian Motor', { align: 'center' })
        doc.fontSize(12).text(`Bulan: ${targetMonth}`, { align: 'center' })
        doc.moveDown(2)

        const startX = 30
        const colDate = 30
        const colWasher = 100
        const colDesc = 200
        const colJenis = 380
        const colAmount = 450

        // Fungsi untuk menggambar Header Tabel (berguna jika halaman PDF bertambah)
        const drawTableHeader = () => {
          doc.fontSize(10).font('Helvetica-Bold')
          doc.text('Tanggal', colDate, doc.y)
          doc.text('Pencuci', colWasher, doc.y)
          doc.text('Plat/Ket', colDesc, doc.y)
          doc.text('Jenis', colJenis, doc.y)
          doc.text('Jumlah (Rp)', colAmount, doc.y, { width: 110, align: 'right' })
          doc.moveTo(startX, doc.y + 2).lineTo(560, doc.y + 2).stroke()
          doc.moveDown(0.5)
          doc.font('Helvetica')
        }

        drawTableHeader()

        let grandTotal = 0
        const washerTotals = {}

        monthlyData.forEach(item => {
          // Pindah halaman jika tabel sudah sampai bawah kertas
          if (doc.y > 750) {
            doc.addPage()
            drawTableHeader()
          }

          const namaPencuci = getNamaPencuci(item.washerId)
          const rowY = doc.y

          doc.text(item.date, colDate, rowY)
          doc.text(namaPencuci, colWasher, rowY)
          
          let desc = item.description || '-'
          if (desc.length > 25) desc = desc.substring(0, 22) + '...' // Potong teks jika kepanjangan
          doc.text(desc, colDesc, rowY)
          
          doc.text(item.jenis || '-', colJenis, rowY)
          doc.text(item.amount.toLocaleString('id-ID'), colAmount, rowY, { width: 110, align: 'right' })

          grandTotal += item.amount

          if (!washerTotals[namaPencuci]) washerTotals[namaPencuci] = 0
          washerTotals[namaPencuci] += item.amount

          doc.moveDown(0.5)
        })

        doc.moveTo(startX, doc.y + 2).lineTo(560, doc.y + 2).stroke()
        doc.moveDown(2)

        // --- Ringkasan Gaji/Pendapatan per Pencuci ---
        if (doc.y > 650) doc.addPage() // Pindah halaman jika tidak muat

        doc.fontSize(12).font('Helvetica-Bold').text('Ringkasan Total per Pencuci (Bulan Ini):')
        doc.moveDown(0.5)
        doc.font('Helvetica')
        
        for (const [pencuci, total] of Object.entries(washerTotals)) {
          doc.text(`- ${pencuci}: Rp ${total.toLocaleString('id-ID')}`)
        }
        doc.moveDown()

        doc.fontSize(14).font('Helvetica-Bold')
        doc.text('TOTAL PENDAPATAN KESELURUHAN', startX, doc.y)
        doc.text(grandTotal.toLocaleString('id-ID'), colAmount, doc.y - 14, { width: 110, align: 'right' })
        doc.end()

        await new Promise(resolve => {
          writeStream.on('finish', async () => {
            await sock.sendMessage(chatId, { text: `Berikut adalah rekapitulasi lengkap cucian motor untuk bulan ${targetMonth}.` })
            await sock.sendMessage(chatId, { document: { url: pdfPath }, mimetype: 'application/pdf', fileName: `laporan-bulanan-${targetMonth}.pdf` })
            fs.unlinkSync(pdfPath)
            resolve()
          })
        })
        response = ''
      }
    }

    if (response) {
      await sock.sendMessage(chatId, { text: response }, { quoted: msg })
    }
  })
}

startBot().catch((err) => {
  console.error('Gagal memulai bot:', err)
})
