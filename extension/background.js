importScripts('storage-access.js');

'use strict';

const MENU_ID = 'finn-di-capture-image';
const BRIDGE_ORIGIN = 'http://127.0.0.1:43117';
const FBASE_NATIVE_HOST = 'com.fbase.launcher';
const reverseRequests = new Map();
const liveRunnerPorts = new Map();
const floatingRecoveryByTab = new Map();

chrome.runtime.onConnect.addListener(port => {
  const prefix = 'fbase-runner:';
  if (!String(port?.name || '').startsWith(prefix)) return;
  const runnerId = String(port.name).slice(prefix.length).trim();
  if (!runnerId) return;
  liveRunnerPorts.set(runnerId, port);
  port.onDisconnect.addListener(() => {
    if (liveRunnerPorts.get(runnerId) === port) liveRunnerPorts.delete(runnerId);
  });
});

function createCaptureEventId(prefix = 'capture') {
  const random = globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2, 12);
  return `${prefix}_${Date.now()}_${random}`;
}
// 队列停止时主动中断当前在跑的上游请求（sidepanel 发 ABORT_FETCH → abort 该发起方的 fetch）。
// 每个发起方（documentId/tabId）独立一个 controller 集合，避免多窗口/多请求并发时
// 共用单例会"后写覆盖"，导致停止命中非目标请求。
const activeSignals = new Map();
function signalOwnerKey(sender, message) {
  if (message?.fbaseAbortKey) return `client:${message.fbaseAbortKey}`;
  if (sender?.documentId) return `doc:${sender.documentId}`;
  if (sender?.tab?.id != null) return `tab:${sender.tab.id}`;
  return 'shared';
}
function makeUpstreamSignal(timeout, ownerKey) {
  const controller = new AbortController();
  const key = ownerKey || 'shared';
  const bucket = activeSignals.get(key) || new Set();
  bucket.add(controller);
  activeSignals.set(key, bucket);
  const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(timeout)]);
  return { controller, signal, key };
}
function releaseUpstreamSignal(controller, key) {
  const bucket = activeSignals.get(key);
  if (!bucket) return;
  bucket.delete(controller);
  if (!bucket.size) activeSignals.delete(key);
}
function abortSignalsFor(sender, message) {
  const key = signalOwnerKey(sender, message);
  const bucket = activeSignals.get(key);
  if (bucket) for (const controller of bucket) controller.abort();
  return { ok: true };
}

const trustedStorageReady = Promise.all([
  globalThis.FBaseStorageAccess.initializeTrustedStorageAccess(chrome.storage.local, {
    onDiagnostic: diagnostic => console.warn('F·BASE local storage isolation unavailable', diagnostic)
  }),
  globalThis.FBaseStorageAccess.initializeTrustedStorageAccess(chrome.storage.session, {
    onDiagnostic: diagnostic => console.warn('F·BASE session storage isolation unavailable', diagnostic)
  })
]);

installMenu();

chrome.runtime.onInstalled.addListener(details => {
  installMenu();
  resetFloatingShell();
  if (details?.reason === 'update') {
    refreshInjectedContentAcrossTabs().catch(error => {
      console.warn('F·BASE page runtime refresh failed', error);
    });
  }
});

chrome.runtime.onStartup.addListener(() => {
  installMenu();
  resetFloatingShell();
});

function resetFloatingShell() {
  chrome.storage.session.set({
    fbaseFloatingShell: { open: false, tabId: null, updatedAt: Date.now() }
  }).catch(error => console.warn('F·BASE default window state failed', error));
}

// ===== 浮窗全局唯一路由 =====
// content script 无 session storage 写权限，跨标签页同步统一由这里调度：
// 任意时刻只允许一个标签页显示浮窗，焦点切换时浮窗跟随到当前激活标签页。

chrome.tabs.onActivated.addListener(() => { refreshFloatingVisibility(); });
chrome.tabs.onUpdated.addListener((_tabId, info) => {
  if (info.status === 'complete') refreshFloatingVisibility();
});
chrome.windows.onFocusChanged.addListener(windowId => {
  // 焦点离开浏览器（切到其它应用/弹窗类窗口）时保持现状，浮窗不闪烁
  if (windowId === chrome.windows.WINDOW_ID_NONE) return;
  chrome.windows.get(windowId)
    .then(win => { if (win?.type === 'normal') refreshFloatingVisibility(); })
    .catch(() => {});
});

