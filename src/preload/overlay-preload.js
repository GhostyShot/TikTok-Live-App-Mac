const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('overlayBridge', {
  on: (channel, callback) => {
    const validChannels = [
      'overlay:connected', 'overlay:disconnected', 'overlay:config',
      'overlay:chat', 'overlay:like', 'overlay:follow', 'overlay:gift',
      'overlay:member', 'overlay:viewers', 'overlay:share', 'overlay:subscribe',
      'overlay:alert', 'overlay:action'
    ];
    if (validChannels.includes(channel)) ipcRenderer.on(channel, (_, data) => callback(data));
  },
  setClickThrough: (enabled) => ipcRenderer.send('overlay:setClickThrough', enabled)
});
