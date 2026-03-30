const fs = require('fs')
const path = require('path')

const DB_DIR = './data'

// Pastikan folder data ada
function ensureDataDir() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true })
  }
}

// Read data dari file JSON
function readData(filename, defaultData = {}) {
  ensureDataDir()
  const filepath = path.join(DB_DIR, `${filename}.json`)
  try {
    if (fs.existsSync(filepath)) {
      const data = fs.readFileSync(filepath, 'utf-8')
      return JSON.parse(data)
    }
  } catch (error) {
    console.error(`Error reading ${filename}:`, error)
  }
  return defaultData
}

// Save data ke file JSON
function saveData(filename, data) {
  ensureDataDir()
  const filepath = path.join(DB_DIR, `${filename}.json`)
  try {
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2))
    return true
  } catch (error) {
    console.error(`Error saving ${filename}:`, error)
    return false
  }
}

// Update data dengan merge
function updateData(filename, updates, defaultData = {}) {
  const currentData = readData(filename, defaultData)
  const newData = { ...currentData, ...updates }
  return saveData(filename, newData) ? newData : null
}

// Find item dalam array dan update
function updateItemInArray(filename, itemId, updates, defaultArray = []) {
  const items = readData(filename, defaultArray)
  const index = items.findIndex(item => item.id === itemId)
  
  if (index >= 0) {
    items[index] = { ...items[index], ...updates }
    return saveData(filename, items) ? items[index] : null
  }
  return null
}

// Add item ke array
function addItemToArray(filename, item, defaultArray = []) {
  const items = readData(filename, defaultArray)
  items.push(item)
  saveData(filename, items)
  return item
}

// Remove item dari array
function removeItemFromArray(filename, itemId, defaultArray = []) {
  const items = readData(filename, defaultArray)
  const filtered = items.filter(item => item.id !== itemId)
  saveData(filename, filtered)
  return filtered
}

module.exports = {
  readData,
  saveData,
  updateData,
  updateItemInArray,
  addItemToArray,
  removeItemFromArray,
  ensureDataDir
}