async function getFloatingShell() {
  try {
    const stored = await chrome.storage.session.get('fbaseFloatingShell');
    const shell = stored.fbaseFloatingShell;
    if (shell && typeof shell === 'object') {
      return { open: shell.open === true, tabId: Number.isInteger(shell.tabId) ? shell.tabId : null };
    }
  } catch (_) { /* session storage 不可用时按全关处理 */ }
  return { open: false, tabId: null };
}

async function setFloatingShell(patch) {
  const next = { ...(await getFloatingShell()), ...patch, updatedAt: Date.now() };
  try { await chrome.storage.session.set({ fbaseFloatingShell: next }); } catch (_) {}
  return next;
}

async function refreshFloatingVisibility() {
  const shell = await getFloatingShell();
  let targetTabId = null;
  if (shell.open) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true, windowType: 'normal' });
      if (tab?.id && /^https?:/i.test(tab.url || '')) targetTabId = tab.id;
    } catch (_) {}
  }
  if (shell.tabId === targetTabId) return;
  await setFloatingShell({ tabId: targetTabId });
  if (shell.tabId != null) chrome.tabs.sendMessage(shell.tabId, { type: 'FBASE_HIDE_WINDOW' }).catch(() => {});
  if (targetTabId != null) chrome.tabs.sendMessage(targetTabId, { type: 'FBASE_SHOW_WINDOW' }).catch(() => {});
}

async function setFloatingWindowOpen(message, sender) {
  const open = message?.open === true;
  // 用户在某标签页内操作浮窗：该标签页即唯一宿主，旧宿主立即隐藏
  const hostTabId = open ? (sender?.tab?.id ?? null) : null;
  const previous = await getFloatingShell();
  await setFloatingShell({ open, tabId: hostTabId });
  if (previous.tabId != null && previous.tabId !== hostTabId) {
    chrome.tabs.sendMessage(previous.tabId, { type: 'FBASE_HIDE_WINDOW' }).catch(() => {});
  }
  return { ok: true, open, visible: open };
}

async function queryFloatingWindow(_message, sender) {
  let shell = await getFloatingShell();
  if (shell.open && shell.tabId == null) {
    // service worker 重启丢失路由信息：按当前激活标签页补一次路由
    await refreshFloatingVisibility();
    shell = await getFloatingShell();
  }
  const senderTabId = sender?.tab?.id ?? null;
  return { ok: true, open: shell.open, visible: shell.open && senderTabId != null && senderTabId === shell.tabId };
}

// ===== content script 存储桥 =====
// storage 已加固为 TRUSTED_CONTEXTS，content script 无法直接读写；
// 浮窗位置/快捷开关/禁用站点等低敏数据经此白名单中转，密钥等敏感字段不暴露

const CONTENT_STORAGE_KEYS = ['fbaseQuickSettings', 'fbaseFloatingLayout', 'fbaseDisabledHosts'];

async function contentStorageGet(message) {
  const keys = Array.isArray(message?.keys) ? message.keys.filter(key => CONTENT_STORAGE_KEYS.includes(key)) : [];
  if (!keys.length) return { ok: true, data: {} };
  try {
    return { ok: true, data: await chrome.storage.local.get(keys) };
  } catch (error) {
    return { ok: false, error: error.message || 'storage 读取失败' };
  }
}

async function contentStorageSet(message) {
  const payload = message?.payload && typeof message.payload === 'object' ? message.payload : {};
  const allowed = {};
  for (const key of CONTENT_STORAGE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(payload, key)) allowed[key] = payload[key];
  }
  if (!Object.keys(allowed).length) return { ok: true };
  try {
    await chrome.storage.local.set(allowed);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message || 'storage 写入失败' };
  }
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  // 任意窗口拖动/改开关后，实时广播给所有标签页：浮窗位置全局一致，不会变来变去
  if (!changes.fbaseFloatingLayout && !changes.fbaseQuickSettings) return;
  chrome.tabs.query({}, tabs => {
    for (const tab of tabs) {
      if (!tab?.id) continue;
      chrome.tabs.sendMessage(tab.id, {
        type: 'FBASE_STORAGE_SYNC',
        layout: changes.fbaseFloatingLayout?.newValue || null,
        quickSettings: changes.fbaseQuickSettings?.newValue || null
      }).catch(() => {});
    }
  });
});

