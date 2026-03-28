const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, jidNormalizedUser } = require('@whiskeysockets/baileys')
const pino = require('pino')
const qrcode = require('qrcode-terminal')

const authFolder = './auth_info'

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
        console.log('Logged out. Delete auth_info.json and scan QR again.')
      }
    }
  })

  sock.ev.on('messages.upsert', async (m) => {
    if (m.type !== 'notify') return
    const msg = m.messages[0]
    if (!msg.message || msg.key.remoteJid === 'status@broadcast') return
    if (msg.key.fromMe) return

    const sender = jidNormalizedUser(msg.key.remoteJid)
    const isGroup = msg.key.remoteJid.endsWith('@g.us')
    const chatType = isGroup ? 'Group' : 'Chat'
    const msgType = getMessageType(msg.message)
    const mediaFileName = getMediaFileName(msg.message)
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || msg.message.videoMessage?.caption || msg.message.documentMessage?.caption || ''
    const reply = (text || '').trim().toLowerCase()

    if (!text) {
      console.log(`\n[${chatType}] ${sender} sent a ${msgType} message` + (mediaFileName ? ` [file: ${mediaFileName}]` : ''))
      return
    }

    console.log(`\n[${chatType}] ${sender} (${msgType}): ${text}` + (mediaFileName ? ` [file: ${mediaFileName}]` : ''))

    let response = ''
    if (reply === 'ping') {
      response = 'pong'
    } else if (reply === 'halo' || reply === 'hi' || reply === 'hello') {
      response = 'Halo! Saya bot WhatsApp menggunakan Baileys.'
    } else if (reply.startsWith('!say ')) {
      response = text.slice(5).trim() || 'Silakan masukkan pesan setelah !say'
    } else {
      response = 'Terima kasih sudah mengirim pesan. Ketik *ping* untuk mengetes bot.'
    }

    await sock.sendMessage(sender, { text: response }, { quoted: msg })
  })
}

startBot().catch((err) => {
  console.error('Gagal memulai bot:', err)
})
