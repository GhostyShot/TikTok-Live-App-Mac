const { app, BrowserWindow, ipcMain, globalShortcut, shell } = require('electron');
const path = require('path');
const http = require('http');
const Store = require('electron-store');

const store = new Store();

let wss = null;
const wsClients = new Set();

function startWSServer() {
  try {
    const WebSocket = require('ws');
    const server = http.createServer();
    wss = new WebSocket.Server({ server });
    wss.on('connection', (ws) => {
      wsClients.add(ws);
      ws.on('close', () => wsClients.delete(ws));
    });
    server.listen(3456, '127.0.0.1');
  } catch (e) {
    console.warn('[WS] ws module not available');
  }
}

function broadcastWS(type, data) {
  if (!wsClients.size) return;
  const msg = JSON.stringify({ type, ...data });
  wsClients.forEach(ws => {
    try { if (ws.readyState === 1) ws.send(msg); } catch {}
  });
}

let mainWindow = null;
let overlayWindow = null;
let tiktokConnection = null;
let isConnected = false;

let liveStats = {
  likes: 0, followers: 0, viewers: 0, shares: 0,
  comments: [], recentGifts: [], recentFollowers: [],
  sessionStart: null
};

let actions = store.get('actions', []);
let likeCounter = 0;
let followAccumulator = 0;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280, height: 820, minWidth: 960, minHeight: 600,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0d0d12',
    webPreferences: {
      nodeIntegration: false, contextIsolation: true,
      preload: path.join(__dirname, '../preload/preload.js')
    },
    icon: path.join(__dirname, '../../assets/icon.png'),
    show: false
  });
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => { mainWindow = null; });
}

function createOverlayWindow() {
  if (overlayWindow) { overlayWindow.focus(); return; }
  overlayWindow = new BrowserWindow({
    width: 1280, height: 720,
    frame: false, transparent: true, alwaysOnTop: true,
    focusable: false, hasShadow: false, skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false, contextIsolation: true,
      preload: path.join(__dirname, '../preload/overlay-preload.js')
    }
  });
  overlayWindow.loadFile(path.join(__dirname, '../overlay/overlay.html'));
  overlayWindow.setIgnoreMouseEvents(true, { forward: true });
  overlayWindow.on('closed', () => { overlayWindow = null; });
}

async function connectTikTok(username) {
  try {
    const { WebcastPushConnection } = require('tiktok-live-connector');
    if (tiktokConnection) tiktokConnection.disconnect();
    tiktokConnection = new WebcastPushConnection(username, {
      enableExtendedGiftInfo: true, reconnectEnabled: true, reconnectCount: 5
    });
    tiktokConnection.connect().then(state => {
      isConnected = true;
      liveStats.sessionStart = Date.now();
      sendToRenderer('tiktok:connected', { username, roomId: state.roomId });
      sendToOverlay('overlay:connected', { username });
    }).catch(err => {
      sendToRenderer('tiktok:error', { message: err.message || 'Connection failed' });
    });

    tiktokConnection.on('chat', data => {
      const msg = { id: Date.now() + Math.random(), user: data.uniqueId || data.nickname, avatar: data.profilePictureUrl, text: data.comment, timestamp: Date.now() };
      liveStats.comments.unshift(msg);
      if (liveStats.comments.length > 100) liveStats.comments.pop();
      sendToRenderer('event:chat', msg);
      sendToOverlay('overlay:chat', msg);
      triggerActionsForEvent('chat', { user: msg.user, text: msg.text });
    });

    tiktokConnection.on('like', data => {
      const count = data.likeCount || 1;
      liveStats.likes += count; likeCounter += count;
      sendToRenderer('event:like', { user: data.uniqueId, count, total: liveStats.likes });
      sendToOverlay('overlay:like', { user: data.uniqueId, count, total: liveStats.likes });
      broadcastWS('like', { user: data.uniqueId, count, total: liveStats.likes });
      broadcastWS('stats', { likes: liveStats.likes, followers: liveStats.followers, viewers: liveStats.viewers });
      triggerActionsForEvent('like', { user: data.uniqueId, count, totalLikes: liveStats.likes, likeCounter });
    });

    tiktokConnection.on('follow', data => {
      liveStats.followers++; followAccumulator++;
      liveStats.recentFollowers.unshift({ user: data.uniqueId, timestamp: Date.now() });
      if (liveStats.recentFollowers.length > 20) liveStats.recentFollowers.pop();
      sendToRenderer('event:follow', { user: data.uniqueId, total: liveStats.followers });
      sendToOverlay('overlay:follow', { user: data.uniqueId });
      broadcastWS('follow', { user: data.uniqueId, total: liveStats.followers });
      triggerActionsForEvent('follow', { user: data.uniqueId, total: liveStats.followers, accumulator: followAccumulator });
    });

    tiktokConnection.on('gift', data => {
      if (data.giftType === 1 && !data.repeatEnd) return;
      const gift = { id: Date.now(), user: data.uniqueId, giftName: data.giftName, giftId: data.giftId, diamonds: data.diamondCount, count: data.repeatCount || 1, image: data.giftPictureUrl, timestamp: Date.now() };
      liveStats.recentGifts.unshift(gift);
      if (liveStats.recentGifts.length > 30) liveStats.recentGifts.pop();
      sendToRenderer('event:gift', gift); sendToOverlay('overlay:gift', gift); broadcastWS('gift', gift);
      triggerActionsForEvent('gift', { ...gift });
    });

    tiktokConnection.on('member', data => {
      sendToRenderer('event:member', { user: data.uniqueId });
      sendToOverlay('overlay:member', { user: data.uniqueId });
      triggerActionsForEvent('member', { user: data.uniqueId });
    });

    tiktokConnection.on('roomUser', data => {
      liveStats.viewers = data.viewerCount || 0;
      sendToRenderer('stats:update', { viewers: liveStats.viewers });
      sendToOverlay('overlay:viewers', { count: liveStats.viewers });
    });

    tiktokConnection.on('share', data => {
      liveStats.shares++;
      sendToRenderer('event:share', { user: data.uniqueId, total: liveStats.shares });
      sendToOverlay('overlay:share', { user: data.uniqueId });
      triggerActionsForEvent('share', { user: data.uniqueId });
    });

    tiktokConnection.on('subscribe', data => {
      sendToRenderer('event:subscribe', { user: data.uniqueId });
      sendToOverlay('overlay:subscribe', { user: data.uniqueId });
      broadcastWS('subscribe', { user: data.uniqueId });
      triggerActionsForEvent('subscribe', { user: data.uniqueId });
    });

    tiktokConnection.on('disconnected', () => {
      isConnected = false;
      sendToRenderer('tiktok:disconnected', {});
      sendToOverlay('overlay:disconnected', {});
    });

    tiktokConnection.on('error', err => sendToRenderer('tiktok:error', { message: err.message }));

  } catch (err) {
    sendToRenderer('tiktok:error', { message: err.message });
  }
}