chrome.action.onClicked.addListener(tab => {
  handleActionClick(tab).catch(error => console.error('F·BASE action failed', error));
});

async function handleActionClick(tab) {
  if (tab?.id && /^https?:/i.test(tab.url || '')) {
    try {
      return await openFloatingWindow(tab, 'open');
    } catch (error) {
      // 兜底：浮窗打不开时绝不静默失败，直接开独立标签页面板
      console.error('F·BASE floating window failed, fallback to standalone panel', error);
      await chrome.tabs.create({ url: chrome.runtime.getURL('sidepanel.html') });
      return { ok: true, mode: 'standalone-fallback' };
    }
  }
  await chrome.tabs.create({ url: chrome.runtime.getURL('sidepanel.html') });
  return { ok: true, mode: 'standalone' };
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_ID || !tab?.id) return;
  const capture = {
    captureId: createCaptureEventId('context'),
    srcUrl: info.srcUrl || '',
    pageUrl: info.pageUrl || tab.url || '',
    pageTitle: tab.title || '网页参考图',
    alt: '',
    capturedAt: Date.now(),
    captureMethod: 'context-menu'
  };
  const panelRequest = openFloatingWindow(tab, 'open');
  const storageRequest = chrome.storage.session.set({ finnCapture: capture });
  Promise.all([panelRequest, storageRequest])
    .catch((error) => console.error('F·BASE capture failed', error));
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // safeSend 兜底：保证 sendResponse 在异步流程的所有分支都会被调用，
  // 且只调用一次，避免 Chrome 报告「监听器返回 true 但通道提前关闭」
  let responded = false;
  const safeSend = (payload) => {
    if (responded) return;
    responded = true;
    try { sendResponse(payload); } catch (_) { /* 通道已关闭，忽略 */ }
  };
  if (!message?.type) return false;

  if (message.type === 'FINN_CAPTURED_IMAGE') {
    const capture = {
      ...message.payload,
      captureId: createCaptureEventId('picker'),
      tabId: sender.tab?.id,
      capturedAt: Date.now(),
      captureMethod: 'picker'
    };
    const panelRequest = (() => {
      try { return sender.tab?.id ? openFloatingWindow(sender.tab, 'open') : Promise.resolve(); }
      catch (e) { return Promise.reject(e); }
    })();
    chrome.storage.session.set({ finnCapture: capture })
      .then(() => panelRequest)
      .then(() => safeSend({ ok: true }))
      .catch((error) => safeSend({ ok: false, error: error.message || String(error) }));
    return true;
  }

  const handlers = {
    START_PICKER: startPicker,
    CAPTURE_VISIBLE: captureVisible,
    IMAGE_FETCH: () => fetchImageAsDataUrl(message.url),
    BRIDGE_HEALTH: bridgeHealth,
    BRIDGE_CAPTURE: () => bridgeCapture(message.payload),
    KBASE_FETCH: () => kbaseFetch(message, sender),
    LLM_FETCH: () => llmFetch(message, sender),
    EAGLE_FETCH: () => eagleFetch(message),
    ABORT_FETCH: () => abortSignalsFor(sender, message),
    OPEN_CHATGPT: openChatGPT,
    OPEN_LIBRARY: () => openLibrary(message.url),
    FBASE_SET_WINDOW: () => setFloatingWindowOpen(message, sender),
    FBASE_QUERY_WINDOW: () => queryFloatingWindow(message, sender),
    FBASE_STORAGE_GET: () => contentStorageGet(message),
    FBASE_STORAGE_SET: () => contentStorageSet(message),
    FBASE_RUNNER_STATUS: () => ({ ok: true, alive: liveRunnerPorts.has(String(message.runnerId || '')) })
  };
  const handler = handlers[message.type];
  if (!handler) return false;
  Promise.resolve()
    .then(() => handler())
    .then((result) => safeSend(result ?? { ok: false, error: 'Handler returned nothing' }))
    .catch((error) => safeSend({ ok: false, error: error?.message || String(error) }));
  return true;
});

