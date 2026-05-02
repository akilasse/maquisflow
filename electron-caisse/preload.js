// ============================================================
// PRELOAD — Bridge sécurisé Electron ↔ Renderer
// ============================================================

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // Stockage local
  storeGet:    (key)        => ipcRenderer.invoke('store:get', key),
  storeSet:    (key, value) => ipcRenderer.invoke('store:set', key, value),
  storeDelete: (key)        => ipcRenderer.invoke('store:delete', key),

  // Impression
  printTicket: (ticketData) => ipcRenderer.invoke('print:ticket', ticketData),

  // Infos
  isElectron: true
})