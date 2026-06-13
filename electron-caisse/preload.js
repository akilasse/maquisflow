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
  printTicket:    (ticketData) => ipcRenderer.invoke('print:ticket', ticketData),
  printBon:       (bonData)    => ipcRenderer.invoke('print:bon', bonData),
  getPrinters:    ()           => ipcRenderer.invoke('print:get-printers'),
  setPrinter:     (name)       => ipcRenderer.invoke('print:set-printer', name),

  // Serveur local WiFi
  getLocalIP:            ()     => ipcRenderer.invoke('local:getIP'),
  getLocalPort:          ()     => ipcRenderer.invoke('local:getPort'),
  cacheMaquis:           (data) => ipcRenderer.invoke('local:cacheMaquis', data),
  cacheStations:         (data) => ipcRenderer.invoke('local:cacheStations', data),
  cacheUser:             (data) => ipcRenderer.invoke('local:cacheUser', data),
  getVentesLocales:      ()     => ipcRenderer.invoke('local:getVentesLocales'),
  clearVentesLocales:    ()     => ipcRenderer.invoke('local:clearVentesLocales'),

  // Infos
  isElectron: true
})