function installMenu() {
  chrome.contextMenus.removeAll(() => {
    const removalError = chrome.runtime.lastError;
    if (removalError) console.warn('F·BASE context menu cleanup failed', removalError.message);
    try {
      chrome.contextMenus.create({ id: MENU_ID, title: '发送到 F·BASE', contexts: ['image'] });
    } catch (error) {
      console.error('F·BASE context menu setup failed', error);
    }
  });
}

async function openFloatingWindow(tab, mode = 'open') {
  if (!tab?.id || !/^https?:/i.test(tab.url || '')) throw new Error('当前页面不支持网页内浮动窗口');
  const type = mode === 'toggle' ? 'FBASE_TOGGLE_WINDOW' : 'FBASE_OPEN_WINDOW';
  const sendCommand = async () => {
    const response = await chrome.tabs.sendMessage(tab.id, { type });
    if (mode === 'open' && response?.visible !== true) {
      const error = new Error('浮动窗口未返回可见状态');
      error.fbaseNeedsRecovery = true;
      throw error;
    }
    return response;
  };
  try {
    return await sendCommand();
  } catch (error) {
    const stale = error?.fbaseNeedsRecovery === true
      || /Receiving end does not exist|Could not establish connection/i.test(String(error?.message || error || ''));
    if (!stale) throw error;
    await recoverFloatingContent(tab.id);
    return sendCommand();
  }
}

async function recoverFloatingContent(tabId) {
  if (floatingRecoveryByTab.has(tabId)) return floatingRecoveryByTab.get(tabId);
  const recovery = (async () => {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        document.getElementById('fbase-floating-root')?.remove();
        document.querySelector('.fbase-page-viewer')?.remove();
        document.documentElement.classList.remove('fbase-viewer-open');
        try { delete window.__FBASE_FLOATING_WINDOW__; }
        catch (_) { window.__FBASE_FLOATING_WINDOW__ = false; }
      }
    });
    await chrome.scripting.insertCSS({ target: { tabId }, files: ['content.css'] });
    await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
  })().finally(() => floatingRecoveryByTab.delete(tabId));
  floatingRecoveryByTab.set(tabId, recovery);
  return recovery;
}

async function refreshInjectedContentAcrossTabs() {
  const tabs = await chrome.tabs.query({});
  const supportedTabs = tabs.filter(tab => tab?.id && /^https?:/i.test(tab.url || ''));
  await Promise.allSettled(supportedTabs.map(tab => recoverFloatingContent(tab.id)));
}

async function startPicker() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return { ok: false, error: '没有找到当前网页' };
  if (!/^https?:/i.test(tab.url || '')) return { ok: false, error: '当前页面不允许点选图片，请打开普通网页后重试' };
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['picker.js'] });
    return { ok: true };
  } catch (error) {
    const message = String(error?.message || '');
    if (/Receiving end does not exist|Could not establish connection/i.test(message)) {
      return { ok: false, error: '扩展刚完成更新，请刷新当前网页后再点选图片' };
    }
    return { ok: false, error: '当前页面不允许点选图片，可刷新网页后重试或使用图片右键菜单' };
  }
}

async function captureVisible() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const dataUrl = await chrome.tabs.captureVisibleTab(tab?.windowId, { format: 'png' });
    return { ok: true, dataUrl };
  } catch (error) {
    return { ok: false, error: error.message || '页面截图失败' };
  }
}

async function fetchImageAsDataUrl(url) {
  if (!url) return { ok: false, error: '图片地址为空' };
  if (url.startsWith('data:image/')) return { ok: true, dataUrl: url };
  if (!/^https?:/i.test(url)) return { ok: false, error: '该图片地址无法直接读取，将尝试区域截图' };
  try {
    // 不携带站点 Cookie：避免把用户登录态带去任意地址，也降低被当作跨站读取代理的风险
    const response = await fetch(url, { credentials: 'omit', cache: 'force-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) throw new Error('地址返回的内容不是图片');
    const buffer = await blob.arrayBuffer();
    return { ok: true, dataUrl: `data:${blob.type || 'image/jpeg'};base64,${arrayBufferToBase64(buffer)}` };
  } catch (error) {
    return { ok: false, error: error.message || '图片读取失败' };
  }
}

async function bridgeHealth() {
  try {
    const response = await fetch(`${BRIDGE_ORIGIN}/health`, { cache: 'no-store', signal: AbortSignal.timeout(3000) });
    return { ok: response.ok, status: response.status, data: await response.json() };
  } catch (error) {
    return { ok: false, error: error.message || '本地桥接未启动' };
  }
}

async function bridgeCapture(payload) {
  try {
    const response = await fetch(`${BRIDGE_ORIGIN}/capture`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20000)
    });
    const data = await response.json();
    return { ok: response.ok, status: response.status, data, error: data.error };
  } catch (error) {
    return { ok: false, error: error.message || '无法连接 F·BASE 本地桥接' };
  }
}