function disconnectTikTok() {
  if (tiktokConnection) { tiktokConnection.disconnect(); tiktokConnection = null; }
  isConnected = false;
  liveStats = { likes: 0, followers: 0, viewers: 0, shares: 0, comments: [], recentGifts: [], recentFollowers: [], sessionStart: null };
  likeCounter = 0; followAccumulator = 0;
  sendToRenderer('tiktok:disconnected', {});
}

function triggerActionsForEvent(eventType, eventData) {
  const currentActions = store.get('actions', []);
  for (const action of currentActions) {
    if (!action.enabled) continue;
    let shouldFire = false;
    switch (action.trigger) {
      case 'like':
        if (eventType === 'like') {
          const every = parseInt(action.triggerValue) || 1;
          shouldFire = Math.floor(likeCounter / every) > Math.floor((likeCounter - eventData.count) / every);
        }
        break;
      case 'follow':
        if (eventType === 'follow') {
          const every = parseInt(action.triggerValue) || 1;
          shouldFire = Math.floor(followAccumulator / every) > Math.floor((followAccumulator - 1) / every);
        }
        break;
      case 'gift':
        if (eventType === 'gift') shouldFire = !action.triggerGiftName || action.triggerGiftName.toLowerCase() === eventData.giftName?.toLowerCase();
        break;
      case 'chat':
        if (eventType === 'chat') shouldFire = !action.triggerKeyword || eventData.text?.toLowerCase().includes(action.triggerKeyword.toLowerCase());
        break;
      case 'member': shouldFire = eventType === 'member'; break;
      case 'share': shouldFire = eventType === 'share'; break;
      case 'subscribe': shouldFire = eventType === 'subscribe'; break;
    }
    if (shouldFire) executeAction(action, eventData);
  }
}

function executeAction(action, eventData) {
  const repeatCount = parseInt(action.repeatCount) || 1;
  for (let i = 0; i < repeatCount; i++) {
    const delay = i * (parseInt(action.repeatDelay) || 100);
    setTimeout(() => {
      if (action.type === 'keystroke') pressKey(action.key, action.modifiers || []);
      else if (action.type === 'overlay_alert') {
        sendToOverlay('overlay:alert', {
          message: action.alertMessage?.replace('{user}', eventData.user || '') || '',
          color: action.alertColor || '#5865f2', duration: action.alertDuration || 3000
        });
      }
      sendToRenderer('action:fired', { actionId: action.id, trigger: action.trigger, user: eventData.user });
      sendToOverlay('overlay:action', { actionName: action.name, user: eventData.user });
    }, delay);
  }
}

