const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  storeGet:    (key)        => ipcRenderer.invoke('store:get', key),
  storeSet:    (key, value) => ipcRenderer.invoke('store:set', key, value),
  storeDelete: (key)        => ipcRenderer.invoke('store:delete', key),
  isElectron: true
})