async function eagleFetch(message) {
  try {
    const url = new URL(message.url);
    if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(url.hostname) || url.port !== '41595') {
      throw new Error('仅允许访问本机 Eagle API');
    }
    const init = { method: message.method || 'GET', headers: sanitizeHeaders(message.headers || {}), signal: AbortSignal.timeout(10000) };
    if (message.body) init.body = JSON.stringify(message.body);
    const response = await fetch(url.href, init);
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { message: text }; }
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    return { ok: false, error: error.message || 'Eagle 连接失败' };
  }
}

async function kbaseFetch(message, sender) {
  await trustedStorageReady;
  const url = new URL(message.url);
  if (url.pathname === '/api/finn/reverse' && String(message.method || 'GET').toUpperCase() === 'POST') {
    const requestKey = await buildReverseRequestKey(message.body || {});
    if (reverseRequests.has(requestKey)) return reverseRequests.get(requestKey);
    const request = kbaseFetchOnce(message, sender).finally(() => reverseRequests.delete(requestKey));
    reverseRequests.set(requestKey, request);
    return request;
  }
  return kbaseFetchOnce(message, sender);
}

// HTTP 请求头只允许 ISO-8859-1 字符；用户配置/文本里混入中文等非 ASCII 会让
// fetch 直接抛 "String contains non ISO-8859-1 code point" 导致后台崩溃。
// 这里统一把非法字符剥掉（同时清理 CR/LF 防请求头注入）。
function sanitizeHeaderValue(value) {
  return String(value == null ? '' : value)
    .replace(/[\u0100-\uFFFF]/g, '')            // 去掉非 ISO-8859-1 字符（中文/表情等）
    .replace(/[\x00-\x08\x0A-\x1F\x7F]/g, '')   // 去掉控制字符
    .trim();
}
function sanitizeHeaders(headers) {
  const out = {};
  for (const key of Object.keys(headers || {})) {
    if (key == null) continue;
    const cleanKey = sanitizeHeaderValue(key);
    if (!cleanKey) continue;
    const v = headers[key];
    out[cleanKey] = typeof v === 'string' ? sanitizeHeaderValue(v) : v;
  }
  return out;
}

async function llmFetch(message, sender) {
  await trustedStorageReady;
  const { controller, signal, key } = makeUpstreamSignal(Math.max(3_000, Math.min(Number(message.timeout) || 120_000, 190_000)), signalOwnerKey(sender, message));
  try {
    const url = new URL(message.url);
    const loopback = ['127.0.0.1', 'localhost'].includes(url.hostname);
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) {
      throw new Error('模型直连仅允许 HTTPS 地址或本机 HTTP 地址');
    }
    const headers = sanitizeHeaders({ 'content-type': 'application/json', ...(message.headers || {}) });
    const apiKey = String(message.apiKey || '').trim();
    if (apiKey && !headers.Authorization && !headers.authorization) headers.Authorization = `Bearer ${sanitizeHeaderValue(apiKey)}`;
    const init = { method: message.method || 'POST', headers, signal };
    if (message.body != null) init.body = JSON.stringify(message.body);
    const response = await fetch(url.href, init);
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); }
    catch { data = { message: text.slice(0, 4_000) }; }
    return { ok: response.ok, status: response.status, data, error: data?.error?.message || data?.error || data?.message || '' };
  } catch (error) {
    if (controller.signal.aborted) return { ok: false, aborted: true, status: 0, error: '任务已中止' };
    return { ok: false, status: 0, error: error.message || '模型直连失败' };
  } finally {
    releaseUpstreamSignal(controller, key);
  }
}