const KEY_CODES = {
  space: 49, enter: 36, return: 36, escape: 53, tab: 48,
  up: 126, down: 125, left: 123, right: 124,
  delete: 51, backspace: 51, f1: 122, f2: 120, f3: 99, f4: 118,
  f5: 96, f6: 97, f7: 98, f8: 100, f9: 101, f10: 109, f11: 103, f12: 111,
  a: 0, b: 11, c: 8, d: 2, e: 14, f: 3, g: 5, h: 4, i: 34, j: 38,
  k: 40, l: 37, m: 46, n: 45, o: 31, p: 35, q: 12, r: 15, s: 1,
  t: 17, u: 32, v: 9, w: 13, x: 7, y: 16, z: 6,
  '0': 29, '1': 18, '2': 19, '3': 20, '4': 21, '5': 23,
  '6': 22, '7': 26, '8': 28, '9': 25
};

function pressKey(key, modifiers = []) {
  try {
    const { execSync } = require('child_process');
    const keyLower = key.toLowerCase();
    const keyCode = KEY_CODES[keyLower];
    const modStr = buildAppleScriptMods(modifiers);
    const script = keyCode !== undefined
      ? `tell application "System Events" to key code ${keyCode}${modStr}`
      : `tell application "System Events" to keystroke "${keyLower}"${modStr}`;
    execSync(`osascript -e '${script}'`);
    console.log(`[KeyPress] ${[...modifiers, key].join('+')}`);
  } catch (err) {
    console.error('[KeyPress Error]', err.message);
    sendToRenderer('tiktok:error', { message: `Keystroke failed: ${err.message}` });
  }
}

function buildAppleScriptMods(modifiers = []) {
  if (!modifiers.length) return '';
  const map = { control: 'control down', shift: 'shift down', alt: 'option down', command: 'command down' };
  const mods = modifiers.map(m => map[m]).filter(Boolean);
  return mods.length ? ` using {${mods.join(', ')}}` : '';
}

ipcMain.handle('tiktok:connect', async (_, username) => { await connectTikTok(username); return { success: true }; });
ipcMain.handle('tiktok:disconnect', async () => { disconnectTikTok(); return { success: true }; });
ipcMain.handle('tiktok:status', async () => { return { isConnected, stats: liveStats }; });
ipcMain.handle('overlay:open', async () => { createOverlayWindow(); return { success: true }; });
ipcMain.handle('overlay:close', async () => { if (overlayWindow) overlayWindow.close(); return { success: true }; });
ipcMain.handle('overlay:update', async (_, config) => { store.set('overlayConfig', config); sendToOverlay('overlay:config', config); return { success: true }; });
ipcMain.handle('overlay:getConfig', async () => { return store.get('overlayConfig', getDefaultOverlayConfig()); });
ipcMain.handle('actions:get', async () => { return store.get('actions', []); });
ipcMain.handle('actions:save', async (_, newActions) => { store.set('actions', newActions); actions = newActions; return { success: true }; });
ipcMain.handle('settings:get', async () => { return store.get('settings', { username: '', theme: 'dark' }); });
ipcMain.handle('settings:save', async (_, settings) => { store.set('settings', settings); return { success: true }; });
ipcMain.handle('test:keystroke', async (_, { key, modifiers }) => { pressKey(key, modifiers); return { success: true }; });
ipcMain.handle('stats:reset', async () => {
  likeCounter = 0; followAccumulator = 0;
  liveStats.likes = 0; liveStats.followers = 0; liveStats.shares = 0; liveStats.viewers = 0;
  liveStats.comments = []; liveStats.recentGifts = []; liveStats.recentFollowers = [];
  return { success: true };
});
ipcMain.on('overlay:setClickThrough', (_, enabled) => { if (overlayWindow) overlayWindow.setIgnoreMouseEvents(enabled, { forward: true }); });

function sendToRenderer(channel, data) { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel, data); }
function sendToOverlay(channel, data) { if (overlayWindow && !overlayWindow.isDestroyed()) overlayWindow.webContents.send(channel, data); }

function getDefaultOverlayConfig() {
  return {
    widgets: [
      { id: 'viewers', type: 'stat', label: 'Viewers', icon: '👁', position: { x: 20, y: 20 }, visible: true },
      { id: 'likes', type: 'stat', label: 'Likes', icon: '❤️', position: { x: 20, y: 80 }, visible: true },
      { id: 'followers', type: 'stat', label: 'Followers', icon: '➕', position: { x: 20, y: 140 }, visible: true },
      { id: 'chat', type: 'chat', position: { x: 20, y: 220 }, visible: true, maxMessages: 5 },
      { id: 'latest_follow', type: 'latest_follow', position: { x: 20, y: 560 }, visible: true },
    ],
    theme: 'neon', fontSize: 14, opacity: 0.9
  };
}

app.whenReady().then(() => {
  startWSServer();
  createMainWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createMainWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('will-quit', () => { globalShortcut.unregisterAll(); if (tiktokConnection) tiktokConnection.disconnect(); });
