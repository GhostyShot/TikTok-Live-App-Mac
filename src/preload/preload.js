const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('tiklive', {
  connect: (username) => ipcRenderer.invoke('tiktok:connect', username),
  disconnect: () => ipcRenderer.invoke('tiktok:disconnect'),
  getStatus: () => ipcRenderer.invoke('tiktok:status'),
  openOverlay: () => ipcRenderer.invoke('overlay:open'),
  closeOverlay: () => ipcRenderer.invoke('overlay:close'),
  updateOverlay: (config) => ipcRenderer.invoke('overlay:update', config),
  getOverlayConfig: () => ipcRenderer.invoke('overlay:getConfig'),
  getActions: () => ipcRenderer.invoke('actions:get'),
  saveActions: (actions) => ipcRenderer.invoke('actions:save', actions),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),
  resetStats: () => ipcRenderer.invoke('stats:reset'),
  testKeystroke: (key, modifiers) => ipcRenderer.invoke('test:keystroke', { key, modifiers }),
  on: (channel, callback) => {
    const validChannels = [
      'tiktok:connected', 'tiktok:disconnected', 'tiktok:error',
      'event:chat', 'event:like', 'event:follow', 'event:gift',
      'event:member', 'event:share', 'event:subscribe',
      'stats:update', 'action:fired', 'action:playSound'
    ];
    if (validChannels.includes(channel)) ipcRenderer.on(channel, (_, data) => callback(data));
  },
  off: (channel, callback) => ipcRenderer.removeListener(channel, callback)
});