async function kbaseFetchOnce(message, sender) {
  const { controller, signal, key } = makeUpstreamSignal(Math.max(1000, Math.min(Number(message.timeout) || 30000, 190000)), signalOwnerKey(sender, message));
  try {
    const url = new URL(message.url);
    if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(url.hostname)) {
      throw new Error('仅允许访问本机 F·BASE 服务');
    }
    if (!/^\/api\/(health|models|llm|(?:terms|recipes|works|reverse_feedback)(?:\/[^/]+)?|settings\/llm-profiles|finn\/(reverse|import|analyze-import)|ai\/(chat|image))$/.test(url.pathname)) {
      throw new Error('该 F·BASE 接口未获授权');
    }
    const init = {
      method: message.method || 'GET',
      headers: sanitizeHeaders({ 'content-type': 'application/json', ...(message.headers || {}) }),
      signal
    };
    if (message.body != null) init.body = JSON.stringify(message.body);
    const response = await fetch(url.href, init);
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); }
    catch { data = { message: text.slice(0, 1000) }; }
    return {
      ok: response.ok,
      status: response.status,
      data,
      error: response.ok ? '' : (data?.error?.message || data?.error || data?.message || `Status ${response.status}`)
    };
  } catch (error) {
    if (controller.signal.aborted) return { ok: false, aborted: true, status: 0, error: '任务已中止' };
    return { ok: false, status: 0, error: error.message || 'F·BASE 连接失败' };
  } finally {
    releaseUpstreamSignal(controller, key);
  }
}

async function buildReverseRequestKey(body) {
  const image = String(body?.imageDataUrl || '');
  const imageDigest = image ? await sha256Hex(image) : '';
  const credentialDigest = body?.key ? await sha256Hex(body.key) : '';
  const stable = JSON.stringify({
    endpoint: String(body?.endpoint || ''),
    model: String(body?.model || ''),
    inputText: String(body?.inputText || ''),
    imageDigest,
    credentialDigest
  });
  return sha256Hex(stable);
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(value || '')));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

async function openChatGPT() {
  await chrome.tabs.create({ url: 'https://chatgpt.com/' });
  return { ok: true };
}

async function openLibrary(value) {
  const url = new URL(value || 'http://127.0.0.1:3000/knowledge-library.html');
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(url.hostname)) {
    throw new Error('词库页面地址无效');
  }
  const healthUrl = `${url.origin}/api/health`;
  let online = await isLibraryHealthy(healthUrl);
  let started = false;
  let launchWarning = '';
  if (!online) {
    try {
      // native messaging 超时限制严格（30s 且 C# launcher 在中文路径下偶发卡住），
      // 用 Promise.race 加 8 秒硬超时，不阻塞打开页面
      const timeout = Symbol('timeout');
      const launch = await Promise.race([
        ensureLibraryServer(),
        new Promise(r => setTimeout(() => r(timeout), 8000))
      ]);
      if (launch === timeout) {
        launchWarning = '启动器等待超时，已为您打开词库页面，请稍后刷新或双击 start-finn-services.bat 手动启动';
      } else if (launch?.ok) {
        online = await isLibraryHealthy(healthUrl, 5000);
        started = true;
      } else {
        launchWarning = launch?.error || '';
      }
    } catch (launchErr) {
      launchWarning = launchErr?.message || '';
    }
    if (!online) online = await isLibraryHealthy(healthUrl, 2500);
  }
  await chrome.tabs.create({ url: url.href });
  return { ok: true, started, offline: !online, warning: launchWarning };
}

async function isLibraryHealthy(url, timeout = 1800) {
  try {
    const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(timeout) });
    if (!response.ok) return false;
    const data = await response.json();
    return data?.ok === true;
  } catch (_) {
    return false;
  }
}

function ensureLibraryServer() {
  return new Promise((resolve, reject) => {
    let settled = false;
    try {
      chrome.runtime.sendNativeMessage(FBASE_NATIVE_HOST, { action: 'ensure_server' }, response => {
        if (settled) return;
        settled = true;
        const error = chrome.runtime.lastError;
        if (error) {
          // 启动桥接不可用不抛 fatal，当作普通警告，由上层决定是否提示手动启动
          resolve({ ok: false, error: error?.message || '本机启动桥接不可用' });
          return;
        }
        resolve(response || { ok: false, error: '本机启动器没有返回结果' });
      });
    } catch (syncErr) {
      if (settled) return;
      settled = true;
      resolve({ ok: false, error: syncErr?.message || '调用启动桥接失败' });
    }
  });
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}
