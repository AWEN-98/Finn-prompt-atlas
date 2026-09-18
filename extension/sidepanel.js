'use strict';

const DEFAULT_SETTINGS = {
  libraryEndpoint: 'http://127.0.0.1:3000',
  llmEndpoint: '',
  apiKey: '',
  model: '',
  imageEndpoint: '',
  imageApiKey: '',
  imageModel: '',
  imageModels: [],
  activeImageModel: '',
  assistantModel: '',
  eagleEnabled: true,
  eagleEndpoint: 'http://localhost:41595/api/item/addFromURL',
  eagleTags: 'F·BASE,视觉反推,AI生成'
};
const DEFAULT_QUICK_SETTINGS = {
  aspectRatio: 'AUTO', promptDetail: 'standard', outputVariant: false,
  inspectButton: true, colorCardMode: true, referencePalette: false, actionReferenceMode: false, portraitFidelity: false,
  concurrency: 3, xiezhenTemplate: 'detailed', aestheticPreset: 'faithful'
};
const GENERATION_STYLE_CONTROLS = Object.freeze([
  { id: 'avoid_detail_pileup', text: '避免细节堆砌' },
  { id: 'soft_focus_edges', text: '柔焦边缘' },
  { id: 'restrained_detail', text: '克制的细节表达' },
  { id: 'large_color_blocks', text: '大色块优先' },
  { id: 'clean_materials', text: '材质统一干净' },
  { id: 'avoid_fragmented_texture', text: '避免堆砌细碎纹理' },
  { id: 'clear_premium_finish', text: '整体通透高级' }
]);
const GENERATION_IMAGE_CONTROLS = Object.freeze([
  { id: 'experimental_camera_angle', text: '实验性镜头角度' },
  { id: 'experimental_action_expression', text: '实验性动作表情' },
  { id: 'delicate_real_skin_texture', text: '细腻真实皮肤纹理' },
  { id: 'pearl_soft_light_reflection', text: '珍珠柔光反射' },
  { id: 'soft_focus_diffused_highlights', text: '柔焦扩散高光' },
  { id: 'subtle_highlight_bloom', text: '高光轻微bloom' },
  { id: 'delicate_film_grain', text: '细腻胶片颗粒' },
  { id: 'subtle_faded_film', text: '轻微褪色胶片感' },
  { id: 'layered_shadows', text: '暗部保留层次' },
  { id: 'social_media_image_feel', text: '社媒传播图片感' }
]);
const BREAKDOWN_FILTERS = [
  ['all', '全部'], ['imaging', '成像'], ['light', '光色'], ['camera', '镜头构图'],
  ['human', '人物动作'], ['material', '造型材质'], ['scene', '场景版式'], ['favorite', '已收藏']
];
const AXIS_ORDER = ['成像', '光线', '镜头', '构图', '头部', '视线与情绪', '动作', '配饰与服装', '场景与道具'];
const PROGRESS_STAGES = [
  '正在读取素材并直连视觉模型',
  '正在判断图像类型与视觉目标',
  '正在展开构图、人物、光线、色彩与材质维度',
  '正在生成完整中文提示词与同风格变体'
];
const TASK_PHASE_LABELS = Object.freeze({
  reading: '读取素材', analyzing: '证据建模', reviewing: 'Agent 审校', rewriting: '中文整理',
  adapting: '写真调整', importing: '写入词库', generating: '生成图片'
});
const MAX_MODEL_RESULTS = 180;
const MAX_HISTORY_ITEMS = 20;
const MAX_HISTORY_BYTES = 2_500_000;
const MAX_SESSION_CAPTURE_BYTES = 7_500_000;
const WORKSPACE_SYNC_KEY = 'fbaseWorkspaceState';
const PROFILE_SECRET_STORE_KEY = 'finnProfileSecretsV1';
const TASK_QUEUE_RUNTIME = globalThis.FBaseTaskQueueRuntime;
const UI_ICONS = Object.freeze({
  close: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
  pencil: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>',
  copy: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>',
  starEmpty: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>',
  starFull: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>',
  trash: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"></path></svg>',
  check: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>',
  caret: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>',
  refresh: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>',
  play: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="6 4 20 12 6 20 6 4"></polygon></svg>',
  zoom: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>'
});
const workspaceInstanceId = `workspace_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
let runnerPresencePort = null;
let pendingSessionCaptureMutation = null;
let pendingSessionCaptureTimer = null;
let workspaceSyncTimer = null;
let workspaceReady = false;
let applyingSharedWorkspace = false;
let lastWorkspaceUpdate = 0;
let workspaceDbPromise = null;
let profileSecrets = {};

function registerRunnerPresence() {
  try {
    runnerPresencePort = chrome.runtime.connect({ name: `fbase-runner:${workspaceInstanceId}` });
    runnerPresencePort.onDisconnect.addListener(() => {
      runnerPresencePort = null;
      try { setTimeout(registerRunnerPresence, 500); } catch {}
    });
  } catch {}
}

registerRunnerPresence();
// 结果图片 Lightbox 状态：必须在 bindEvents()/bindLightboxEvents() 之前初始化，
// 否则这些函数在 initialize() 阶段被调用时会命中 const 的临时性死区（TDZ）报错，
// 导致 bindEvents() 中断、chrome.storage.onChanged 监听器无法注册，右键/网页点选全部失效。
const lightboxState = {
  active: 'generated',
  images: {
    generated: { scale: 1, x: 0, y: 0 },
    original: { scale: 1, x: 0, y: 0 }
  },
  dragging: false,
  dragStart: { x: 0, y: 0 },
  bound: false
};

const state = {
  capture: null,
  sourceDataUrl: '',
  uploadedName: '',
  settings: { ...DEFAULT_SETTINGS },
  quickSettings: { ...DEFAULT_QUICK_SETTINGS },
  profiles: [],
  activeProfileId: '',
  models: [],
  history: [],
  taskQueue: [],
  activeTaskId: '',
  running: false,
  result: null,
  pendingImport: null,
  localEvidence: null,
  favoritedTerms: new Set(),
  favoritedPrompts: new Set(),
  paletteFavorited: false,
  breakdownFilter: 'all',
  breakdownSearch: '',
  promptEditing: { prompt: false, xiezhen: false, variant: false },
  selectionFavorite: null,
  generateAfterReverse: false,
  generatedImage: null,
  resultView: 'result',
  promptMode: 'reverse',
  visualArchiveMode: 'breakdown',
  collapsedBreakdownGroups: new Set(),
  collapsedGenerationControls: new Set(),
  sourceCollapsed: false,
  assistantAction: 'local',
  assistantDraft: null,
  assistantRunning: false,
  assistantMessage: '',
  lastRenderedAnalysisId: '',
  revision: 0,
  progressTimer: null
};

const ids = [
  'settingsButton', 'settingsCloseButton', 'settingsDialog', 'settingsForm', 'libraryEndpointInput', 'llmEndpointInput',
  'profilePicker', 'profileToggleButton', 'profileCurrent', 'profileOptions', 'profileSearchInput', 'profileOptionList', 'profileSelect', 'profileNameInput', 'profileCount', 'refreshProfilesButton', 'newProfileButton', 'deleteProfileButton',
  'apiKeyInput', 'modelPicker', 'modelInput', 'modelToggleButton', 'modelOptions', 'modelHelp',
  'imageEndpointInput', 'imageApiKeyInput', 'imageModelPicker', 'imageModelInput', 'imageModelToggleButton', 'imageModelOptions', 'imageModelsInput', 'imageModelHelp', 'assistantModelInput', 'eagleEnabledInput', 'eagleEndpointInput', 'eagleTagsInput', 'testEagleButton',
  'fetchModelsButton', 'testConnectionButton', 'runDiagnosticsButton',
  'settingsResult', 'saveSettingsButton', 'taskWorkspace', 'sourceModule', 'sourcePreview', 'emptyPreview', 'previewWrap',
  'sourceMeta', 'sourceState', 'pickButton', 'pasteImageButton', 'sourceFileInput', 'clearImageButton', 'promptInput',
  'serviceState', 'modelName', 'analyzeImportButton', 'generateAfterReverseToggle', 'analyzeImportLabel', 'statusBar', 'statusText',
  'runtimeSettingsPanel', 'runtimeAspects', 'runtimeAspectLabel', 'runtimeDetails', 'runtimeDetailLabel',
  'runtimeXiezhenTemplatePicker', 'runtimeXiezhenTemplateButton', 'runtimeXiezhenTemplateCurrent', 'runtimeXiezhenTemplateDescription', 'runtimeXiezhenTemplateOptions', 'runtimeXiezhenTemplateLabel',
  'runtimeAestheticPresetPicker', 'runtimeAestheticPresetButton', 'runtimeAestheticPresetCurrent', 'runtimeAestheticPresetDescription', 'runtimeAestheticPresetOptions', 'runtimeAestheticPresetLabel',
  'runtimeImageModelBlock', 'runtimeImageModelLabel', 'runtimeImageModelPicker', 'runtimeImageModelButton', 'runtimeImageModelCurrent', 'runtimeImageModelOptions',
  'runtimeConcurrencyLabel', 'runtimeConcurrencyValue',
  'runtimePortraitFidelityToggle', 'runtimeVariantToggle', 'runtimeInspectToggle', 'runtimeColorCardToggle', 'runtimeReferencePaletteToggle', 'runtimeActionReferenceToggle',
  'breakdownVisibleCount', 'breakdownSearch', 'breakdownExpandButton', 'breakdownFilters',
  'resultWorkspace', 'resultCard', 'resultEyebrow', 'resultHeadline', 'resultCount', 'resultSummary', 'resultMeta',
  'reverseSections', 'paletteSection', 'paletteList', 'paletteStrip', 'paletteCount', 'copyPaletteButton', 'favoritePaletteButton', 'paletteReferenceButton', 'reversePromptCard', 'reversePrompt', 'copyReversePromptButton', 'editReversePromptButton', 'favoritePromptButton', 'generateFromReverseButton', 'previewReverseGenerationPromptButton',
  'resultGenerationStyleToggle', 'resultGenerationStyleBody', 'resultGenerationStyles', 'resultGenerationStyleLabel', 'resultGenerationStylePreview', 'resultGenerationStyleClear',
  'resultGenerationImageToggle', 'resultGenerationImageBody', 'resultGenerationImageControls', 'resultGenerationImageLabel', 'resultGenerationImagePreview', 'resultGenerationImageClear',
  'copyPromptWithGenerationStyleButton',
  'xiezhenPromptCard', 'xiezhenPromptTitle', 'xiezhenPromptMeta', 'xiezhenPrompt', 'generateFromXiezhenButton', 'editXiezhenPromptButton', 'favoriteXiezhenButton', 'copyXiezhenPromptButton', 'previewXiezhenGenerationPromptButton',
  'variantPromptCard', 'variantPrompt', 'copyVariantPromptButton', 'editVariantPromptButton', 'favoriteVariantButton', 'favoriteAllButton',
  'historyList', 'historyEmpty', 'clearHistoryButton', 'queueStats', 'runQueueButton',
  'queueDrawer', 'queueDrawerButton', 'queueBadge',
  'runtimeDrawer', 'runtimeDrawerButton', 'closeRuntimeDrawerButton',
  'thumbPreview', 'thumbPreviewImage', 'thumbViewer', 'thumbViewerImage', 'thumbViewerClose',
  'generatedResultModule', 'generatedResultMeta', 'resultImageStage', 'resultOriginalImage', 'generatedImage', 'expandSourceFromResult', 'generationFeedback', 'generationFeedbackOptions', 'generationFeedbackStatus',
  'generatedRequestPromptPanel', 'generatedRequestPromptToggle', 'generatedRequestPromptBody', 'generatedRequestPromptText', 'generatedRequestPromptMeta', 'copyGeneratedRequestPromptButton',
  'generationPromptDialog', 'generationPromptCloseButton', 'generationPromptPreviewText', 'generationPromptPreviewMeta', 'copyGenerationPromptPreviewButton',
  'downloadGeneratedButton', 'favoriteGeneratedButton', 'saveEagleButton',
  'promptModeTabs', 'visualArchiveTabs', 'breakdownModule', 'resultActionDock',
  'resultJumpBar', 'previousTaskButton', 'taskSwitcherButton', 'taskSwitcherLabel', 'taskSwitcherState', 'nextTaskButton',
  'promptModeSwitcher', 'generationTuningPanel', 'resultDockGenerateButton', 'resultDockCopyButton', 'resultDockFavoriteButton', 'resultDockEditButton',
  'resultAssistantButton', 'resultAssistantDialog', 'resultAssistantCloseButton', 'resultAssistantMeta', 'resultAssistantActions', 'resultAssistantInstruction', 'resultAssistantCurrentLabel', 'resultAssistantCurrentPrompt', 'runResultAssistantButton', 'resultAssistantStatus', 'resultAssistantOutput', 'resultAssistantSummary', 'resultAssistantPrompt', 'resultAssistantChanges', 'copyResultAssistantButton', 'applyResultAssistantButton', 'resultAssistantRevisionCard', 'resultAssistantRevisions',
  'openLibraryButton', 'retryButton', 'selectionFavoriteButton'
];
const el = Object.fromEntries(ids.map(id => [id, document.getElementById(id)]));

// 本 sidepanel 会话唯一标识：作为上游请求的中断键，background 据此精确 abort，
// 避免多窗口 sidepanel 共用单例导致「停止队列」命中非目标请求
const SIDE_PANEL_CLIENT_ID = (globalThis.crypto?.randomUUID?.() || (`sp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`));

/**
 * 带兜底的 runtime.sendMessage：
 * - 监听器侧「返回 true 但通道提前关闭」错误（典型：iframe/popup 在响应前被关闭）被静默降级为普通 rejected 对象，
 *   不再冒泡为 Unchecked runtime.lastError；
 * - 其它错误继续正常抛出，保持现有错误处理链路；
 * - 任何分支都会读取一次 chrome.runtime.lastError，避免残留告警。
 */
function runtimeSend(message) {
  return new Promise((resolve, reject) => {
    let settled = false;
    try {
      chrome.runtime.sendMessage({ ...message, fbaseAbortKey: SIDE_PANEL_CLIENT_ID }, (response) => {
        const lastError = chrome.runtime.lastError;
        if (settled) return;
        settled = true;
        if (lastError) {
          const msg = String(lastError.message || lastError || '');
          const benign = /message channel closed|port closed|receiving end does not exist|could not establish connection|context invalidated/i.test(msg);
          if (benign) resolve({ ok: false, error: msg, channelClosed: true });
          else reject(Object.assign(new Error(msg), { raw: lastError }));
          return;
        }
        resolve(response);
      });
    } catch (syncError) {
      if (settled) return;
      settled = true;
      reject(syncError);
    }
  });
}

function bindCriticalButtons() {
  const openLib = document.getElementById('openLibraryButton');
  const settingsBtn = document.getElementById('settingsButton');
  const settingsDialog = document.getElementById('settingsDialog');
  const settingsClose = document.getElementById('settingsCloseButton');
  // 用 __fbaseBound 标记避免 bindEvents 里再次绑定同一按钮造成双击触发
  if (openLib && !openLib.__fbaseBound) {
    openLib.__fbaseBound = true;
    openLib.addEventListener('click', () => {
      try { openLibrary(); } catch (e) { console.warn('openLibrary error', e); setStatus(e?.message || '打开词库失败', 'error'); }
    });
  }
  if (settingsBtn && !settingsBtn.__fbaseBound) {
    settingsBtn.__fbaseBound = true;
    settingsBtn.addEventListener('click', () => settingsDialog?.showModal?.());
  }
  if (settingsClose && !settingsClose.__fbaseBound) {
    settingsClose.__fbaseBound = true;
    settingsClose.addEventListener('click', () => settingsDialog?.close?.());
  }
  // 模块折叠/展开（原始素材、补充要求、画面解构…）是核心交互，放在 bindEvents 的
  // try/catch 之外单独绑定。之前它挂在 bindEvents 里的 document 监听上，只要那一段
  // 抛错，整排收起/展开就全部静默失效。
  if (!document.__fbaseModuleToggleBound) {
    document.__fbaseModuleToggleBound = true;
    document.addEventListener('click', handleModuleToggleClick);
  }
}

function handleModuleToggleClick(event) {
  if (el.modelPicker && !el.modelPicker.contains(event.target)) closeModelOptions();
  if (el.imageModelPicker && !el.imageModelPicker.contains(event.target)) closeImageModelOptions();
  if (el.profilePicker && !el.profilePicker.contains(event.target)) closeProfileOptions();
  // 点抽屉外面就收起（抽屉和顶栏按钮本身除外）
  if (isQueueDrawerOpen() && !el.queueDrawer.contains(event.target)
    && !el.queueDrawerButton?.contains(event.target)
    && !el.taskSwitcherButton?.contains(event.target)) closeQueueDrawer();
  if (isRuntimeDrawerOpen() && !el.runtimeDrawer.contains(event.target)
    && !el.runtimeDrawerButton?.contains(event.target)) closeRuntimeDrawer();
  handleTaskModuleToggle(event);
}

// ===== 任务队列抽屉：队列是导航面，不该占着页面流的位置，改成顶栏随时唤出 =====

let queueStripScrollLeft = 0;

function syncQueueDrawerOffset() {
  if (!el.queueDrawer) return;
  const head = document.querySelector('.studio-head');
  if (head) el.queueDrawer.style.top = `${Math.round(head.getBoundingClientRect().height)}px`;
}

function isQueueDrawerOpen() {
  return Boolean(el.queueDrawer) && !el.queueDrawer.hidden;
}

function openQueueDrawer() {
  if (!el.queueDrawer) return;
  closeRuntimeDrawer();
  syncQueueDrawerOffset();
  el.queueDrawer.hidden = false;
  el.queueDrawerButton?.classList.add('is-open');
  el.queueDrawerButton?.setAttribute('aria-expanded', 'true');
  el.taskSwitcherButton?.classList.add('is-open');
  el.taskSwitcherButton?.setAttribute('aria-expanded', 'true');
  // 隐藏时 scrollLeft 会被清零，重新打开要还原，否则每次都跳回第一个
  if (queueStripScrollLeft > 0 && el.historyList) el.historyList.scrollLeft = queueStripScrollLeft;
  requestAnimationFrame(revealActiveQueueCard);
}

function closeQueueDrawer() {
  if (!el.queueDrawer || el.queueDrawer.hidden) return;
  if (el.historyList) queueStripScrollLeft = el.historyList.scrollLeft;
  hideThumbPreview();
  el.queueDrawer.hidden = true;
  el.queueDrawerButton?.classList.remove('is-open');
  el.queueDrawerButton?.setAttribute('aria-expanded', 'false');
  el.taskSwitcherButton?.classList.remove('is-open');
  el.taskSwitcherButton?.setAttribute('aria-expanded', 'false');
}

function toggleQueueDrawer() {
  if (!el.queueDrawer) return;
  if (el.queueDrawer.hidden) openQueueDrawer();
  else closeQueueDrawer();
}

function bindQueueDrawer() {
  if (!el.queueDrawer) return;
  el.queueDrawerButton?.addEventListener('click', toggleQueueDrawer);
  window.addEventListener('resize', syncQueueDrawerOffset);
  syncQueueDrawerOffset();
}

// ===== 运行设置抽屉：从任务卡移出，与任务队列抽屉并列 =====

function isRuntimeDrawerOpen() {
  return Boolean(el.runtimeDrawer) && !el.runtimeDrawer.hidden;
}

function openRuntimeDrawer() {
  if (!el.runtimeDrawer) return;
  closeQueueDrawer();
  syncQueueDrawerOffset();
  el.runtimeDrawer.hidden = false;
  el.runtimeDrawerButton?.classList.add('is-open');
  el.runtimeDrawerButton?.setAttribute('aria-expanded', 'true');
  renderRuntimeSettings();
}

function closeRuntimeDrawer() {
  if (!el.runtimeDrawer || el.runtimeDrawer.hidden) return;
  el.runtimeDrawer.hidden = true;
  el.runtimeDrawerButton?.classList.remove('is-open');
  el.runtimeDrawerButton?.setAttribute('aria-expanded', 'false');
}

function toggleRuntimeDrawer() {
  if (!el.runtimeDrawer) return;
  if (el.runtimeDrawer.hidden) openRuntimeDrawer();
  else closeRuntimeDrawer();
}

function bindRuntimeDrawer() {
  if (!el.runtimeDrawer) return;
  el.runtimeDrawerButton?.addEventListener('click', toggleRuntimeDrawer);
  el.closeRuntimeDrawerButton?.addEventListener('click', closeRuntimeDrawer);
}

function revealActiveQueueCard() {
  const list = el.historyList;
  const active = list?.querySelector('.history-item.is-active');
  if (!list || !active) return;
  const visibleLeft = list.scrollLeft;
  const visibleRight = visibleLeft + list.clientWidth;
  const cardLeft = active.offsetLeft;
  const cardRight = cardLeft + active.offsetWidth;
  if (cardLeft >= visibleLeft && cardRight <= visibleRight) return;
  const left = Math.max(0, cardLeft - ((list.clientWidth - active.offsetWidth) / 2));
  list.scrollTo({ left, behavior: 'smooth' });
}

initialize();

async function initialize() {
  // 核心按钮独立绑定兜底：无论 bindEvents 是否成功，这些操作必定可用
  bindCriticalButtons();
  try { bindEvents(); } catch (err) { console.error('F·BASE bindEvents 中断，之后的事件绑定全部失效', err); }
  const [stored, sessionStored] = await Promise.all([
    chrome.storage.local.get(['finnCapture', 'finnSettings', 'finnDraftPrompt', 'finnModels', 'finnHistory', 'fbaseQuickSettings', PROFILE_SECRET_STORE_KEY]),
    chrome.storage.session.get(['finnCapture', WORKSPACE_SYNC_KEY])
  ]);
  const saved = stored.finnSettings || {};
  profileSecrets = normalizeProfileSecrets(stored[PROFILE_SECRET_STORE_KEY]);
  const initialCapture = sessionStored.finnCapture || stored.finnCapture || null;
  state.capture = null;
  state.settings = {
    ...DEFAULT_SETTINGS,
    ...saved,
    libraryEndpoint: saved.libraryEndpoint || saved.kbaseEndpoint || DEFAULT_SETTINGS.libraryEndpoint,
    llmEndpoint: saved.llmEndpoint || saved.dsEndpoint || '',
    apiKey: saved.apiKey || saved.dsKey || '',
    model: saved.model || saved.dsModel || '',
    imageEndpoint: saved.imageEndpoint || '',
    imageApiKey: saved.imageApiKey || '',
    imageModel: saved.imageModel || '',
    assistantModel: saved.assistantModel || '',
    eagleEnabled: saved.eagleEnabled !== false,
    eagleEndpoint: saved.eagleEndpoint || DEFAULT_SETTINGS.eagleEndpoint,
    eagleTags: saved.eagleTags || DEFAULT_SETTINGS.eagleTags
  };
  state.models = normalizeModels(stored.finnModels || []);
  state.quickSettings = normalizeQuickSettings(stored.fbaseQuickSettings);
  state.history = normalizeHistory(stored.finnHistory || []);
  if (!saved.llmEndpoint && (saved.dsEndpoint || saved.dsKey || saved.dsModel)) {
    await chrome.storage.local.set({ finnSettings: state.settings });
  }
  if (!sessionStored.finnCapture && stored.finnCapture) {
    await persistCapture(stored.finnCapture);
  }
  if (stored.finnCapture) await chrome.storage.local.remove('finnCapture');
  el.promptInput.value = stored.finnDraftPrompt || '';
  fillSettingsForm();
  renderCapture();
  renderInputState();
  renderModel();
  renderRuntimeSettings();
  renderHistory();
  await loadSharedProfiles(false);
  if (sessionStored[WORKSPACE_SYNC_KEY]) await applySharedWorkspace(sessionStored[WORKSPACE_SYNC_KEY]);
  workspaceReady = true;
  if (initialCapture) await enqueueCapture(initialCapture);
  else if (!sessionStored[WORKSPACE_SYNC_KEY]) scheduleWorkspacePublish();
  await checkLibrary(false);
}

function bindEvents() {
  // bindCriticalButtons 已绑定的核心按钮跳过，避免同一按钮绑两次导致开两个标签页
  const on = (target, evt, fn, opts) => {
    if (!target || target.__fbaseBound) return;
    target.addEventListener?.(evt, fn, opts);
  };
  on(el.pickButton, 'click', startPicker);
  on(el.pasteImageButton, 'click', pasteImageFromClipboard);
  on(el.runtimeAspects, 'click', event => {
    const button = event.target.closest('[data-aspect]');
    if (button) updateQuickSettings({ aspectRatio: button.dataset.aspect });
  });
  on(el.runtimeDetails, 'click', event => {
    const button = event.target.closest('[data-detail]');
    if (button) updateQuickSettings({ promptDetail: button.dataset.detail });
  });
  on(el.resultGenerationStyles, 'click', event => {
    const button = event.target.closest('[data-generation-style]');
    if (!button) return;
    toggleResultGenerationStyle(button.dataset.generationStyle);
  });
  on(el.resultGenerationStyleToggle, 'click', () => toggleResultGenerationControl('style'));
  on(el.resultGenerationStyleClear, 'click', () => setResultGenerationStyles([]));
  on(el.resultGenerationImageControls, 'click', event => {
    const button = event.target.closest('[data-generation-image]');
    if (!button) return;
    toggleResultGenerationImage(button.dataset.generationImage);
  });
  on(el.resultGenerationImageToggle, 'click', () => toggleResultGenerationControl('image'));
  on(el.resultGenerationImageClear, 'click', () => setResultGenerationImageControls([]));
  on(el.copyPromptWithGenerationStyleButton, 'click', copyPromptWithGenerationStyle);
  on(el.runtimeXiezhenTemplateButton, 'click', event => toggleRuntimeChoicePicker('template', event));
  on(el.runtimeAestheticPresetButton, 'click', event => toggleRuntimeChoicePicker('preset', event));
  on(el.runtimeXiezhenTemplateOptions, 'click', event => selectRuntimeChoice('template', event));
  on(el.runtimeAestheticPresetOptions, 'click', event => selectRuntimeChoice('preset', event));
  document.querySelector('.runtime-settings-panel')?.addEventListener('click', event => {
    const btn = event.target.closest('[data-concurrency-delta]');
    if (!btn) return;
    const delta = Number(btn.dataset.concurrencyDelta);
    const next = Math.max(1, Math.min(6, state.quickSettings.concurrency + delta));
    updateQuickSettings({ concurrency: next });
  });
  on(el.runtimeImageModelButton, 'click', event => {
    event.stopPropagation();
    const willOpen = el.runtimeImageModelOptions.hidden;
    el.runtimeImageModelOptions.hidden = !willOpen;
    el.runtimeImageModelButton.classList.toggle('is-open', willOpen);
    el.runtimeImageModelButton.setAttribute('aria-expanded', String(willOpen));
  });
  on(el.runtimeImageModelOptions, 'click', event => {
    const option = event.target.closest('[data-image-model]');
    if (!option) return;
    const value = option.dataset.imageModel;
    state.settings.activeImageModel = value === state.settings.imageModel ? '' : value;
    chrome.storage.local.set({ finnSettings: state.settings });
    el.runtimeImageModelOptions.hidden = true;
    el.runtimeImageModelButton.classList.remove('is-open');
    el.runtimeImageModelButton.setAttribute('aria-expanded', 'false');
    renderRuntimeSettings();
    const active = activeSharedProfile();
    if (active) {
      state.profiles = state.profiles.map(profile => profile.id === active.id ? { ...profile, activeImageModel: state.settings.activeImageModel } : profile);
      persistSharedProfiles();
    }
  });
  document.addEventListener('click', event => {
    if (!el.runtimeXiezhenTemplatePicker?.contains(event.target)) closeRuntimeChoicePicker('template');
    if (!el.runtimeAestheticPresetPicker?.contains(event.target)) closeRuntimeChoicePicker('preset');
    if (!el.runtimeImageModelPicker?.contains(event.target)) {
      el.runtimeImageModelOptions.hidden = true;
      el.runtimeImageModelButton?.classList.remove('is-open');
      el.runtimeImageModelButton?.setAttribute('aria-expanded', 'false');
    }
  });
  document.querySelectorAll('[data-runtime-toggle]').forEach(input => {
    on(input, 'change', () => updateQuickSettings({ [input.dataset.runtimeToggle]: input.checked }));
  });
  on(el.sourceFileInput, 'change', event => loadSourceFiles(event.target.files));
  on(el.previewWrap, 'click', event => {
    if (state.capture || event.target.closest('button')) return;
    el.sourceFileInput.click();
  });
  on(el.previewWrap, 'keydown', event => {
    if (state.capture || !['Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    el.sourceFileInput.click();
  });
  on(el.clearImageButton, 'click', clearImage);
  on(el.promptInput, 'input', () => {
    const task = activeQueueTask();
    if (task && !taskIsInFlight(task)) task.inputText = el.promptInput.value;
    invalidateAnalysis();
    renderInputState();
    chrome.storage.local.set({ finnDraftPrompt: el.promptInput.value });
  });
  document.addEventListener('paste', handleImagePaste);
  // 双按钮合并为单主按钮 + 勾选项（UX 审计 P1-1）：勾选「反推后自动生成」即等价原「反推并生成」
  on(el.analyzeImportButton, 'click', () => {
    if (el.generateAfterReverseToggle?.checked) reverseAndGenerate();
    else analyzeAndContinue();
  });
  on(el.generateFromReverseButton, 'click', generateFromReverseResult);
  on(el.previewReverseGenerationPromptButton, 'click', () => openGenerationPromptPreview('reverse'));
  on(el.previewXiezhenGenerationPromptButton, 'click', () => openGenerationPromptPreview('xiezhen'));
  on(el.generationPromptCloseButton, 'click', () => el.generationPromptDialog?.close());
  on(el.copyGenerationPromptPreviewButton, 'click', copyGenerationPromptPreview);
  on(el.generatedRequestPromptToggle, 'click', toggleGeneratedRequestPrompt);
  on(el.copyGeneratedRequestPromptButton, 'click', copyGeneratedRequestPrompt);
  on(el.promptModeTabs, 'click', event => {
    const button = event.target.closest('[data-prompt-mode]');
    if (button && !button.disabled) setPromptMode(button.dataset.promptMode);
  });
  on(el.visualArchiveTabs, 'click', event => {
    const button = event.target.closest('[data-archive-mode]');
    if (button && !button.disabled) setVisualArchiveMode(button.dataset.archiveMode);
  });
  on(el.resultDockGenerateButton, 'click', generateFromActivePromptMode);
  on(el.resultDockCopyButton, 'click', copyActivePromptMode);
  on(el.resultDockFavoriteButton, 'click', favoriteActivePromptMode);
  on(el.resultDockEditButton, 'click', editActivePromptMode);
  on(el.resultAssistantButton, 'click', openResultAssistant);
  on(el.resultAssistantCloseButton, 'click', () => el.resultAssistantDialog?.close());
  on(el.resultAssistantActions, 'click', event => {
    const button = event.target.closest('[data-assistant-action]');
    if (!button || state.assistantRunning) return;
    state.assistantAction = button.dataset.assistantAction;
    state.assistantDraft = null;
    state.assistantMessage = '';
    renderResultAssistant();
  });
  on(el.runResultAssistantButton, 'click', runResultAssistant);
  on(el.copyResultAssistantButton, 'click', copyResultAssistantDraft);
  on(el.applyResultAssistantButton, 'click', applyResultAssistantDraft);
  on(el.resultAssistantRevisions, 'click', event => {
    const button = event.target.closest('[data-assistant-restore]');
    if (button) restoreAssistantRevision(Number(button.dataset.assistantRestore));
  });
  on(el.retryButton, 'click', analyzeAndContinue);
  on(el.copyReversePromptButton, 'click', copyReversePrompt);
  on(el.copyXiezhenPromptButton, 'click', copyXiezhenPrompt);
  on(el.copyVariantPromptButton, 'click', copyVariantPrompt);
  on(el.editReversePromptButton, 'click', () => togglePromptEdit('prompt'));
  on(el.editXiezhenPromptButton, 'click', () => togglePromptEdit('xiezhen'));
  on(el.editVariantPromptButton, 'click', () => togglePromptEdit('variant'));
  on(el.favoritePromptButton, 'click', () => favoritePrompt('prompt'));
  on(el.favoriteXiezhenButton, 'click', () => favoritePrompt('xiezhen'));
  on(el.favoriteVariantButton, 'click', () => favoritePrompt('variant'));
  on(el.generateFromXiezhenButton, 'click', generateFromXiezhenResult);
  on(el.favoriteAllButton, 'click', favoriteAllBreakdown);
  on(el.reverseSections, 'click', handleBreakdownFavorite);
  on(el.reverseSections, 'mouseup', handleBreakdownSelectionMouseUp);
  on(el.selectionFavoriteButton, 'click', favoriteSelectedBreakdownText);
  on(el.breakdownSearch, 'input', () => {
    state.breakdownSearch = el.breakdownSearch.value.trim().toLowerCase();
    renderBreakdownWorkbench();
  });
  on(el.breakdownFilters, 'click', event => {
    const button = event.target.closest('[data-breakdown-filter]');
    if (!button) return;
    state.breakdownFilter = button.dataset.breakdownFilter;
    renderBreakdownWorkbench();
  });
  on(el.breakdownExpandButton, 'click', favoriteVisibleBreakdown);
  on(el.copyPaletteButton, 'click', copyPalette);
  on(el.favoritePaletteButton, 'click', favoritePalette);
  on(el.paletteReferenceButton, 'click', togglePaletteReference);
  on(el.resultImageStage?.parentElement, 'click', handleResultViewClick);
  // 点击生成图/原图 → 打开全屏预览（支持缩放/拖动 + 旁边解构面板）
  on(el.generatedImage, 'click', () => openResultLightbox(state.resultView || 'result'));
  on(el.resultOriginalImage, 'click', () => openResultLightbox('original'));
  // UX 审计 #4：结果区原图下加「展开原素材」，点击后把当前任务卡里的原始素材模块展开，方便对照
  on(el.expandSourceFromResult, 'click', event => {
    event.stopPropagation();
    state.sourceCollapsed = false;
    renderCapture();
    el.sourceModule?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  bindLightboxEvents();
  on(el.downloadGeneratedButton, 'click', downloadGeneratedImage);
  on(el.favoriteGeneratedButton, 'click', favoriteGeneratedImage);
  on(el.saveEagleButton, 'click', saveGeneratedToEagle);
  on(el.generationFeedbackOptions, 'click', handleGenerationFeedback);
  on(el.paletteList, 'click', event => {
    const item = event.target.closest('[data-palette-hex]');
    if (item) copyWithFeedback(item.closest('[data-palette-hex]') || item, item.dataset.paletteHex).then(() => setStatus(`已复制 ${item.dataset.paletteHex}`, 'success'));
  });
  on(el.clearHistoryButton, 'click', clearHistory);
  on(el.runQueueButton, 'click', runTaskQueue);
  on(el.historyList, 'click', handleHistoryClick);
  on(el.historyList, 'keydown', handleHistoryKeydown);
  on(el.historyList, 'wheel', handleStripWheel, { passive: false });
  on(el.historyList, 'pointerover', handleThumbPointerOver);
  on(el.historyList, 'pointerout', handleThumbPointerOut);
  on(el.historyList, 'pointerdown', handleThumbPointerDown);
  on(el.historyList, 'pointermove', handleThumbPointerMove);
  on(el.historyList, 'scroll', hideThumbPreview);
  on(el.thumbViewer, 'click', event => { if (!event.target.closest('img')) closeThumbViewer(); });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (isQueueDrawerOpen()) closeQueueDrawer();
    closeThumbViewer();
  });
  try { bindResultJumpBar(); } catch (err) { console.error('F·BASE 结果区锚点条初始化失败', err); }
  try { bindQueueDrawer(); } catch (err) { console.error('F·BASE 任务队列抽屉初始化失败', err); }
  try { bindRuntimeDrawer(); } catch (err) { console.error('F·BASE 运行设置抽屉初始化失败', err); }
  on(el.openLibraryButton, 'click', openLibrary);
  on(el.settingsButton, 'click', openSettings);
  on(el.settingsCloseButton, 'click', () => el.settingsDialog?.close?.());
  on(el.profileToggleButton, 'click', toggleProfileOptions);
  on(el.profileSearchInput, 'input', renderSharedProfiles);
  on(el.profileOptionList, 'click', event => {
    const option = event.target.closest('[data-profile-id]');
    if (!option) return;
    el.profileSelect.value = option.dataset.profileId;
    closeProfileOptions();
    switchSharedProfile();
  });
  on(el.refreshProfilesButton, 'click', () => loadSharedProfiles(true));
  on(el.newProfileButton, 'click', createSharedProfile);
  on(el.deleteProfileButton, 'click', deleteSharedProfile);
  on(el.settingsForm, 'submit', saveSettings);
  on(el.fetchModelsButton, 'click', fetchModels);
  on(el.testConnectionButton, 'click', testConnection);
  on(el.runDiagnosticsButton, 'click', runDiagnostics);
  on(el.testEagleButton, 'click', testEagleConnection);
  on(el.modelToggleButton, 'click', toggleModelOptions);
  on(el.modelInput, 'focus', () => openModelOptions());
  on(el.modelInput, 'input', () => openModelOptions(el.modelInput.value));
  on(el.modelInput, 'keydown', handleModelInputKeydown);
  on(el.modelOptions, 'click', handleModelOptionClick);
  on(el.modelOptions, 'keydown', handleModelOptionsKeydown);
  on(el.imageModelToggleButton, 'click', toggleImageModelOptions);
  on(el.imageModelInput, 'focus', () => openImageModelOptions());
  on(el.imageModelInput, 'input', () => openImageModelOptions(el.imageModelInput.value));
  on(el.imageModelInput, 'keydown', handleImageModelInputKeydown);
  on(el.imageModelOptions, 'click', handleImageModelOptionClick);
  on(el.imageModelOptions, 'keydown', handleImageModelOptionsKeydown);
  on(el.settingsDialog, 'close', () => {
    closeModelOptions();
    closeImageModelOptions();
    closeProfileOptions();
  });
  // 模块折叠监听已移到 bindCriticalButtons()，这里不再重复绑定
  document.addEventListener('pointerdown', event => {
    if (!event.target.closest('#selectionFavoriteButton') && !event.target.closest('.breakdown-sheet-row')) hideSelectionFavorite();
  });
  window.addEventListener('message', handleHostQuickAction);
  chrome.storage.onChanged.addListener(async (changes, area) => {
    if (area === 'local') {
      if (changes.fbaseQuickSettings) {
        state.quickSettings = normalizeQuickSettings(changes.fbaseQuickSettings.newValue);
        renderRuntimeSettings();
        if (state.result) renderResult(state.result);
      }
      if (changes.finnHistory) {
        state.history = normalizeHistory(changes.finnHistory.newValue || []);
        renderHistory();
      }
      if (changes.finnDraftPrompt && document.activeElement !== el.promptInput) {
        el.promptInput.value = changes.finnDraftPrompt.newValue || '';
        renderInputState();
      }
      if (changes.finnSettings) {
        state.settings = { ...DEFAULT_SETTINGS, ...(changes.finnSettings.newValue || {}) };
        fillSettingsForm();
        renderModel();
        renderRuntimeSettings();
      }
      if (changes.finnModels) {
        state.models = normalizeModels(changes.finnModels.newValue || []);
        renderModel();
      }
      return;
    }
    if (area !== 'session') return;
    if (changes[WORKSPACE_SYNC_KEY]) {
      const shared = changes[WORKSPACE_SYNC_KEY].newValue;
      if (shared && shared.source !== workspaceInstanceId) applySharedWorkspace(shared).catch(error => console.warn('F·BASE workspace sync failed', error));
    }
    if (!Object.prototype.hasOwnProperty.call(changes, 'finnCapture')) return;
    if (consumeSessionCaptureMutation(changes.finnCapture.newValue)) return;
    const incoming = changes.finnCapture.newValue || null;
    if (incoming) {
      // 新素材到达：一律进入任务队列（真实排队），空闲时立即激活为当前任务
      await enqueueCapture(incoming);
    } else {
      // 素材被消费（反推入库后 session.remove）：
      // 只清素材展示区，绝不能动 state.result / resultCard，
      // 否则会把刚渲染出来的反推结果藏掉（"展开一下就跳走"的根因）
      if (state.running || runningTaskIds.size) return; // 本窗口正在跑任务，忽略外部消费信号，防止清掉刚激活的下一个任务
      state.capture = null;
      state.activeTaskId = '';
      state.sourceDataUrl = '';
      state.uploadedName = '';
      state.localEvidence = null;
      renderCapture();
      renderInputState();
    }
  });
}

// 并发反推控制：单卡手动启动，或由用户点击“批量运行”显式启动全部未开始任务
let runningTaskIds = new Set();
let runningTaskPromises = new Set();
const completedTaskTombstones = new Map();

function pruneCompletedTaskTombstones() {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  for (const [id, completedAt] of completedTaskTombstones) {
    if (Number(completedAt) < cutoff) completedTaskTombstones.delete(id);
  }
}

function taskWasCompleted(task) {
  return TASK_QUEUE_RUNTIME.wasCompleted(task, completedTaskTombstones);
}

function taskHasCompletedResult(task) {
  return TASK_QUEUE_RUNTIME.hasCompletedResult(task, completedTaskTombstones);
}

function removeCompletedQueueGhosts() {
  const ghosts = state.taskQueue.filter(taskHasCompletedResult);
  if (!ghosts.length) return false;
  const ids = new Set(ghosts.map(task => task.id));
  const now = Date.now();
  ghosts.forEach(task => completedTaskTombstones.set(task.id, Math.max(Number(task.completedAt) || 0, Number(completedTaskTombstones.get(task.id)) || 0, now)));
  state.taskQueue = state.taskQueue.filter(task => !ids.has(task.id));
  if (ids.has(state.activeTaskId)) state.activeTaskId = '';
  return true;
}

function concurrencyLimit() {
  return Math.max(1, Math.min(6, Number(state.quickSettings.concurrency) || 3));
}

function activeQueueTask() {
  return state.activeTaskId ? state.taskQueue.find(item => item.id === state.activeTaskId) || null : null;
}

function taskIsInFlight(task) {
  return Boolean(task && (task.status === 'queued' || task.status === 'running' || runningTaskIds.has(task.id)));
}

function setTaskPhase(task, phase) {
  if (TASK_QUEUE_RUNTIME.setPhase(task, phase)) renderHistory();
}

function createCaptureEventId(prefix = 'capture') {
  const random = globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2, 12);
  return `${prefix}_${Date.now()}_${random}`;
}

function launchConcurrentWorker(task) {
  if (!task || runningTaskIds.has(task.id) || task.status !== 'queued') return;
  runningTaskIds.add(task.id);
  const p = runReverseTask(task);
  runningTaskPromises.add(p);
  const settle = () => {
    runningTaskIds.delete(task.id);
    runningTaskPromises.delete(p);
    scheduleConcurrentLaunch();
  };
  p.then(settle, settle);
}

function scheduleConcurrentLaunch() {
  // 延迟到微任务后，确保本次入队/完成已落定，再按并发上限补位
  Promise.resolve().then(() => {
    while (runningTaskIds.size < concurrencyLimit()) {
      const next = state.taskQueue.find(t => t.status === 'queued' && t.runnerId === workspaceInstanceId && !runningTaskIds.has(t.id));
      if (!next) break;
      launchConcurrentWorker(next);
    }
  });
}

async function captureTaskId(capture) {
  const captureEventId = String(capture?.captureId || '').trim();
  const srcUrl = String(capture?.srcUrl || '').trim();
  const dataUrl = String(capture?.dataUrl || '').trim();
  const fallback = [capture?.pageUrl, capture?.alt, capture?.pageTitle].map(value => String(value || '').trim()).join('|');
  const identity = captureEventId ? `event:${captureEventId}` : (srcUrl || dataUrl || fallback || `capture-${Number(capture?.capturedAt) || Date.now()}`);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(identity));
  const shortHash = [...new Uint8Array(digest)].slice(0, 12).map(byte => byte.toString(16).padStart(2, '0')).join('');
  return `task_capture_${shortHash}`;
}

async function dedupeQueuedCaptures(tasks) {
  const unique = [];
  const seen = new Set();
  const idMap = new Map();
  for (const task of Array.isArray(tasks) ? tasks : []) {
    if (!task?.capture) continue;
    const stableId = await captureTaskId(task.capture);
    idMap.set(task.id, stableId);
    if (seen.has(stableId)) continue;
    seen.add(stableId);
    unique.push({ ...task, id: stableId });
  }
  return { tasks: unique, idMap };
}

// 网页采集（点选、右键、悬停按钮）：只进入待处理队列，由用户选择处理方式
async function enqueueCapture(capture) {
  const srcUrl = String(capture.srcUrl || '');
  const taskId = await captureTaskId(capture);
  // 同一发送事件会同步到多个浮窗，只按 captureId 对应的任务 ID 去重。
  // 用户再次发送同一张图片时会获得新的 captureId，因此会创建新的独立任务。
  if (state.taskQueue.some(item => item.id === taskId)) {
    renderHistory();
    setStatus('这个发送任务已经在待处理队列中', 'success');
    return;
  }
  const task = {
    id: taskId,
    name: capture.pageTitle || capture.alt || shortHost(capture.pageUrl) || '网页采集图片',
    status: 'waiting',
    createdAt: Date.now(),
    thumbnail: capture.dataUrl || srcUrl || '',
    dataUrl: capture.dataUrl || '',
    capture
  };
  state.taskQueue.push(task);
  // 新素材永远成为新的活动卡。正在运行的旧卡继续使用自己的素材与上下文。
  await activateQueuedTask(task.id);
  setStatus('已创建独立任务，请选择“开始反推”或“反推并生成”', 'success');
}

function handleTaskModuleToggle(event) {
  const head = event.target.closest('[data-module-toggle]');
  if (!head || event.target.closest('button, input, textarea, select, a, label')) return;
  const module = head.closest('.task-module');
  if (!module) return;
  module.classList.toggle('is-collapsed');
  head.setAttribute('aria-expanded', String(!module.classList.contains('is-collapsed')));
  if (module.id === 'sourceModule') state.sourceCollapsed = module.classList.contains('is-collapsed');
}

function handleBreakdownSelectionMouseUp() {
  requestAnimationFrame(() => {
    const selection = window.getSelection();
    const text = String(selection?.toString() || '').replace(/\s+/g, ' ').trim();
    if (!selection || selection.rangeCount !== 1 || text.length < 2 || text.length > 160) {
      hideSelectionFavorite();
      return;
    }
    const startNode = selection.anchorNode?.nodeType === Node.ELEMENT_NODE ? selection.anchorNode : selection.anchorNode?.parentElement;
    const endNode = selection.focusNode?.nodeType === Node.ELEMENT_NODE ? selection.focusNode : selection.focusNode?.parentElement;
    const startRow = startNode?.closest?.('.breakdown-sheet-row');
    const endRow = endNode?.closest?.('.breakdown-sheet-row');
    if (!startRow || startRow !== endRow) {
      hideSelectionFavorite();
      return;
    }
    const entry = state.result?.breakdown?.find(item => item.key === startRow.dataset.breakdownKey);
    if (!entry) return hideSelectionFavorite();
    const rect = selection.getRangeAt(0).getBoundingClientRect();
    state.selectionFavorite = { entry, text };
    el.selectionFavoriteButton.classList.remove('hidden');
    const width = el.selectionFavoriteButton.offsetWidth || 112;
    const left = Math.max(8, Math.min(window.innerWidth - width - 8, rect.left + rect.width / 2 - width / 2));
    const top = Math.max(8, Math.min(window.innerHeight - 40, rect.bottom + 8));
    Object.assign(el.selectionFavoriteButton.style, { left: `${left}px`, top: `${top}px` });
  });
}

async function favoriteSelectedBreakdownText() {
  const selected = state.selectionFavorite;
  if (!selected) return;
  el.selectionFavoriteButton.disabled = true;
  try {
    await saveFavoriteTerm(selected.entry, selected.text, 'selection-favorite');
    setStatus(`已收藏选中文字，本次会话累计入库 ${state.sessionImportedTerms || 1} 条`, 'success');
    window.getSelection()?.removeAllRanges();
    hideSelectionFavorite();
  } catch (error) {
    setStatus(error.message || '选中文字收藏失败', 'error');
  } finally {
    el.selectionFavoriteButton.disabled = false;
  }
}

function hideSelectionFavorite() {
  state.selectionFavorite = null;
  el.selectionFavoriteButton.classList.add('hidden');
}

function normalizeQuickSettings(value) {
  const input = value && typeof value === 'object' ? value : {};
  const aspects = ['1:1', '2:3', '3:2', '3:4', '4:3', '9:16', '16:9', '4:5', '21:9', '9:21', '3:1', '1:3', 'AUTO'];
  return {
    aspectRatio: aspects.includes(input.aspectRatio) ? input.aspectRatio : 'AUTO',
    promptDetail: ['concise', 'standard', 'precise'].includes(input.promptDetail) ? input.promptDetail : 'standard',
    outputVariant: input.outputVariant === true,
    inspectButton: input.inspectButton !== false,
    colorCardMode: input.colorCardMode !== false,
    referencePalette: !!input.referencePalette,
    actionReferenceMode: !!input.actionReferenceMode,
    portraitFidelity: !!input.portraitFidelity,
    concurrency: Math.max(1, Math.min(6, Number(input.concurrency) || 3)),
    xiezhenTemplate: globalThis.FBaseXiezhenAssets?.getTemplate(input.xiezhenTemplate)?.id || 'detailed',
    aestheticPreset: globalThis.FBaseXiezhenAssets?.getPreset(input.aestheticPreset)?.id || 'faithful'
  };
}

function resultGenerationStyleIds(result = state.result) {
  const valid = new Set(GENERATION_STYLE_CONTROLS.map(item => item.id));
  const values = Array.isArray(result?.generationStyleControls)
    ? result.generationStyleControls
    : GENERATION_STYLE_CONTROLS.map(item => item.id);
  return [...new Set(values)]
    .filter(id => valid.has(id));
}

function faithfulGenerationPrompt(prompt, result = state.result) {
  const normalizePrompt = globalThis.FBaseReverseMethodology?.normalizePromptPunctuation || (value => String(value || '').trim());
  const current = normalizePrompt(prompt);
  if (!current) return false;
  return [result?.generationPrompt, result?.reversePrompt, result?.prompt]
    .map(normalizePrompt)
    .some(value => value && value === current);
}

function compatibleGenerationControlIds(ids, prompt, result = state.result) {
  const filter = globalThis.FBaseReverseMethodology?.filterGenerationControlIds;
  if (typeof filter !== 'function') return ids;
  return filter(ids, {
    faithful: faithfulGenerationPrompt(prompt, result),
    prompt,
    imageTypeKey: result?.imageType?.key || '',
    evidenceText: Array.isArray(result?.breakdown) ? result.breakdown.map(item => `${item?.label || ''} ${item?.value || ''}`).join(' ') : ''
  });
}

function generationStyleSentence(result = state.result, prompt = '') {
  const selected = new Set(compatibleGenerationControlIds(resultGenerationStyleIds(result), prompt, result));
  const values = GENERATION_STYLE_CONTROLS.filter(item => selected.has(item.id)).map(item => item.text);
  return values.length ? `画面风格要求：${values.join('，')}。` : '';
}

function resultGenerationImageIds(result = state.result) {
  const valid = new Set(GENERATION_IMAGE_CONTROLS.map(item => item.id));
  const values = Array.isArray(result?.generationImageControls)
    ? result.generationImageControls
    : GENERATION_IMAGE_CONTROLS.map(item => item.id);
  return [...new Set(values)]
    .filter(id => valid.has(id));
}

function generationImageSentence(result = state.result, prompt = '') {
  const selected = new Set(compatibleGenerationControlIds(resultGenerationImageIds(result), prompt, result));
  const values = GENERATION_IMAGE_CONTROLS.filter(item => selected.has(item.id)).map(item => item.text);
  return values.length ? `镜头与质感要求：${values.join('，')}。` : '';
}

async function persistResultGenerationControls(message) {
  const task = activeQueueTask();
  if (task?.result?.analysisId === state.result.analysisId) {
    task.result = state.result;
    task.generationStyleControls = resultGenerationStyleIds(state.result);
    task.generationImageControls = resultGenerationImageIds(state.result);
  }
  const historyIndex = state.history.findIndex(item => item.result?.analysisId === state.result.analysisId);
  if (historyIndex >= 0) {
    const previousResult = state.history[historyIndex].result || {};
    state.history[historyIndex] = { ...state.history[historyIndex], result: compactHistoryResult(state.result, previousResult) };
    await chrome.storage.local.set({ finnHistory: state.history });
    renderHistory();
  }
  renderResultGenerationStyles(state.result);
  renderResultGenerationImageControls(state.result);
  scheduleWorkspacePublish();
  setStatus(message, 'success');
}

async function setResultGenerationStyles(ids) {
  if (!state.result) return;
  state.result.generationStyleControls = resultGenerationStyleIds({ generationStyleControls: ids });
  await persistResultGenerationControls(state.result.generationStyleControls.length ? '已更新当前任务的生图风格调整' : '已清空当前任务的生图风格调整');
}

function toggleResultGenerationStyle(id) {
  const selected = new Set(resultGenerationStyleIds(state.result));
  if (selected.has(id)) selected.delete(id);
  else selected.add(id);
  return setResultGenerationStyles(GENERATION_STYLE_CONTROLS.map(item => item.id).filter(key => selected.has(key)));
}

async function setResultGenerationImageControls(ids) {
  if (!state.result) return;
  state.result.generationImageControls = resultGenerationImageIds({ generationImageControls: ids });
  await persistResultGenerationControls(state.result.generationImageControls.length ? '已更新当前任务的镜头与质感调整' : '已清空当前任务的镜头与质感调整');
}

function toggleResultGenerationImage(id) {
  const selected = new Set(resultGenerationImageIds(state.result));
  if (selected.has(id)) selected.delete(id);
  else selected.add(id);
  return setResultGenerationImageControls(GENERATION_IMAGE_CONTROLS.map(item => item.id).filter(key => selected.has(key)));
}

function toggleResultGenerationControl(key) {
  if (state.collapsedGenerationControls.has(key)) state.collapsedGenerationControls.delete(key);
  else state.collapsedGenerationControls.add(key);
  renderResultGenerationControlCollapse();
}

function renderResultGenerationControlCollapse() {
  for (const [key, toggle, body] of [
    ['style', el.resultGenerationStyleToggle, el.resultGenerationStyleBody],
    ['image', el.resultGenerationImageToggle, el.resultGenerationImageBody]
  ]) {
    const collapsed = state.collapsedGenerationControls.has(key);
    if (toggle) toggle.setAttribute('aria-expanded', String(!collapsed));
    if (body) body.hidden = collapsed;
  }
}

function renderRuntimeSettings() {
  if (!el.runtimeSettingsPanel) return;
  const aspects = ['1:1', '2:3', '3:2', '3:4', '4:3', '9:16', '16:9', '4:5', '21:9', '9:21', '3:1', '1:3', 'AUTO'];
  if (!el.runtimeAspects.childElementCount) {
    el.runtimeAspects.replaceChildren(...aspects.map(value => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.aspect = value;
      button.textContent = value;
      return button;
    }));
  }
  const details = [
    ['concise', '精简'],
    ['standard', '标准'],
    ['precise', '精细']
  ];
  if (!el.runtimeDetails.childElementCount) {
    el.runtimeDetails.replaceChildren(...details.map(([value, label]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.detail = value;
      button.textContent = label;
      return button;
    }));
  }
  el.runtimeAspects.querySelectorAll('[data-aspect]').forEach(button => {
    const active = button.dataset.aspect === state.quickSettings.aspectRatio;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  el.runtimeAspectLabel.textContent = state.quickSettings.aspectRatio;
  el.runtimeDetails.querySelectorAll('[data-detail]').forEach(button => {
    const active = button.dataset.detail === state.quickSettings.promptDetail;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  el.runtimeDetailLabel.textContent = details.find(([value]) => value === state.quickSettings.promptDetail)?.[1] || '标准';
  const xiezhenAssets = globalThis.FBaseXiezhenAssets;
  if (xiezhenAssets) {
    renderRuntimeChoicePicker('template', xiezhenAssets.OUTPUT_TEMPLATES, state.quickSettings.xiezhenTemplate);
    renderRuntimeChoicePicker('preset', xiezhenAssets.AESTHETIC_PRESETS, state.quickSettings.aestheticPreset);
  }
  // 生图模型快切：候选 ≥2 时显示，选择即时生效
  const imageOptions = imageModelOptions();
  if (el.runtimeImageModelBlock) {
    const showSelect = imageOptions.length >= 2;
    el.runtimeImageModelBlock.hidden = !showSelect;
    if (showSelect) {
      const selected = effectiveImageModel();
      const signature = imageOptions.join('|') + '>' + selected;
      if (el.runtimeImageModelOptions.dataset.signature !== signature) {
        el.runtimeImageModelOptions.dataset.signature = signature;
        el.runtimeImageModelOptions.replaceChildren(...imageOptions.map(value => {
          const option = document.createElement('button');
          option.type = 'button';
          option.dataset.imageModel = value;
          option.setAttribute('role', 'option');
          option.setAttribute('aria-selected', String(value === selected));
          option.classList.toggle('active', value === selected);
          const name = document.createElement('span');
          name.textContent = value;
          const meta = document.createElement('small');
          meta.textContent = value === state.settings.imageModel ? '默认' : (value === selected ? '当前' : '');
          option.append(name, meta);
          return option;
        }));
      }
      el.runtimeImageModelCurrent.textContent = selected;
      el.runtimeImageModelCurrent.title = selected;
      el.runtimeImageModelLabel.textContent = `${imageOptions.length} 个可选`;
    }
  }
  document.querySelectorAll('[data-runtime-toggle]').forEach(input => {
    const key = input.dataset.runtimeToggle;
    input.checked = !!state.quickSettings[key];
    input.closest('label')?.classList.toggle('active', input.checked);
  });
  const effectiveConcurrency = state.quickSettings.concurrency;
  if (el.runtimeConcurrencyValue) el.runtimeConcurrencyValue.textContent = String(effectiveConcurrency);
  if (el.runtimeConcurrencyLabel) el.runtimeConcurrencyLabel.textContent = `${effectiveConcurrency} 个同时`;
  document.querySelectorAll('[data-concurrency-delta]').forEach(button => { button.disabled = false; });
}

function runtimeChoiceConfig(kind) {
  if (kind === 'template') return {
    picker: el.runtimeXiezhenTemplatePicker,
    button: el.runtimeXiezhenTemplateButton,
    current: el.runtimeXiezhenTemplateCurrent,
    description: el.runtimeXiezhenTemplateDescription,
    options: el.runtimeXiezhenTemplateOptions,
    label: el.runtimeXiezhenTemplateLabel,
    settingKey: 'xiezhenTemplate',
    dataKey: 'xiezhenTemplate'
  };
  return {
    picker: el.runtimeAestheticPresetPicker,
    button: el.runtimeAestheticPresetButton,
    current: el.runtimeAestheticPresetCurrent,
    description: el.runtimeAestheticPresetDescription,
    options: el.runtimeAestheticPresetOptions,
    label: el.runtimeAestheticPresetLabel,
    settingKey: 'aestheticPreset',
    dataKey: 'aestheticPreset'
  };
}

function closeRuntimeChoicePicker(kind) {
  const config = runtimeChoiceConfig(kind);
  if (!config.options || !config.button) return;
  config.options.hidden = true;
  config.button.classList.remove('is-open');
  config.button.setAttribute('aria-expanded', 'false');
}

function toggleRuntimeChoicePicker(kind, event) {
  event?.stopPropagation();
  const config = runtimeChoiceConfig(kind);
  if (!config.options || !config.button) return;
  const willOpen = config.options.hidden;
  closeRuntimeChoicePicker(kind === 'template' ? 'preset' : 'template');
  config.options.hidden = !willOpen;
  config.button.classList.toggle('is-open', willOpen);
  config.button.setAttribute('aria-expanded', String(willOpen));
}

function selectRuntimeChoice(kind, event) {
  const config = runtimeChoiceConfig(kind);
  const option = event.target.closest(`[data-${config.dataKey.replace(/[A-Z]/g, value => `-${value.toLowerCase()}`)}]`);
  if (!option) return;
  closeRuntimeChoicePicker(kind);
  updateQuickSettings({ [config.settingKey]: option.dataset[config.dataKey] });
}

function renderRuntimeChoicePicker(kind, items, selectedId) {
  const config = runtimeChoiceConfig(kind);
  if (!config.options || !config.button) return;
  const selected = items.find(item => item.id === selectedId) || items[0];
  const signature = `${items.map(item => `${item.id}:${item.label}:${item.description}`).join('|')}>${selected?.id || ''}`;
  if (config.options.dataset.signature !== signature) {
    config.options.dataset.signature = signature;
    config.options.replaceChildren(...items.map(item => {
      const option = document.createElement('button');
      option.type = 'button';
      option.dataset[config.dataKey] = item.id;
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', String(item.id === selected?.id));
      option.classList.toggle('active', item.id === selected?.id);
      const copy = document.createElement('span');
      copy.className = 'runtime-choice-option-copy';
      const title = document.createElement('strong');
      title.textContent = item.label;
      const description = document.createElement('small');
      description.textContent = item.description;
      copy.append(title, description);
      const stateMark = document.createElement('i');
      stateMark.textContent = item.id === selected?.id ? '✓' : '';
      stateMark.setAttribute('aria-hidden', 'true');
      option.append(copy, stateMark);
      return option;
    }));
  }
  if (config.current) config.current.textContent = selected?.label || '';
  if (config.description) config.description.textContent = selected?.description || '';
  if (config.label) config.label.textContent = selected?.label || '';
}

async function updateQuickSettings(patch = {}) {
  // 先读 storage 最新值再合并写入（read-modify-write）：
  // 防止本实例内存里的旧 quickSettings 整体回写、把其它窗口刚改的开关（如 inspectButton）覆盖回去
  let latest = state.quickSettings;
  try {
    const stored = await chrome.storage.local.get('fbaseQuickSettings');
    if (stored.fbaseQuickSettings) latest = normalizeQuickSettings(stored.fbaseQuickSettings);
  } catch {}
  const next = { ...latest, ...patch };
  if (next.referencePalette) next.colorCardMode = true;
  state.quickSettings = normalizeQuickSettings(next);
  renderRuntimeSettings();
  if (state.result) renderResult(state.result);
  try { await chrome.storage.local.set({ fbaseQuickSettings: state.quickSettings }); } catch {}
}

// 运行设置已移入顶栏设置弹窗（details 分组），展开/收起由 <details> 原生接管，
// 不再需要手动 toggle。面板内容常驻 DOM，renderRuntimeSettings() 会持续刷新。

async function handleHostQuickAction(event) {
  if (event.source !== window.parent || event.data?.source !== 'FBASE_HOST' || event.data?.type !== 'FBASE_QUICK_ACTION') return;
  const { action, value } = event.data;
  if (action === 'pick') return startPicker();
  if (action === 'paste') return pasteImageFromClipboard();
  if (action === 'upload') return el.sourceFileInput.click();
  if (action === 'settings') return openSettings();
  if (action === 'quick-settings-changed') {
    const stored = await chrome.storage.local.get('fbaseQuickSettings');
    state.quickSettings = normalizeQuickSettings(stored.fbaseQuickSettings);
    renderRuntimeSettings();
    return;
  }
}

async function startPicker() {
  setStatus('请在网页中点击要分析的图片，按 Esc 可以取消', 'loading');
  try {
    const result = await runtimeSend({ type: 'START_PICKER' });
    if (!result?.ok) {
      setStatus(result?.error || '无法启动网页点选', 'error');
      return;
    }
    clearPickButtonStale();
  } catch (error) {
    const message = String(error?.message || '');
    const staleExtension = /Receiving end does not exist|Could not establish connection/i.test(message);
    if (staleExtension) {
      // UX 审计 #11：扩展重载后必须刷新目标网页才能注入取图脚本，
      // 把原因直接写在按钮上，而不是只靠一闪而过的状态条
      markPickButtonStale();
      setStatus('扩展刚更新，请先刷新当前网页，再点这里取图', 'error');
      return;
    }
    setStatus(message || '无法启动网页点选', 'error');
  }
}

// 网页点选因扩展重载而失效时，把按钮文案换成提示；成功后自动还原
function markPickButtonStale() {
  if (!el.pickButton) return;
  if (!el.pickButton.dataset.originalLabel) el.pickButton.dataset.originalLabel = el.pickButton.textContent;
  el.pickButton.dataset.stalePick = '1';
  el.pickButton.textContent = '请先刷新网页';
}

function clearPickButtonStale() {
  if (!el.pickButton || el.pickButton.dataset.stalePick !== '1') return;
  delete el.pickButton.dataset.stalePick;
  if (el.pickButton.dataset.originalLabel) el.pickButton.textContent = el.pickButton.dataset.originalLabel;
}

async function loadSourceFile(file) {
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    setStatus('请选择有效的图片文件', 'error');
    return;
  }
  const dataUrl = await optimizeImageData(await fileToDataUrl(file));
  const capture = {
    captureId: createCaptureEventId('upload'),
    dataUrl,
    pageTitle: file.name,
    pageUrl: '',
    srcUrl: '',
    alt: file.name,
    capturedAt: Date.now(),
    captureMethod: 'file-upload'
  };
  const task = {
    id: await captureTaskId(capture),
    name: file.name,
    status: 'waiting',
    createdAt: Date.now(),
    thumbnail: await createHistoryThumbnail(dataUrl),
    dataUrl,
    capture
  };
  state.taskQueue.push(task);
  await activateQueuedTask(task.id);
}

async function loadSourceFiles(fileList) {
  const files = [...(fileList || [])].filter(file => file?.type?.startsWith('image/'));
  el.sourceFileInput.value = '';
  if (!files.length) {
    setStatus('请选择有效的图片文件', 'error');
    return;
  }
  if (files.length === 1) return loadSourceFile(files[0]);
  setStatus(`正在读取 ${files.length} 张图片并加入任务队列`, 'loading');
  const added = [];
  for (const file of files) {
    const dataUrl = await optimizeImageData(await fileToDataUrl(file));
    const capture = {
      captureId: createCaptureEventId('upload'),
      dataUrl,
      pageTitle: file.name,
      pageUrl: '',
      srcUrl: '',
      alt: file.name,
      capturedAt: Date.now(),
      captureMethod: 'file-upload'
    };
    const task = {
      id: await captureTaskId(capture),
      name: file.name,
      status: 'waiting',
      createdAt: Date.now(),
      thumbnail: await createHistoryThumbnail(dataUrl),
      dataUrl,
      capture
    };
    state.taskQueue.push(task);
    added.push(task);
  }
  await activateQueuedTask(added[0].id);
  setStatus(`${files.length} 张图片已加入队列，当前打开第 1 张`, 'success');
}

async function activateQueuedTask(id) {
  const task = state.taskQueue.find(item => item.id === id);
  if (!task) return;
  state.activeTaskId = task.id;
  state.sourceDataUrl = task.sourceDataUrl || task.dataUrl;
  state.uploadedName = task.name;
  state.capture = task.capture;
  /* 切到带素材的任务时重新展开，避免沿用上一张任务完成后的收起状态 */
  if (task.capture) state.sourceCollapsed = false;
  el.promptInput.value = String(task.inputText || '');
  chrome.storage.local.set({ finnDraftPrompt: el.promptInput.value }).catch(() => {});
  state.result = task.result || null;
  state.pendingImport = task.pendingImport || null;
  state.localEvidence = task.localEvidence || null;
  state.generatedImage = task.generatedImage || null;
  if (state.result) {
    renderResult(state.result, { forceExpand: false });
    renderGeneratedResult();
  } else {
    el.resultCard.classList.add('hidden');
    renderGeneratedResult();
  }
  await persistCapture(state.capture);
  renderCapture();
  renderInputState();
  renderHistory();
  if (task.status === 'running') setStatus(`任务正在独立反推：${task.name}`, 'loading');
  else if (task.status === 'queued') setStatus(`任务已排队，等待并发空位：${task.name}`, 'loading');
  else if (task.status === 'error') setStatus(task.error || '任务失败，可以重新开始', 'error');
  else setStatus(`已打开独立任务：${task.name}`, 'success');
}

// 清空提示词输入框及其持久化草稿（含跨窗口同步），防止残留文本污染后续图片任务
function clearPromptInputDraft() {
  if (!el.promptInput.value) return;
  el.promptInput.value = '';
  chrome.storage.local.set({ finnDraftPrompt: '' }).catch(() => {});
}

async function persistCapture(capture) {
  const bytes = new TextEncoder().encode(JSON.stringify(capture || {})).byteLength;
  if (bytes > MAX_SESSION_CAPTURE_BYTES) {
    markSessionCaptureMutation('remove');
    await chrome.storage.session.remove('finnCapture').catch(() => {});
    console.warn('F·BASE skipped oversized session capture', { bytes });
    return false;
  }
  try {
    markSessionCaptureMutation('set', capture?.capturedAt);
    await chrome.storage.session.set({ finnCapture: capture });
    return true;
  } catch (error) {
    const quotaExceeded = /quota|bytes exceeded|QUOTA_BYTES/i.test(String(error?.message || error || ''));
    if (!quotaExceeded) throw error;
    markSessionCaptureMutation('remove');
    await chrome.storage.session.remove('finnCapture').catch(() => {});
    console.warn('F·BASE session capture quota exceeded', { bytes });
    return false;
  }
}

function markSessionCaptureMutation(type, capturedAt = 0) {
  pendingSessionCaptureMutation = { type, capturedAt: Number(capturedAt) || 0 };
  clearTimeout(pendingSessionCaptureTimer);
  pendingSessionCaptureTimer = setTimeout(() => {
    pendingSessionCaptureMutation = null;
    pendingSessionCaptureTimer = null;
  }, 1_000);
}

function consumeSessionCaptureMutation(nextCapture) {
  const mutation = pendingSessionCaptureMutation;
  if (!mutation) return false;
  const matches = mutation.type === 'remove'
    ? !nextCapture
    : Number(nextCapture?.capturedAt || 0) === mutation.capturedAt;
  if (!matches) return false;
  pendingSessionCaptureMutation = null;
  clearTimeout(pendingSessionCaptureTimer);
  pendingSessionCaptureTimer = null;
  return true;
}

async function handleImagePaste(event) {
  const item = [...(event.clipboardData?.items || [])].find(entry => entry.type.startsWith('image/'));
  if (!item) return;
  const file = item.getAsFile();
  if (!file) return;
  event.preventDefault();
  await loadSourceFile(new File([file], `粘贴图片-${Date.now()}.png`, { type: file.type || 'image/png' }));
}

async function pasteImageFromClipboard() {
  setStatus('正在读取剪贴板图片…', 'loading');
  try {
    if (!navigator.clipboard?.read) throw new Error('当前浏览器不支持按钮读取剪贴板');
    const items = await navigator.clipboard.read();
    for (const item of items) {
      const imageType = item.types.find(type => type.startsWith('image/'));
      if (!imageType) continue;
      const blob = await item.getType(imageType);
      const extension = imageType.split('/')[1]?.replace('jpeg', 'jpg') || 'png';
      await loadSourceFile(new File([blob], `粘贴图片-${Date.now()}.${extension}`, { type: imageType }));
      return;
    }
    setStatus('剪贴板中没有图片，请先复制一张图片', 'error');
  } catch (error) {
    const denied = /denied|permission|notallowed/i.test(String(error?.name || '') + ' ' + String(error?.message || ''));
    // 读取失败（无用户手势 / 权限拒绝）时，走安全的粘贴兜底：
    //   1) 创建聚焦的隐藏 contenteditable，保证 document.execCommand('paste') 能落盘
    //   2) 尝试 execCommand 自动粘贴（chrome-extension:// + clipboardRead 权限下通常可行）
    //   3) 失败则提示用户 3 秒内按 Ctrl+V，document 上已有的 paste 监听器会接住图片
    if (denied || !navigator.clipboard?.read || /not support/i.test(String(error?.message || ''))) {
      const shell = document.createElement('div');
      shell.contentEditable = 'true';
      Object.assign(shell.style, {
        position: 'fixed', inset: '-9999px auto auto -9999px', width: '1px', height: '1px',
        opacity: '0', pointerEvents: 'none'
      });
      document.body.appendChild(shell);
      shell.focus();
      let triggered = false;
      let removed = false;
      const cleanup = () => {
        if (removed) return;
        removed = true;
        shell.remove();
      };
      const successGuard = () => {
        triggered = true;
        setTimeout(cleanup, 400);
      };
      // 只要随后 3s 内任意一次 paste 事件成功取到图片，就认定兜底生效
      const onPasteSettled = (event) => {
        const hasImage = [...(event.clipboardData?.items || [])].some(entry => entry.type.startsWith('image/'));
        if (hasImage) successGuard();
      };
      document.addEventListener('paste', onPasteSettled, true);
      setTimeout(() => {
        document.removeEventListener('paste', onPasteSettled, true);
        cleanup();
        if (!triggered) setStatus('剪贴板未检测到图片，可先复制图片再按 Ctrl+V 粘贴', 'error');
      }, 3000);
      try {
        const ok = document.execCommand('paste');
        if (ok) {
          // 等一轮微任务，让 handleImagePaste 先执行完（它异步 loadSourceFile 已 setStatus success）
          await Promise.resolve();
          await new Promise(r => setTimeout(r, 120));
          if (triggered) return;
        }
      } catch (_) { /* execCommand 在有些上下文会抛错，直接交给手动兜底 */ }
      // execCommand 未命中，交给手动 Ctrl+V
      setStatus('请在 3 秒内按 Ctrl+V 粘贴图片（按钮读取剪贴板被浏览器限制）', 'loading');
      return;
    }
    setStatus(error.message || '读取剪贴板图片失败', 'error');
  }
}

async function clearImage() {
  if (state.activeTaskId) state.taskQueue = state.taskQueue.filter(item => item.id !== state.activeTaskId);
  const nextTask = state.taskQueue[0];
  if (nextTask) {
    state.activeTaskId = '';
    await activateQueuedTask(nextTask.id);
    setStatus('当前图片已移除，已切换到下一张图片', 'success');
    return;
  }
  state.activeTaskId = '';
  state.capture = null;
  state.sourceDataUrl = '';
  state.uploadedName = '';
  state.localEvidence = null;
  el.sourceFileInput.value = '';
  invalidateAnalysis();
  // 标记自我消费：清图后 remove 变更事件晚到时，避免把刚激活的下一张任务清空
  markSessionCaptureMutation('remove');
  await chrome.storage.session.remove('finnCapture');
  renderCapture();
  renderInputState();
  renderHistory();
  setStatus(el.promptInput.value.trim() ? '图片已清除，将只拆解提示词' : '图片已清除', 'success');
}

function renderCapture() {
  const capture = state.capture;
  const sourceHead = el.sourceModule?.querySelector('[data-module-toggle]');
  /* 收起状态与"有没有素材"解耦：无素材只是空态（仍展开以露出引导），
     收起只由「任务反推完成」或用户手动点击触发，用于腾出空间看画面 */
  const collapsed = Boolean(state.sourceCollapsed);
  el.sourceModule?.classList.toggle('is-collapsed', collapsed);
  el.sourceModule?.classList.toggle('is-empty', !capture);
  sourceHead?.setAttribute('aria-expanded', String(!collapsed));
  el.previewWrap?.classList.toggle('is-upload-target', !capture);
  if (capture) {
    el.previewWrap?.removeAttribute('role');
    el.previewWrap?.removeAttribute('tabindex');
    el.previewWrap?.removeAttribute('aria-label');
  } else {
    el.previewWrap?.setAttribute('role', 'button');
    el.previewWrap?.setAttribute('tabindex', '0');
    el.previewWrap?.setAttribute('aria-label', '选择要反推的参考图片');
  }
  if (!capture) {
    el.sourcePreview.removeAttribute('src');
    el.sourcePreview.classList.remove('visible');
    el.emptyPreview.classList.remove('hidden');
    el.previewWrap.classList.remove('has-image');
    el.sourceMeta.textContent = '';
    el.clearImageButton.disabled = true;
    return;
  }
  const preview = state.sourceDataUrl || capture.dataUrl || capture.srcUrl;
  if (preview) {
    el.sourcePreview.src = preview;
    el.sourcePreview.classList.add('visible');
    el.emptyPreview.classList.add('hidden');
    el.previewWrap.classList.add('has-image');
  }
  el.sourceMeta.textContent = state.uploadedName || capture.pageTitle || capture.alt || shortHost(capture.pageUrl) || '参考图';
  el.clearImageButton.disabled = taskIsInFlight(activeQueueTask());
}

function renderInputState() {
  const hasImage = Boolean(state.capture);
  const hasText = Boolean(el.promptInput.value.trim());
  const activeTask = activeQueueTask();
  const activeTaskBusy = taskIsInFlight(activeTask);
  const label = hasImage && hasText ? '图片 + 提示词' : (hasImage ? '图片已就绪' : (hasText ? '提示词已就绪' : '等待素材'));
  el.sourceState.textContent = label;
  el.sourceState.classList.toggle('ready', hasImage || hasText);
  const blocked = activeTask ? activeTaskBusy : state.running;
  const canRun = hasImage || hasText;
  const canRetry = activeTask?.status === 'error' && canRun;
  el.taskWorkspace?.classList.toggle('has-input', canRun);
  el.analyzeImportButton.disabled = blocked || (!hasImage && !hasText);
  if (el.generateAfterReverseToggle) el.generateAfterReverseToggle.disabled = blocked || (!hasImage && !hasText);
  el.retryButton.disabled = blocked || !canRetry;
  el.retryButton.classList.toggle('hidden', !canRetry);
  el.analyzeImportLabel.textContent = activeTask?.status === 'queued'
    ? '等待并发空位'
    : (activeTask?.status === 'running' ? '正在视觉反推' : (canRun ? '开始反推' : '选择图片后开始反推'));
  const batchable = state.taskQueue.some(item => item.status === 'waiting' || item.status === 'error');
  el.runQueueButton.disabled = !batchable;
  el.runQueueButton.textContent = '批量运行';
  renderQueueStats();
}

async function ensureImageData(task) {
  const srcUrl = task ? task.sourceDataUrl : state.sourceDataUrl;
  if (srcUrl) return optimizeImageData(srcUrl);
  const capture = task ? task.capture : state.capture;
  if (!capture) return '';
  if (capture.dataUrl?.startsWith('data:image/')) {
    if (task) task.sourceDataUrl = capture.dataUrl; else state.sourceDataUrl = capture.dataUrl;
    return optimizeImageData(capture.dataUrl);
  }
  if (capture.srcUrl) {
    const fetched = await runtimeSend({ type: 'IMAGE_FETCH', url: capture.srcUrl });
    if (fetched?.ok && fetched.dataUrl) {
      if (task) task.sourceDataUrl = fetched.dataUrl; else state.sourceDataUrl = fetched.dataUrl;
      return optimizeImageData(fetched.dataUrl);
    }
  }
  if (!capture.rect) throw new Error('图片源读取失败，请重新点选或上传图片');
  const shot = await runtimeSend({ type: 'CAPTURE_VISIBLE' });
  if (!shot?.ok || !shot.dataUrl) throw new Error(shot?.error || '页面截图失败');
  const cropped = await cropScreenshot(shot.dataUrl, capture);
  if (task) task.sourceDataUrl = cropped; else state.sourceDataUrl = cropped;
  return optimizeImageData(cropped);
}

async function cropScreenshot(dataUrl, capture) {
  const image = await loadImage(dataUrl);
  const viewportWidth = capture.viewportWidth || image.naturalWidth;
  const viewportHeight = capture.viewportHeight || image.naturalHeight;
  const scaleX = image.naturalWidth / viewportWidth;
  const scaleY = image.naturalHeight / viewportHeight;
  const rect = capture.rect;
  const sourceX = Math.max(0, rect.left * scaleX);
  const sourceY = Math.max(0, rect.top * scaleY);
  const sourceWidth = Math.min(image.naturalWidth - sourceX, Math.max(1, rect.width * scaleX));
  const sourceHeight = Math.min(image.naturalHeight - sourceY, Math.max(1, rect.height * scaleY));
  if (sourceWidth < 2 || sourceHeight < 2) throw new Error('选中的图片区域当前不可见，请滚动到图片位置后重试');
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(sourceWidth);
  canvas.height = Math.round(sourceHeight);
  canvas.getContext('2d').drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}

async function optimizeImageData(dataUrl) {
  if (!dataUrl || dataUrl.length < 7_500_000) {
    const image = await loadImage(dataUrl);
    if (Math.max(image.naturalWidth, image.naturalHeight) <= 2048) return dataUrl;
    return resizeImage(image);
  }
  return resizeImage(await loadImage(dataUrl));
}

function resizeImage(image) {
  const scale = Math.min(1, 2048 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.88);
}

async function prepareVisionPayload(dataUrl) {
  if (!dataUrl) return '';
  const image = await loadImage(dataUrl);
  const maxSide = Math.max(image.naturalWidth, image.naturalHeight);
  const supportedNative = /^data:image\/(?:jpe?g|png|webp)/i.test(dataUrl);
  const shouldReencode = maxSide > 1600 || dataUrl.length > 2_800_000 || !supportedNative;
  if (!shouldReencode) return dataUrl;
  const scale = Math.min(1, 1600 / Math.max(1, maxSide));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.86);
}

// ===== 反推管线核心：只做"取素材→LLM→拆解→入库"的数据工作，不碰共享展示态 =====
// 单张按钮（task=null）与并发队列任务（task 传入）共用此管线，保证素材/结果按 task 隔离、不串图。
async function runReversePipeline({ imageDataUrl, inputText, task }) {
  const settings = task?.settingsSnapshot || state.settings;
  const quickSettings = globalThis.FBaseXiezhenAssets.resolveIntent(inputText, task?.quickSettingsSnapshot || state.quickSettings);
  const [localEvidence, visionDataUrl] = imageDataUrl
    ? await Promise.all([
      extractLocalImageEvidence(imageDataUrl, quickSettings.colorCardMode || quickSettings.referencePalette),
      prepareVisionPayload(imageDataUrl)
    ])
    : [null, ''];
  const source = currentSource(inputText, task);
  setTaskPhase(task, 'analyzing');
  const response = await requestVisionCompletion({
    model: settings.model,
    messages: buildReverseMessages(inputText, visionDataUrl, localEvidence, quickSettings),
    temperature: 0.2,
    max_tokens: quickSettings.promptDetail === 'precise' ? 12000 : (quickSettings.promptDetail === 'concise' ? 4500 : 7000),
    stream: false
  }, settings, 185000);
  if (response?.aborted) throw makeFbaseAbortError();
  if (!response?.ok) throw makeRequestError(response, Boolean(imageDataUrl));
  let parsed = await parseReverseOutputWithRepair(extractLlmText(response.data), settings);
  if (shouldRunMethodologyReview(visionDataUrl, quickSettings, task?.twoPhase)) {
    try {
      setTaskPhase(task, 'reviewing');
      parsed = await reviewReverseResult(parsed, visionDataUrl, localEvidence, inputText, { settings, quickSettings });
    } catch (reviewError) {
      if (isFbaseAbort(reviewError)) throw reviewError;
      console.warn('F·BASE 第二阶段视觉审校失败，保留第一阶段结果', reviewError);
    }
  }
  parsed = globalThis.FBaseReverseMethodology.finalizeResult(parsed, {
    aspectRatio: resolvedReverseAspect(localEvidence, quickSettings),
    portraitFidelity: quickSettings.portraitFidelity === true
  });
  if (generatedPromptContainsEnglish(parsed.prompt) || generatedPromptContainsEnglish(parsed.variantPrompt)) {
    // 中文化重写是"锦上添花"：失败（网络/JSON 解析/超时）保留原版提示词，不报废整个反推
    try {
      setTaskPhase(task, 'rewriting');
      parsed = await rewritePromptsInChinese(parsed, settings);
    } catch (rewriteError) {
      if (isFbaseAbort(rewriteError)) throw rewriteError;
      console.warn('F·BASE 中文重写失败，保留原始提示词', rewriteError);
    }
  }
  parsed = globalThis.FBaseFaceDescriptionLibrary.apply(parsed);
  parsed = globalThis.FBaseXiezhenAssets.applyEvidenceMakeup(parsed);
  parsed = globalThis.FBaseReverseMethodology.finalizeResult(parsed, {
    aspectRatio: resolvedReverseAspect(localEvidence, quickSettings),
    portraitFidelity: quickSettings.portraitFidelity === true
  });
  let xiezhenOutput = null;
  let creationError = "";
  if (shouldCreateXiezhenPrompt(quickSettings)) {
    try {
      setTaskPhase(task, 'adapting');
      xiezhenOutput = await createXiezhenPrompt(parsed, quickSettings, settings, inputText);
    } catch (xiezhenError) {
      if (isFbaseAbort(xiezhenError)) throw xiezhenError;
      console.warn('F·BASE 创作稿生成失败，保留反推结果', xiezhenError);
      creationError = '创作稿未完成，可在调整一下中重试：' + (xiezhenError.message || '请求失败');
    }
  }
  const analysis = buildFinnAnalysis(parsed, localEvidence, quickSettings, xiezhenOutput);
  if (creationError) analysis.creationError = creationError;
  // 覆盖重推任务：import 时带上旧档案定位，服务端原地覆盖（档案 id / 词条库保持稳定）
  const overwriteAnalysisId = task?.overwriteAnalysisId || '';
  const pendingImport = {
    analysisId: analysis.analysisId,
    analysis,
    model: settings.model,
    inputText,
    imageDataUrl,
    source,
    quickSettings: { ...quickSettings },
    ...(overwriteAnalysisId ? { overwrite: true, overwriteAnalysisId } : {})
  };
  setTaskPhase(task, 'importing');
  const importResponse = await runtimeSend({
    type: 'KBASE_FETCH',
    url: `${normalizeLibraryEndpoint(settings.libraryEndpoint)}/api/finn/import`,
    method: 'POST',
    timeout: 45000,
    body: pendingImport
  });
  if (importResponse?.aborted) throw makeFbaseAbortError();
  if (!importResponse?.ok) throw makeRequestError(importResponse, Boolean(imageDataUrl));
  pendingImport.imported = true;
  const importedData = importResponse.data && typeof importResponse.data === 'object' ? importResponse.data : {};
  const completed = {
    ...analysis,
    ...importedData,
    reversePrompt: String(importedData.generationPrompt || importedData.reversePrompt || analysis.generationPrompt || analysis.reversePrompt || parsed.prompt || '').trim(),
    generationPrompt: String(importedData.generationPrompt || analysis.generationPrompt || analysis.reversePrompt || '').trim(),
    reversePromptFull: String(importedData.reversePromptFull || analysis.reversePromptFull || parsed.prompt || '').trim(),
    visualReconstructionSpec: String(importedData.visualReconstructionSpec || analysis.visualReconstructionSpec || analysis.reversePromptFull || parsed.prompt || '').trim(),
    variantPrompt: String(importedData.variantPrompt || analysis.variantPrompt || parsed.variantPrompt || '').trim(),
    xiezhenPrompt: String(analysis.xiezhenPrompt || '').trim(),
    xiezhenMeta: analysis.xiezhenMeta || null,
    creationError: analysis.creationError || "",
    sourceImage: imageDataUrl
      || task?.sourceDataUrl
      || task?.capture?.dataUrl
      || task?.capture?.srcUrl
      || source?.srcUrl
      || '',
    analyzed: analysis.analyzed,
    autoImported: true
  };
  await saveHistory(completed, imageDataUrl, task);
  return { completed, pendingImport, imageDataUrl, localEvidence };
}

function requestTaskRun(task, generateAfterReverse = false) {
  if (!task || taskIsInFlight(task)) return false;
  if (!task.capture) {
    TASK_QUEUE_RUNTIME.transition(task, 'error', {
      tombstones: completedTaskTombstones,
      error: '该任务没有可用的图片素材'
    });
    renderHistory();
    return false;
  }
  if (!hasCompleteSettings()) {
    setStatus('请先配置 API 地址、Key 和视觉模型', 'error');
    openSettings();
    return false;
  }
  if (generateAfterReverse && !hasCompleteImageSettings()) {
    setStatus('请先在配置中填写生图 API 地址、Key 和模型 ID', 'error');
    openSettings();
    return false;
  }
  task.inputText = task.id === state.activeTaskId ? el.promptInput.value.trim() : String(task.inputText || '').trim();
  task.settingsSnapshot = { ...state.settings, imageModels: [...(state.settings.imageModels || [])] };
  task.quickSettingsSnapshot = { ...state.quickSettings };
  if (task.result?.analysisId === state.result?.analysisId) {
    task.generationStyleControls = resultGenerationStyleIds(state.result);
    task.generationImageControls = resultGenerationImageIds(state.result);
  }
  task.twoPhase = activeSharedProfile()?.twoPhase !== false;
  task.generateAfterReverse = Boolean(generateAfterReverse);
  if (!TASK_QUEUE_RUNTIME.transition(task, 'queued', {
    tombstones: completedTaskTombstones,
    runnerId: workspaceInstanceId,
    phase: 'queued',
    error: ''
  })) return false;
  if (task.id === state.activeTaskId) {
    state.result = null;
    state.pendingImport = null;
    state.localEvidence = null;
    state.generatedImage = null;
    el.resultCard.classList.add('hidden');
    renderGeneratedResult();
  }
  renderHistory();
  renderInputState();
  setStatus(runningTaskIds.size < concurrencyLimit()
    ? `独立任务已启动：${task.name}`
    : `独立任务已排队，出现并发空位后自动启动：${task.name}`, 'loading');
  scheduleConcurrentLaunch();
  return true;
}

// 纯提示词入口继续使用全局展示态；所有图片入口统一交给独立任务调度器。
async function reverseAnalyze(options = {}) {
  const activeTask = activeQueueTask();
  if (activeTask?.capture && !options.forceStandalone) return requestTaskRun(activeTask, false);
  if (state.running) return;
  // 队列自动连跑时强制忽略输入框文本：那是旧任务/旧图的残留，会作为
  // "用户补充要求"污染本图的拆解与档案的「原始提示词或说明」字段
  const inputText = options.fromQueue ? '' : el.promptInput.value.trim();
  if (!state.capture && !inputText) return;
  if (!hasCompleteSettings()) {
    setStatus('请先配置 API 地址、Key 和视觉模型', 'error');
    openSettings();
    return;
  }
  if (!assertLibraryOnline()) return;
  const requestRevision = state.revision;
  state.running = true;
  updateActiveTaskStatus('running');
  state.result = null;
  state.pendingImport = null;
  state.generatedImage = null;
  renderGeneratedResult();
  el.resultCard.classList.add('hidden');
  el.analyzeImportLabel.textContent = '正在视觉反推';
  renderInputState();
  startProgress();
  let succeeded = false;
  let aborted = false;
  try {
    const imageDataUrl = state.capture ? await ensureImageData(null) : '';
    state.localEvidence = imageDataUrl ? await extractLocalImageEvidence(imageDataUrl, state.quickSettings.colorCardMode || state.quickSettings.referencePalette) : null;
    const { completed } = await runReversePipeline({ imageDataUrl, inputText, task: null });
    state.result = completed;
    state.pendingImport = null;
    state.favoritedTerms = new Set();
    state.favoritedPrompts = new Set();
    state.paletteFavorited = false;
    renderResult(completed, { forceExpand: false });
    renderImportSuccess(completed);
    /* 反推完成：素材区收起，腾出空间展示更多画面 */
    state.sourceCollapsed = true;
    markSessionCaptureMutation('remove');
    await chrome.storage.session.remove('finnCapture');
    const duplicateNote = completed.duplicates ? `，跳过重复 ${completed.duplicates} 个` : '';
    const updatedNote = completed.termsUpdated ? `，补全旧词条 ${completed.termsUpdated} 个` : '';
    let generationNote = '';
    if (state.generateAfterReverse) {
      setStatus('反推结果已写入词库，正在生成图像', 'loading');
      try {
        await generateImageFromPrompt(completed.reversePrompt);
        generationNote = '，生成结果已就绪';
        revealCurrentResultTwoStage();
      } catch (generationError) {
        if (isFbaseAbort(generationError)) throw generationError;
        generationNote = `，生图失败：${generationError.message || '请检查生图配置'}`;
      }
    }
    setStatus(`反推完成，已自动写入 ${completed.imported || 0} 个新词条${updatedNote}${duplicateNote}，原图和深度拆解已保存${generationNote}`, generationNote.includes('失败') ? 'error' : 'success');
    completeTask(null);
    await checkLibrary(false);
    expandAllResultModules();
    succeeded = true;
  } catch (error) {
    if (isFbaseAbort(error)) {
      aborted = true;
      batchRun.active = false; // 用户主动停止，批次统计不再继续
      updateActiveTaskStatus('waiting', '');
      setStatus('已停止，当前任务已中止，可重新运行队列', 'success');
    } else {
      updateActiveTaskStatus('error', error.message || '任务失败');
      const prefix = state.pendingImport ? '反推已经完成，自动入库失败：' : '';
      setStatus(prefix + (error.message || '视觉反推失败，请检查模型配置后重试'), 'error');
    }
  } finally {
    stopProgress();
    state.running = false;
    state.generateAfterReverse = false;
    el.analyzeImportLabel.textContent = '开始反推';
    renderInputState();
  }
  return aborted ? undefined : succeeded;
}

// 并发队列任务单跑：素材、设置、阶段和结果全程挂在各自 task 上。
// 当前查看哪张任务卡，主展示区就只跟随哪张卡，其他任务继续在后台独立运行。
async function runReverseTask(task) {
  if (!task || task.status === 'running') return;
  if (!task.capture || !hasCompleteSettings(task.settingsSnapshot || state.settings)) {
    const message = task.capture ? '请先配置 API 地址、Key 和视觉模型' : '该任务没有可用的图片素材';
    TASK_QUEUE_RUNTIME.transition(task, 'error', {
      tombstones: completedTaskTombstones,
      error: message
    });
    updateActiveTaskStatus('error', task.error, task);
    noteBatchTaskDone(task, false);
    return false;
  }
  // 后端离线时队列任务同样前置拦截，避免批量跑到一半全部失败
  if (!assertLibraryOnline()) {
    TASK_QUEUE_RUNTIME.transition(task, 'waiting', { tombstones: completedTaskTombstones, error: '' });
    return false;
  }
  if (!TASK_QUEUE_RUNTIME.transition(task, 'running', {
    tombstones: completedTaskTombstones,
    runnerId: workspaceInstanceId,
    error: ''
  })) return false;
  setTaskPhase(task, 'reading');
  const generateAfterReverse = Boolean(task.generateAfterReverse);
  updateActiveTaskStatus('running', '', task);
  renderInputState();
  let succeeded = false;
  try {
    const imageDataUrl = task.capture ? await ensureImageData(task) : '';
    const { completed, localEvidence } = await runReversePipeline({ imageDataUrl, inputText: String(task.inputText || ''), task });
    task.localEvidence = localEvidence;
    const taskResult = {
      ...completed,
      sourceTaskId: task.id,
      sourceImage: imageDataUrl || completed.sourceImage || '',
      generationStyleControls: resultGenerationStyleIds({ generationStyleControls: task.generationStyleControls }),
      generationImageControls: resultGenerationImageIds({ generationImageControls: task.generationImageControls })
    };
    task.result = taskResult;
    task.pendingImport = null;
    const duplicateNote = completed.duplicates ? `，跳过重复 ${completed.duplicates} 个` : '';
    const updatedNote = completed.termsUpdated ? `，补全旧词条 ${completed.termsUpdated} 个` : '';
    let generationNote = '';
    let taskGeneratedImage = null;
    let isViewedTask = state.activeTaskId === task.id;

    // 反推和入库一完成就先交付结果。生图请求单独等待，不能把已经完成的反推内容压住。
    if (isViewedTask) {
      state.result = taskResult;
      state.pendingImport = null;
      state.localEvidence = task.localEvidence;
      state.generatedImage = null;
      renderResult(taskResult, { forceExpand: false });
      renderImportSuccess(taskResult);
      renderGeneratedResult();
      expandAllResultModules();
      setStatus(generateAfterReverse
        ? `反推完成，已自动写入 ${completed.imported || 0} 个新词条${updatedNote}${duplicateNote}，正在生成图像`
        : `反推完成，已自动写入 ${completed.imported || 0} 个新词条${updatedNote}${duplicateNote}，原图和深度拆解已保存`,
      generateAfterReverse ? 'loading' : 'success');
    }

    if (generateAfterReverse) {
      setTaskPhase(task, 'generating');
      try {
        taskGeneratedImage = await generateImageFromPrompt(completed.reversePrompt, {
          task,
          result: taskResult,
          localEvidence: task.localEvidence,
          sourceImage: imageDataUrl,
          display: false
        });
        generationNote = '，生成结果已就绪';
      } catch (generationError) {
        if (isFbaseAbort(generationError)) throw generationError;
        generationNote = `，生图失败：${generationError.message || '请检查生图配置'}`;
      }
    }
    task.generatedImage = taskGeneratedImage;
    // 生图等待期间用户可能切换了任务，只更新仍在查看的任务卡。
    isViewedTask = state.activeTaskId === task.id;
    if (isViewedTask) {
      state.result = taskResult;
      state.pendingImport = null;
      state.localEvidence = task.localEvidence;
      state.generatedImage = taskGeneratedImage;
      renderResult(taskResult, { forceExpand: false });
      renderImportSuccess(taskResult);
      renderGeneratedResult();
      setStatus(`反推完成，已自动写入 ${completed.imported || 0} 个新词条${updatedNote}${duplicateNote}，原图和深度拆解已保存${generationNote}`, generationNote.includes('失败') ? 'error' : 'success');
      if (taskGeneratedImage) revealCurrentResultTwoStage();
    }
    await completeTask(task);
    await checkLibrary(false);
    if (isViewedTask) expandAllResultModules();
    succeeded = true;
  } catch (error) {
    if (isFbaseAbort(error)) {
      updateActiveTaskStatus('waiting', '', task);
      batchRun.active = false; // 用户主动停止，批次统计不再继续
    } else {
      updateActiveTaskStatus('error', error.message || '任务失败', task);
      noteBatchTaskDone(task, false);
      if (state.activeTaskId === task.id) setStatus(error.message || '视觉反推失败，请检查模型配置后重试', 'error');
    }
  } finally {
    renderInputState();
  }
  return succeeded;
}

function updateActiveTaskStatus(status, error = '', task) {
  const target = task || (state.activeTaskId ? state.taskQueue.find(item => item.id === state.activeTaskId) : null);
  if (!target) return;
  if (TASK_QUEUE_RUNTIME.transition(target, status, {
    tombstones: completedTaskTombstones,
    error,
    ...(status === 'queued' || status === 'running' ? { runnerId: target.runnerId || workspaceInstanceId } : {})
  })) renderHistory();
}

async function completeTask(task) {
  const target = task || (state.activeTaskId ? state.taskQueue.find(item => item.id === state.activeTaskId) : null);
  if (!target) return;
  // 每张卡只从自己的素材字段取原图，禁止借用当前界面的另一张图片。
  const original = task
    ? (target.sourceDataUrl || target.dataUrl || target.capture?.dataUrl || target.capture?.srcUrl || '')
    : (state.sourceDataUrl || state.capture?.dataUrl || state.capture?.srcUrl || target.capture?.dataUrl || target.capture?.srcUrl || '');
  if (original) {
    if (target.generatedImage && !target.generatedImage.original) target.generatedImage.original = original;
    if (target.result && !target.result.sourceImage) target.result.sourceImage = original;
    if (state.activeTaskId === target.id) {
      if (state.generatedImage && !state.generatedImage.original) state.generatedImage.original = original;
      if (state.result && !state.result.sourceImage) state.result.sourceImage = original;
    }
  }
  const completedAt = Date.now();
  if (!TASK_QUEUE_RUNTIME.transition(target, 'completed', {
    tombstones: completedTaskTombstones,
    now: completedAt
  })) return;
  noteBatchTaskDone(target, true);
  completedTaskTombstones.set(target.id, completedAt);
  pruneCompletedTaskTombstones();
  try {
    await writeWorkspaceEntry(`completed:${target.id}`, {
      taskId: target.id,
      createdAt: Number(target.createdAt) || 0,
      completedAt
    });
  } catch (error) {
    console.warn('F·BASE completion journal write failed', error);
  }
  state.taskQueue = state.taskQueue.filter(item => item.id !== target.id);
  if (state.activeTaskId === target.id) {
    state.activeTaskId = '';
    // 任务完成：清素材展示。不再依赖 storage remove 事件清空——该事件异步到达会竞态清掉下一个任务
    state.capture = null;
    state.sourceDataUrl = '';
    state.uploadedName = '';
    state.localEvidence = null;
    /* 反推完成：素材区收起，腾出空间展示更多画面 */
    state.sourceCollapsed = true;
  }
  renderCapture();
  renderInputState();
  renderHistory();
}

async function runTaskQueue(options = {}) {
  if (!hasCompleteSettings()) {
    setStatus('请先配置 API 地址、Key 和视觉模型', 'error');
    openSettings();
    return;
  }
  // UX 审计 #7：批量运行会消耗 API 额度且耗时，多任务时先确认，避免误触
  const willRun = state.taskQueue.filter(item => item.status === 'waiting' || item.status === 'error');
  if (willRun.length > 1 && !confirm(`确认运行队列中的 ${willRun.length} 个任务？\n\n这会消耗 API 额度，并需要一些时间。`)) return;
  // 只有用户明确点击“批量运行”时，才把未开始的卡标记为已请求运行。
  let retried = 0;
  state.taskQueue.forEach(item => {
    if (item.status === 'error') retried += 1;
    if (item.status === 'waiting' || item.status === 'error') {
      item.inputText = String(item.inputText || '').trim();
      item.settingsSnapshot = { ...state.settings, imageModels: [...(state.settings.imageModels || [])] };
      item.quickSettingsSnapshot = { ...state.quickSettings };
      item.twoPhase = activeSharedProfile()?.twoPhase !== false;
      item.generateAfterReverse = false;
      TASK_QUEUE_RUNTIME.transition(item, 'queued', {
        tombstones: completedTaskTombstones,
        runnerId: workspaceInstanceId,
        phase: 'queued',
        error: ''
      });
    }
  });
  const pending = state.taskQueue.filter(item => item.status === 'queued').length;
  if (!pending) {
    setStatus(state.taskQueue.length ? '队列中没有待处理任务' : '队列为空', 'success');
    return;
  }
  renderInputState();
  const cap = concurrencyLimit();
  // 批次跟踪（UX 审计 P2-1）：总进度 + 结束后的成败汇总
  batchRun.active = true;
  batchRun.total = pending;
  batchRun.done = 0;
  batchRun.failed = [];
  setStatus(retried ? `重试 ${retried} 个失败任务，开始并发反推 ${pending} 张（并发 ${cap}），进度 0/${pending}` : `开始并发反推 ${pending} 张（并发 ${cap}），进度 0/${pending}`, 'loading');
  scheduleConcurrentLaunch();
}

// 批次进度汇总：每个任务终态（成功/失败）都调用一次
const batchRun = { active: false, total: 0, done: 0, failed: [] };
function noteBatchTaskDone(task, ok) {
  if (!batchRun.active) return;
  batchRun.done += 1;
  if (!ok) batchRun.failed.push(task?.name || task?.id || '未命名任务');
  if (batchRun.done < batchRun.total) {
    setStatus(`批量运行中：${batchRun.done}/${batchRun.total} 已完成，失败 ${batchRun.failed.length} 个`, 'loading');
    return;
  }
  batchRun.active = false;
  const failedNote = batchRun.failed.length ? `，失败 ${batchRun.failed.length} 个（${batchRun.failed.slice(0, 3).join('、')}${batchRun.failed.length > 3 ? ' 等' : ''}），可在队列中逐个重试` : '';
  setStatus(`批量运行结束：成功 ${batchRun.total - batchRun.failed.length} 个${failedNote}`, batchRun.failed.length ? 'error' : 'success');
}

// 主入口：做完当前一个，队列里还有就继续做下一个（真实排队）
async function analyzeAndContinue() {
  const task = activeQueueTask();
  if (task?.capture) return requestTaskRun(task, false);
  await reverseAnalyze({ forceStandalone: true });
}

async function reverseAndGenerate() {
  const task = activeQueueTask();
  if (task?.capture) return requestTaskRun(task, true);
  if (!hasCompleteImageSettings()) {
    setStatus('请先在配置中填写生图 API 地址、Key 和模型 ID', 'error');
    openSettings();
    return;
  }
  state.generateAfterReverse = true;
  try {
    await reverseAnalyze({ forceStandalone: true });
  } finally {
    // 兜底复位：reverseAnalyze 因缺配置/无素材等提前 return 时不会走到自身 finally，
    // 若不清除该残留标志，后续普通反推会在成功后额外触发一次生图
    state.generateAfterReverse = false;
  }
}

// 纯反推完成后，用当前反推提示词直接生图（不必重新跑「反推并生成」）
async function generateFromReverseResult() {
  return generateFromResultPrompt('reverse');
}

async function generateFromXiezhenResult() {
  return generateFromResultPrompt('xiezhen');
}

async function generateFromResultPrompt(kind = 'reverse', buttonOverride = null) {
  const isXiezhen = kind === 'xiezhen';
  const isVariant = kind === 'variant';
  const prompt = isXiezhen
    ? String(state.result?.xiezhenPrompt || '').trim()
    : isVariant
      ? String(state.result?.variantPrompt || '').trim()
      : resolveCurrentReversePrompt();
  if (!prompt) {
    setStatus(isXiezhen ? '当前结果没有写真调整提示词' : isVariant ? '当前结果没有同风格变体提示词' : '暂无反推提示词，请先完成一次反推', 'error');
    return;
  }
  if (!isXiezhen && state.result && !state.result.reversePrompt) state.result.reversePrompt = prompt;
  if (!hasCompleteImageSettings()) {
    setStatus('请先在配置中填写生图 API 地址、Key 和模型 ID', 'error');
    openSettings();
    return;
  }
  if (state.running) return;
  state.running = true;
  const button = buttonOverride || (isXiezhen ? el.generateFromXiezhenButton : el.generateFromReverseButton);
  const label = button.textContent;
  button.disabled = true;
  button.textContent = '生成中…';
  setStatus(isXiezhen ? '正在用写真调整提示词生成图像' : isVariant ? '正在用同风格变体提示词生成图像' : '正在用反推提示词生成图像', 'loading');
  try {
    await generateImageFromPrompt(prompt);
    setStatus('生成结果已就绪', 'success');
    revealCurrentResultTwoStage();
  } catch (error) {
    setStatus(error.message || '生图失败，请检查生图配置', 'error');
  } finally {
    state.running = false;
    button.disabled = false;
    button.textContent = label;
  }
}

function resolveCurrentReversePrompt() {
  const direct = String(state.result?.generationPrompt || state.result?.reversePrompt || state.result?.prompt || '').trim();
  if (direct) return direct;
  const activeTask = state.activeTaskId ? state.taskQueue.find(item => item.id === state.activeTaskId) : null;
  const taskPrompt = String(activeTask?.result?.generationPrompt || activeTask?.result?.reversePrompt || activeTask?.result?.prompt || '').trim();
  if (taskPrompt) return taskPrompt;
  const analysisId = state.result?.analysisId || activeTask?.result?.analysisId || '';
  const historyItem = analysisId
    ? state.history.find(item => item.result?.analysisId === analysisId)
    : state.history[0];
  const historyPrompt = String(historyItem?.result?.generationPrompt || historyItem?.result?.reversePrompt || historyItem?.result?.prompt || '').trim();
  if (historyPrompt) return historyPrompt;
  return String(el.reversePrompt?.textContent || '').trim();
}

function hasCompleteImageSettings(settings = state.settings) {
  return Boolean(settings.imageEndpoint && settings.imageApiKey && settings.imageModel);
}

function generationPromptSource(kind = 'reverse') {
  if (kind === 'xiezhen') return String(state.result?.xiezhenPrompt || '').trim();
  if (kind === 'variant') return String(state.result?.variantPrompt || '').trim();
  return resolveCurrentReversePrompt();
}

function promptModeLabel(kind = state.promptMode) {
  return kind === 'xiezhen' ? '写真调整提示词' : kind === 'variant' ? '同风格变体提示词' : '还原提示词';
}

function promptModeAvailable(kind, result = state.result) {
  if (kind === 'xiezhen') return Boolean(String(result?.xiezhenPrompt || '').trim());
  if (kind === 'variant') return Boolean(String(result?.variantPrompt || '').trim());
  return Boolean(String(result?.reversePrompt || '').trim());
}

function setPromptMode(kind) {
  if (!['reverse', 'xiezhen', 'variant'].includes(kind) || !promptModeAvailable(kind)) return;
  state.promptMode = kind;
  renderPromptWorkspace();
}

function renderPromptWorkspace(result = state.result) {
  if (!result || !el.promptModeTabs) return;
  const available = {
    reverse: Boolean(String(result.reversePrompt || '').trim()),
    xiezhen: Boolean(String(result.xiezhenPrompt || '').trim()) && String(result.xiezhenPrompt).trim() !== String(result.reversePrompt || '').trim(),
    variant: Boolean(String(result.variantPrompt || '').trim())
  };
  if (!available[state.promptMode]) state.promptMode = 'reverse';
  el.promptModeTabs.hidden = Object.values(available).filter(Boolean).length < 2;
  el.promptModeTabs.querySelectorAll('[data-prompt-mode]').forEach(button => {
    const kind = button.dataset.promptMode;
    button.disabled = !available[kind];
    button.hidden = !available[kind];
    button.classList.toggle('active', kind === state.promptMode);
    button.setAttribute('aria-selected', String(kind === state.promptMode));
  });
  el.reversePromptCard?.classList.toggle('hidden', state.promptMode !== 'reverse');
  el.xiezhenPromptCard?.classList.toggle('hidden', state.promptMode !== 'xiezhen' || !available.xiezhen);
  el.variantPromptCard?.classList.toggle('hidden', state.promptMode !== 'variant' || !available.variant);
  if (el.copyPromptWithGenerationStyleButton) el.copyPromptWithGenerationStyleButton.disabled = !available[state.promptMode];
  const activePanel = state.promptMode === 'xiezhen' ? el.xiezhenPromptCard : state.promptMode === 'variant' ? el.variantPromptCard : el.reversePromptCard;
  activePanel?.classList.remove('is-collapsed');
  updateResultDockState();
}

function setVisualArchiveMode(kind) {
  if (!['breakdown', 'palette'].includes(kind)) return;
  if (kind === 'palette' && el.paletteSection?.dataset.available !== 'true') return;
  state.visualArchiveMode = kind;
  renderVisualArchiveWorkspace();
  if (el.resultJumpBar && !el.resultJumpBar.hidden) {
    holdCurrentResultJumpTarget(kind === 'palette' ? 'paletteSection' : 'breakdownModule');
  }
}

function renderVisualArchiveWorkspace(showPalette = el.paletteSection?.dataset.available === 'true') {
  if (!el.visualArchiveTabs) return;
  if (!showPalette && state.visualArchiveMode === 'palette') state.visualArchiveMode = 'breakdown';
  el.visualArchiveTabs.querySelectorAll('[data-archive-mode]').forEach(button => {
    const kind = button.dataset.archiveMode;
    button.disabled = kind === 'palette' && !showPalette;
    button.classList.toggle('active', kind === state.visualArchiveMode);
    button.setAttribute('aria-selected', String(kind === state.visualArchiveMode));
  });
  el.breakdownModule?.classList.toggle('hidden', state.visualArchiveMode !== 'breakdown');
  el.paletteSection?.classList.toggle('hidden', !showPalette || state.visualArchiveMode !== 'palette');
}

function updateResultDockState() {
  if (!el.resultDockGenerateButton) return;
  const available = promptModeAvailable(state.promptMode);
  el.resultDockGenerateButton.disabled = !available || state.running;
  el.resultDockCopyButton.disabled = !available;
  el.resultDockFavoriteButton.disabled = !available;
  el.resultDockFavoriteButton.textContent = state.favoritedPrompts.has(state.promptMode === 'reverse' ? 'prompt' : state.promptMode) ? '已存档案' : '存档案';
  /* 铅笔按钮跟随对应提示词面板的编辑态：编辑中高亮并显示"保存" */
  const editKey = state.promptMode === 'xiezhen' ? 'xiezhen' : (state.promptMode === 'variant' ? 'variant' : 'prompt');
  const editing = Boolean(state.promptEditing[editKey]);
  if (el.resultDockEditButton) {
    el.resultDockEditButton.disabled = !available;
    el.resultDockEditButton.classList.toggle('is-editing', editing);
    const label = editing ? '保存当前修改' : '编辑当前提示词';
    el.resultDockEditButton.title = label;
    el.resultDockEditButton.setAttribute('aria-label', label);
  }
}

function generateFromActivePromptMode() {
  return generateFromResultPrompt(state.promptMode, el.resultDockGenerateButton);
}

async function copyActivePromptMode() {
  if (state.promptMode === 'xiezhen') return copyXiezhenPrompt();
  if (state.promptMode === 'variant') return copyVariantPrompt();
  return copyReversePrompt();
}

function favoriteActivePromptMode() {
  return favoritePrompt(state.promptMode === 'reverse' ? 'prompt' : state.promptMode);
}

function editActivePromptMode() {
  return togglePromptEdit(state.promptMode === 'reverse' ? 'prompt' : state.promptMode);
}

function generationAspectForContext(context = {}) {
  const resultContext = context.result || context.task?.result || state.result;
  const evidenceContext = context.localEvidence || context.task?.localEvidence || state.localEvidence;
  const quickSettingsContext = context.quickSettings || context.task?.quickSettingsSnapshot || state.quickSettings;
  const detectedAspect = evidenceContext?.sourceAspectRatio || evidenceContext?.aspectRatio || resultContext?.imageType?.aspectRatio || '';
  return quickSettingsContext.aspectRatio === 'AUTO' ? detectedAspect : quickSettingsContext.aspectRatio;
}

function compileGenerationRequestPrompt(prompt, context = {}) {
  const resultContext = context.result || context.task?.result || state.result;
  const evidenceContext = context.localEvidence || context.task?.localEvidence || state.localEvidence;
  const quickSettingsContext = context.quickSettings || context.task?.quickSettingsSnapshot || state.quickSettings;
  return promptForGeneration(
    prompt,
    generationAspectForContext(context),
    resultContext,
    evidenceContext,
    quickSettingsContext
  );
}

function openGenerationPromptPreview(kind = 'reverse') {
  const prompt = generationPromptSource(kind);
  if (!prompt) {
    setStatus(kind === 'xiezhen' ? '当前结果没有写真调整提示词' : '暂无反推提示词，请先完成一次反推', 'error');
    return;
  }
  const compiledPrompt = compileGenerationRequestPrompt(prompt);
  el.generationPromptPreviewText.textContent = compiledPrompt;
  el.generationPromptPreviewText.dataset.prompt = compiledPrompt;
  el.generationPromptPreviewMeta.textContent = kind === 'xiezhen'
    ? '写真调整提示词加当前生图控制的最终请求'
    : kind === 'variant'
      ? '同风格变体提示词加当前生图控制的最终请求'
      : '反推提示词加当前生图控制的最终请求';
  if (!el.generationPromptDialog.open) el.generationPromptDialog.showModal();
}

async function copyGenerationPromptPreview() {
  const prompt = String(el.generationPromptPreviewText?.dataset.prompt || el.generationPromptPreviewText?.textContent || '').trim();
  if (!prompt) return;
  await copyWithFeedback(event?.currentTarget || document.activeElement, prompt);
  setStatus('已复制实际发送提示词', 'success');
}

function toggleGeneratedRequestPrompt() {
  const expanded = el.generatedRequestPromptToggle?.getAttribute('aria-expanded') !== 'true';
  el.generatedRequestPromptToggle?.setAttribute('aria-expanded', String(expanded));
  if (el.generatedRequestPromptBody) el.generatedRequestPromptBody.hidden = !expanded;
}

async function copyGeneratedRequestPrompt() {
  const prompt = String(state.generatedImage?.prompt || '').trim();
  if (!prompt) return;
  await copyWithFeedback(event?.currentTarget || document.activeElement, prompt);
  setStatus('已复制本次生图实际提示词', 'success');
}

async function generateImageFromPrompt(prompt, context = {}) {
  if (!prompt) throw new Error('缺少可用于生图的中文提示词');
  const settingsContext = context.settings || context.task?.settingsSnapshot || state.settings;
  if (!hasCompleteImageSettings(settingsContext)) throw new Error('生图 API 配置不完整');
  const resultContext = context.result || context.task?.result || state.result;
  const evidenceContext = context.localEvidence || context.task?.localEvidence || state.localEvidence;
  const quickSettingsContext = context.quickSettings || context.task?.quickSettingsSnapshot || state.quickSettings;
  const sourceImage = context.sourceImage || resultContext?.sourceImage || context.task?.capture?.dataUrl || context.task?.capture?.srcUrl || state.sourceDataUrl || state.capture?.dataUrl || state.capture?.srcUrl || '';
  const quality = 'medium';
  const detectedAspect = evidenceContext?.sourceAspectRatio || evidenceContext?.aspectRatio || resultContext?.imageType?.aspectRatio || '';
  const size = imageSizeForAspect(quickSettingsContext.aspectRatio, detectedAspect);
  const generationAspect = quickSettingsContext.aspectRatio === 'AUTO' ? detectedAspect : quickSettingsContext.aspectRatio;
  const finalPrompt = compileGenerationRequestPrompt(prompt, context);
  const model = effectiveImageModel(settingsContext) || settingsContext.imageModel;

  // 优先走后端 AI 网关（密钥不离开后端，协议识别与翻转重试由后端完成；model 为快切选中的生图模型）
  const gateway = await runtimeSend({
    type: 'KBASE_FETCH',
    url: `${normalizeLibraryEndpoint(settingsContext.libraryEndpoint)}/api/ai/image`,
    method: 'POST',
    timeout: 185000,
    body: { prompt: finalPrompt, size, model, quality }
  });

  let response = gateway;
  if (gateway?.aborted) throw makeFbaseAbortError();
  // 后端不可达（未启动）时回落本地直连，沿用扩展内协议识别与翻转重试
  if (Number(gateway?.status) === 0 && usableClientSecret(settingsContext.imageApiKey)) {
    const endpoint = normalizeImageEndpoint(settingsContext.imageEndpoint);
    let isChatFormat = detectChatEndpoint(endpoint);
    response = await requestImageGeneration(endpoint, isChatFormat, finalPrompt, size, model, quality, settingsContext.imageApiKey);
    if (response?.aborted) throw makeFbaseAbortError();
    if (!response?.ok && shouldFlipImageProtocol(response, isChatFormat)) {
      isChatFormat = !isChatFormat;
      response = await requestImageGeneration(endpoint, isChatFormat, finalPrompt, size, model, quality, settingsContext.imageApiKey);
      if (response?.aborted) throw makeFbaseAbortError();
    }
  }
  if (!response?.ok) throw makeRequestError(response, false);
  let generated = extractGeneratedImage(response.data);
  if (!generated) throw new Error('生图接口没有返回可识别的图片');
  const createdAt = Date.now();
  const previewImage = {
    ...generated,
    model,
    prompt: finalPrompt,
    basePrompt: prompt,
    taskId: context.task?.id || '',
    analysisId: resultContext?.analysisId || '',
    original: sourceImage,
    requestedAspect: generationAspect,
    actualWidth: 0,
    actualHeight: 0,
    aspectWarning: '',
    referenceMode: false,
    createdAt,
    favorited: false,
    eagleSaved: false,
    processing: true
  };

  // 图片接口一返回就先交付可见结果。画幅校正、尺寸读取与持久化继续完成，
  // 用户无需等待 canvas 编码和 storage 写入才看到图片。
  if (canPresentGeneratedImage(context, resultContext)) {
    presentGeneratedImage(previewImage, resultContext, evidenceContext);
    revealCurrentResult({ smooth: false });
  }

  generated = await conformGeneratedToAspect(generated, generationAspect);
  let actualWidth = 0;
  let actualHeight = 0;
  let aspectWarning = '';
  if (generated.dataUrl) {
    try {
      const outputImage = await loadImage(generated.dataUrl);
      actualWidth = outputImage.naturalWidth;
      actualHeight = outputImage.naturalHeight;
      const [ratioWidth, ratioHeight] = String(generationAspect || '').split(':').map(Number);
      if (ratioWidth > 0 && ratioHeight > 0 && actualWidth > 0 && actualHeight > 0) {
        const requestedRatio = ratioWidth / ratioHeight;
        const actualRatio = actualWidth / actualHeight;
        if (Math.abs(actualRatio - requestedRatio) / requestedRatio > 0.035) {
          aspectWarning = `请求 ${generationAspect}，接口实际返回 ${actualWidth}×${actualHeight}`;
        }
      }
    } catch {}
  }
  const generatedImage = {
    ...generated,
    model,
    prompt: finalPrompt,
    basePrompt: prompt,
    taskId: context.task?.id || '',
    analysisId: resultContext?.analysisId || '',
    original: sourceImage,
    requestedAspect: generationAspect,
    actualWidth,
    actualHeight,
    aspectWarning,
    referenceMode: false,
    createdAt,
    favorited: false,
    eagleSaved: false,
    processing: false
  };
  await attachGeneratedImageToHistory(generatedImage, resultContext);
  syncWorkToBackend(generatedImage, resultContext);
  if (canPresentGeneratedImage(context, resultContext)) {
    presentGeneratedImage(generatedImage, resultContext, evidenceContext);
    revealCurrentResult();
  }
  return generatedImage;
}

function canPresentGeneratedImage(context, resultContext) {
  if (context.display !== false) return true;
  if (!context.task || state.activeTaskId !== context.task.id) return false;
  const visibleAnalysisId = state.result?.analysisId || '';
  const targetAnalysisId = resultContext?.analysisId || '';
  return !visibleAnalysisId || !targetAnalysisId || visibleAnalysisId === targetAnalysisId;
}

function presentGeneratedImage(generatedImage, resultContext, evidenceContext) {
  state.result = resultContext || state.result;
  state.localEvidence = evidenceContext || state.localEvidence;
  state.generatedImage = generatedImage;
  renderGeneratedResult();
}

async function generatedCandidateDataUrl(candidate) {
  if (candidate?.dataUrl) return candidate.dataUrl;
  if (!candidate?.url) return '';
  const fetched = await runtimeSend({ type: 'IMAGE_FETCH', url: candidate.url });
  if (!fetched?.ok || !fetched.dataUrl) throw new Error(fetched?.error || '无法读取校准候选图');
  return fetched.dataUrl;
}

async function conformGeneratedToAspect(generated, aspectRatio) {
  if (!generated?.dataUrl) return generated;
  const [ratioWidth, ratioHeight] = String(aspectRatio || '').split(':').map(Number);
  if (!(ratioWidth > 0 && ratioHeight > 0)) return generated;
  const image = await loadImage(generated.dataUrl);
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  if (!(width > 0 && height > 0)) return generated;
  const targetRatio = ratioWidth / ratioHeight;
  const actualRatio = width / height;
  if (Math.abs(actualRatio - targetRatio) / targetRatio <= 0.012) return generated;

  let sourceX = 0;
  let sourceY = 0;
  let sourceWidth = width;
  let sourceHeight = height;
  if (actualRatio > targetRatio) {
    sourceWidth = Math.max(1, Math.round(height * targetRatio));
    sourceX = Math.max(0, Math.floor((width - sourceWidth) / 2));
  } else {
    sourceHeight = Math.max(1, Math.round(width / targetRatio));
    sourceY = Math.max(0, Math.floor((height - sourceHeight) / 2));
  }
  const canvas = document.createElement('canvas');
  canvas.width = sourceWidth;
  canvas.height = sourceHeight;
  const context = canvas.getContext('2d');
  if (!context) return generated;
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, sourceWidth, sourceHeight);
  return {
    ...generated,
    dataUrl: canvas.toDataURL('image/jpeg', 0.92),
    aspectConformed: true,
    croppedFromWidth: width,
    croppedFromHeight: height
  };
}

function normalizeSimilarityScore(value) {
  return Math.max(0, Math.min(100, Number(value) || 0));
}

const HIGH_SIMILARITY_DIMENSIONS = Object.freeze({
  composition: 0.12,
  cameraPerspective: 0.12,
  faceGeometry: 0.18,
  hairTopology: 0.13,
  bodyProportion: 0.11,
  pose: 0.10,
  clothing: 0.09,
  backgroundGeometry: 0.06,
  lightingColor: 0.05,
  imaging: 0.04
});

function normalizeAnchorText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 2600);
}

async function extractHighSimilarityAnchorContract(originalDataUrl, prompt) {
  setStatus('纯文生校准：正在建立自足的原图硬约束', 'loading');
  const system = [
    '你是 F·BASE 纯文字高还原取证器。只分析当前目标原图，把容易漂移的结构转换为自足、可执行的简体中文硬约束。',
    '人物照片必须测量式描述：画幅与裁切、相机高度和俯仰、近大远小、主体边界框与头部占比、眼线位置、身体轴线；脸型与三庭比例、下颌下巴、眼裂与虹膜比例、眼距、鼻唇几何；发型分区、分缝、刘海、扎发数量和高度、两侧轮廓与长度；可见肩胸腰和躯干比例；动作接触与遮挡；服装结构；背景固定物的画面坐标和尺寸；光线与成像。',
    '所有左右关系使用观者看到的画面坐标。只写可见证据，不猜姓名、身份、品牌和遮挡区域。百分比允许采用稳定区间，避免虚假精度。',
    'lockedPrompt 是一段连续的中文生成约束，按构图与镜头、面部、发型、身形与动作、服装、背景、光线与成像的顺序书写。它会追加到原提示词后，不能引用原图，也不能写“保持一致”这类依赖图片的句子。',
    '只返回 JSON：{"imageClass":"...","anchors":{"composition":"...","cameraPerspective":"...","faceGeometry":"...","hairTopology":"...","bodyProportion":"...","pose":"...","clothing":"...","backgroundGeometry":"...","lightingColor":"...","imaging":"..."},"failureGuards":["..."],"lockedPrompt":"..."}'
  ].join('\n');
  const contract = await aiJson({
    task: 'vision',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: [
        { type: 'text', text: `现有反推提示词只作为遗漏核对材料：\n${prompt}` },
        { type: 'image_url', image_url: { url: originalDataUrl } }
      ] }
    ],
    temperature: 0.05,
    maxTokens: 6500,
    timeout: 185000,
    retries: 1
  });
  const anchors = {};
  for (const key of Object.keys(HIGH_SIMILARITY_DIMENSIONS)) anchors[key] = normalizeAnchorText(contract?.anchors?.[key]);
  return {
    imageClass: normalizeAnchorText(contract?.imageClass),
    anchors,
    failureGuards: Array.isArray(contract?.failureGuards) ? contract.failureGuards.map(normalizeAnchorText).filter(Boolean).slice(0, 8) : [],
    lockedPrompt: normalizeAnchorText(contract?.lockedPrompt)
  };
}

function anchorContractPrompt(contract) {
  if (!contract) return '';
  const ordered = Object.keys(HIGH_SIMILARITY_DIMENSIONS).map(key => contract.anchors?.[key]).filter(Boolean);
  const body = contract.lockedPrompt || ordered.join('；');
  const guards = (contract.failureGuards || []).filter(Boolean).join('；');
  return [body, guards ? `生成防线：${guards}` : ''].filter(Boolean).join('。');
}

async function prepareHighSimilarityGeneration(originalDataUrl, prompt) {
  if (!state.quickSettings.highSimilarityMode || !originalDataUrl) return { prompt, anchorContract: null };
  try {
    const anchorContract = await extractHighSimilarityAnchorContract(originalDataUrl, prompt);
    const locked = anchorContractPrompt(anchorContract);
    return { prompt: locked ? `${prompt}\n原图复现硬约束：${locked}` : prompt, anchorContract };
  } catch (error) {
    if (isFbaseAbort(error)) throw error;
    console.warn('F·BASE 原图硬约束提取失败，继续使用现有反推提示词', error);
    return { prompt, anchorContract: null };
  }
}

function weightedSimilarityScore(audit) {
  const dimensions = audit?.dimensions && typeof audit.dimensions === 'object' ? audit.dimensions : {};
  let weighted = 0;
  let availableWeight = 0;
  for (const [key, weight] of Object.entries(HIGH_SIMILARITY_DIMENSIONS)) {
    if (!Number.isFinite(Number(dimensions[key]))) continue;
    weighted += normalizeSimilarityScore(dimensions[key]) * weight;
    availableWeight += weight;
  }
  return availableWeight >= 0.7 ? normalizeSimilarityScore(weighted / availableWeight) : normalizeSimilarityScore(audit?.score || audit?.similarityScore);
}

async function auditHighSimilarityCandidate(originalDataUrl, candidateDataUrl, prompt, round, anchorContract) {
  const system = [
    '你是 F·BASE 纯文生复现审校器。第一张图是目标原图，第二张图只由当前中文提示词生成，生图端没有收到原图。',
    '逐项比较十个维度：画幅构图、相机透视、面部几何、发型拓扑、身形比例、动作姿态、服装结构、背景几何、光线色彩、成像质感。每项给出 0 到 100 的严格评分。',
    '面部几何和发型拓扑要比较结构比例，不能用“都是年轻女性”或“都是长发”判为相似。构图要核对主体和背景固定物的画面坐标、尺寸及裁切。',
    '所有判断只使用两张图片的可见证据。评分表示当前候选对可见画面的复现程度。',
    '只修正得分最低且影响最大的三项。其余已经匹配的锚点逐字保留，不能为了改善局部而改换人物脸型、发型结构、镜头距离或身体占位。',
    'revisedPrompt 必须是一段完整、连续、可直接提交生图模型的简体中文提示词。开头重申构图、相机、面部、发型和身形硬约束，随后保留其他匹配控制。',
    '下一轮生图端仍然只接收 revisedPrompt。revisedPrompt 必须写成自足中文规格，明确锁定项与仅允许调整的三项差异。',
    'revisedPrompt 禁止出现“原图、参考图、如图、保持一致、与图片相同”等依赖外部图像的表达，每个约束都要展开为生成模型可独立执行的可见规格。',
    '只返回 JSON：{"score":0,"dimensions":{"composition":0,"cameraPerspective":0,"faceGeometry":0,"hairTopology":0,"bodyProportion":0,"pose":0,"clothing":0,"backgroundGeometry":0,"lightingColor":0,"imaging":0},"largestDifferences":["..."],"preservedAnchors":["..."],"revisedPrompt":"..."}'
  ].join('\n');
  return aiJson({
    task: 'vision',
    messages: [
      { role: 'system', content: system },
      {
        role: 'user',
        content: [
          { type: 'text', text: `当前为第 ${round} 次候选审校。原图硬约束：\n${JSON.stringify(anchorContract || {})}\n当前生图提示词：\n${prompt}\n请比较随后两张图片，第一张为目标原图，第二张为候选图。` },
          { type: 'image_url', image_url: { url: originalDataUrl } },
          { type: 'image_url', image_url: { url: candidateDataUrl } }
        ]
      }
    ],
    temperature: 0.1,
    maxTokens: 6500,
    timeout: 185000,
    retries: 1
  });
}

async function runHighSimilarityCalibration(originalDataUrl, initialPrompt, providedAnchorContract = null) {
  if (!originalDataUrl || !state.generatedImage) return state.generatedImage;
  let anchorContract = providedAnchorContract;
  if (!anchorContract) {
    try { anchorContract = await extractHighSimilarityAnchorContract(originalDataUrl, initialPrompt); }
    catch (error) {
      if (isFbaseAbort(error)) throw error;
      console.warn('F·BASE 校准锚点提取失败，使用当前提示词继续审校', error);
    }
  }
  const candidates = [];
  let candidate = { ...state.generatedImage, prompt: initialPrompt || state.generatedImage.prompt || '' };
  const maxCorrectionRounds = 2;
  for (let round = 0; round <= maxCorrectionRounds; round += 1) {
    setStatus(`纯文生校准：正在审校第 ${round + 1} 张候选图`, 'loading');
    let audit;
    try {
      const candidateDataUrl = await generatedCandidateDataUrl(candidate);
      audit = await auditHighSimilarityCandidate(originalDataUrl, candidateDataUrl, candidate.prompt, round + 1, anchorContract);
    } catch (error) {
      candidate = { ...candidate, calibrationError: error.message || '候选图审校失败' };
      candidates.push(candidate);
      break;
    }
    const score = weightedSimilarityScore(audit);
    candidate = {
      ...candidate,
      similarityScore: score,
      calibrationAudit: {
        dimensions: audit.dimensions || {},
        largestDifferences: Array.isArray(audit.largestDifferences) ? audit.largestDifferences.slice(0, 8) : [],
        preservedAnchors: Array.isArray(audit.preservedAnchors) ? audit.preservedAnchors.slice(0, 8) : [],
        round: round + 1
      }
    };
    candidates.push(candidate);
    if (score >= 95 || round === maxCorrectionRounds) break;
    const revisedPrompt = normalizeGeneratedPrompt(audit.revisedPrompt || audit.prompt || '');
    if (!revisedPrompt || revisedPrompt === candidate.prompt) break;
    setStatus(`纯文生校准：评分 ${Math.round(score)}，正在按差异生成第 ${round + 2} 张候选图`, 'loading');
    await generateImageFromPrompt(revisedPrompt);
    candidate = { ...state.generatedImage, prompt: revisedPrompt };
  }
  const best = candidates.sort((a, b) => Number(b.similarityScore || 0) - Number(a.similarityScore || 0))[0] || candidate;
  state.generatedImage = {
    ...best,
    original: best.original || originalDataUrl,
    calibrationRounds: candidates.length,
    calibrationCandidates: candidates.map(item => ({
      prompt: item.prompt,
      similarityScore: item.similarityScore,
      audit: item.calibrationAudit
    }))
  };
  if (state.result && best.prompt) {
    state.result.reversePrompt = best.prompt;
    state.result.generationPrompt = best.prompt;
    if (state.pendingImport?.analysis) {
      state.pendingImport.analysis.reversePrompt = best.prompt;
      state.pendingImport.analysis.generationPrompt = best.prompt;
    }
    renderResult(state.result);
    await syncResultEdits();
  }
  renderGeneratedResult();
  await attachGeneratedImageToHistory();
  revealCurrentResultTwoStage();
  const bestScore = Math.round(Number(best.similarityScore) || 0);
  setStatus(`纯文生校准完成，最佳中文提示词已回写，视觉审校评分 ${bestScore}`, 'success');
  return state.generatedImage;
}

function normalizeImageEndpoint(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  const url = new URL(text);
  const loopback = ['127.0.0.1', 'localhost'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) throw new Error('生图接口需要使用 HTTPS 或本机 HTTP 地址');
  // 只填域名或 /v1 时自动补全为 chat completions 路径（多数中转站的生图入口）
  const path = url.pathname.replace(/\/+$/, '');
  if (!path || path === '/v1') {
    url.pathname = '/v1/chat/completions';
    url.search = '';
    url.hash = '';
  }
  return url.href;
}

function detectChatEndpoint(endpoint) {
  if (/\/images\/(?:generations|edits)\/?$/i.test(endpoint)) return false;
  // 显式 chat completions、裸域名、/v1 等其余情况一律按 chat completions 处理
  return true;
}

function buildImageRequestBody(isChatFormat, prompt, size, modelOverride, quality = 'medium') {
  const model = modelOverride || state.settings.imageModel;
  return isChatFormat
    ? {
        model,
        messages: [{ role: 'user', content: prompt }],
        size,
        quality
      }
    : { model, prompt, n: 1, size, quality };
}

function imageEndpointForProtocol(endpoint, isChatFormat) {
  const url = new URL(endpoint);
  if (isChatFormat) {
    url.pathname = url.pathname.replace(/\/images\/(?:generations|edits)\/?$/i, '/chat/completions');
  } else if (/\/chat\/completions\/?$/i.test(url.pathname)) {
    url.pathname = url.pathname.replace(/\/chat\/completions\/?$/i, '/images/generations');
  } else if (/\/images\/edits\/?$/i.test(url.pathname)) {
    url.pathname = url.pathname.replace(/\/images\/edits\/?$/i, '/images/generations');
  }
  return url.href;
}

async function requestImageGeneration(endpoint, isChatFormat, prompt, size, model, quality = 'medium', apiKey = state.settings.imageApiKey) {
  const requestEndpoint = imageEndpointForProtocol(endpoint, isChatFormat);
  return runtimeSend({
    type: 'LLM_FETCH',
    url: requestEndpoint,
    method: 'POST',
    timeout: 185000,
    apiKey,
    body: buildImageRequestBody(isChatFormat, prompt, size, model, quality)
  });
}

function shouldFlipImageProtocol(response, usedChatFormat) {
  const status = Number(response?.status || 0);
  if (status !== 400 && status !== 422) return false;
  const text = [
    response?.data?.error?.message,
    typeof response?.data?.error === 'string' ? response.data.error : '',
    response?.data?.message,
    typeof response?.error === 'string' ? response.error : ''
  ].filter(Boolean).join(' ').toLowerCase();
  if (!text) return false;
  // 当前格式缺少服务端要求的字段时，切换另一种格式重试
  return usedChatFormat
    ? /field\s+prompt|prompt.*required|required.*prompt|not supported on (?:the )?chat completions endpoint|chat completions.*not supported|unsupported.*chat completions/.test(text)
    : /field\s+messages|messages.*required|required.*messages|not supported on (?:the )?images? endpoint|images? endpoint.*not supported/.test(text);
}

function imageSizeForAspect(aspect, detectedAspect) {
  const value = aspect === 'AUTO' ? detectedAspect : aspect;
  return globalThis.FBaseImageSizing?.normalizeImageGenerationSize(value || '1:1', '1k') || '1024x1024';
}

function promptForGeneration(prompt, aspectRatio = '', resultContext = state.result, evidenceContext = state.localEvidence, quickSettings = state.quickSettings) {
  const normalizePrompt = globalThis.FBaseReverseMethodology?.normalizePromptPunctuation || (value => String(value || '').trim());
  const sections = [normalizePrompt(prompt)];
  const styleSentence = generationStyleSentence(resultContext, prompt);
  if (styleSentence && Array.isArray(resultContext?.generationStyleControls)) sections.push(styleSentence);
  const imageSentence = generationImageSentence(resultContext, prompt);
  if (imageSentence && Array.isArray(resultContext?.generationImageControls)) sections.push(imageSentence);
  if (aspectRatio) sections.push(`输出画幅为 ${aspectRatio}，按此画幅安排主体和裁切；如前文出现旧画幅，以此处为准。`);
  if (quickSettings.referencePalette && resultContext?.palette?.length) {
    const palette = resultContext.palette.map(color => `${color.hex} ${color.role || '画面配色'} ${color.ratio || 0}%`).join('，');
    sections.push(`参考配色：${palette}。按对应物体分配颜色，比例作为近似参考。当前提示词明确指定的颜色、肤色和光线优先。`);
  }
  return normalizePrompt(sections.filter(Boolean).join('\n'));
}

function extractGeneratedImage(data) {
  const candidates = [
    ...(Array.isArray(data?.data) ? data.data : []),
    ...(Array.isArray(data?.images) ? data.images : []),
    ...(Array.isArray(data?.output?.results) ? data.output.results : [])
  ];
  const item = candidates.find(candidate => candidate?.b64_json || candidate?.base64 || candidate?.url || candidate?.image_url);
  const base64 = item?.b64_json || item?.base64 || data?.b64_json || data?.base64;
  if (base64) return { dataUrl: String(base64).startsWith('data:image/') ? String(base64) : `data:image/png;base64,${base64}`, url: '' };
  const url = item?.url || item?.image_url || data?.url || data?.output_url;
  if (url) return { url: String(url), dataUrl: '' };
  // chat completions 格式：从 choices[0].message.content 提取图片
  return extractImageFromChatContent(data?.choices?.[0]?.message?.content);
}

function extractImageFromChatContent(content) {
  if (!content) return null;
  if (Array.isArray(content)) {
    // 多模态分段响应：优先找 image/image_url 类型分段
    for (const part of content) {
      const direct = part?.image_url?.url || (part?.type === 'image_url' && part?.url) || (part?.type === 'image' && (part?.image_url?.url || part?.url || part?.b64_json));
      if (direct) {
        const text = String(direct);
        if (text.startsWith('data:image/')) return { dataUrl: text, url: '' };
        if (/^https?:\/\//.test(text)) return { url: text, dataUrl: '' };
        return { dataUrl: `data:image/png;base64,${text}`, url: '' };
      }
    }
    for (const part of content) {
      const found = extractImageFromChatContent(typeof part === 'string' ? part : part?.text || part?.content);
      if (found) return found;
    }
    return null;
  }
  const text = String(content).trim();
  if (!text) return null;
  // 1. data URI base64
  const dataUri = text.match(/data:image\/[a-zA-Z+.-]+;base64,[A-Za-z0-9+/=]+/);
  if (dataUri) return { dataUrl: dataUri[0], url: '' };
  // 2. markdown 图片 ![](url)
  const md = text.match(/!\[[^\]]*\]\(\s*(?:<)?([^)\s>]+)/);
  if (md) {
    const target = md[1];
    if (target.startsWith('data:image/')) return { dataUrl: target, url: '' };
    if (/^https?:\/\//.test(target)) return { url: target, dataUrl: '' };
  }
  // 3. HTML img 标签
  const imgTag = text.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgTag) {
    const target = imgTag[1];
    if (target.startsWith('data:image/')) return { dataUrl: target, url: '' };
    if (/^https?:\/\//.test(target)) return { url: target, dataUrl: '' };
  }
  // 4. 裸图片 URL
  const bare = text.match(/https?:\/\/[^\s"'<>)\]}]+\.(?:png|jpe?g|webp|gif)(?:\?[^\s"'<>)\]}]*)?/i);
  if (bare) return { url: bare[0], dataUrl: '' };
  return null;
}

function buildReverseMessages(inputText, imageDataUrl, localEvidence, quickSettings = state.quickSettings) {
  const sourceAspect = localEvidence?.sourceAspectRatio || localEvidence?.aspectRatio || '由图片像素决定';
  const aspect = quickSettings.aspectRatio === 'AUTO' ? sourceAspect : quickSettings.aspectRatio;
  const paletteText = localEvidence?.palette?.length
    ? `参考色卡：${localEvidence.palette.map(color => `${color.hex} ${color.role || '参考色'} ${color.ratio || 0}%`).join('；')}。色卡仅描述全画面大面积区域，人物肤色与局部材质必须从对应区域单独取证。色彩关系需要进入拆解与完整提示词。`
    : '';
  const tonal = localEvidence?.tonalEvidence;
  const tonalText = tonal
    ? `确定性明暗证据：平均明度 ${tonal.meanLightness}，明度离散 ${tonal.lightnessDeviation}，平均色度 ${tonal.meanChroma}，暗部比例 ${tonal.darkRatio}，高光比例 ${tonal.highlightRatio}，最亮区域 ${tonal.brightestRegion}，最暗区域 ${tonal.darkestRegion}；九宫格为 ${tonal.spatialGrid.map(item => `${item.region}:${item.hex}/${item.lightness}`).join('；')}。曝光、肤色、背景和局部明暗描述必须与这些像素证据同向。`
    : '';
  const actionText = quickSettings.actionReferenceMode
    ? '动作参考模式已开启，优先分析身体重心、关节方向、手势、接触关系、视线和动作连续性，并把这些控制写入提示词。'
    : '';
  const instruction = inputText
    ? `用户补充要求：${inputText}`
    : '请忠实分析参考图，所有可见文字结果使用简体中文。';
  const dimensionsText = localEvidence?.width && localEvidence?.height
    ? `原图像素尺寸：${localEvidence.width}×${localEvidence.height}。原图实测画幅：${sourceAspect}。`
    : '';
  const aspectText = quickSettings.aspectRatio === 'AUTO'
    ? `目标画幅严格采用原图实测画幅 ${aspect}。`
    : `用户手动指定目标画幅 ${aspect}，该值覆盖原图实测画幅。`;
  const mergedInstruction = `${instruction}\n${dimensionsText}${aspectText}${paletteText}${tonalText}${actionText}`;
  const content = imageDataUrl
    ? [{ type: 'image_url', image_url: { url: imageDataUrl } }, { type: 'text', text: mergedInstruction }]
    : mergedInstruction;
  return [
    { role: 'system', content: buildBuiltinReversePrompt(quickSettings) },
    { role: 'user', content }
  ];
}

function resolvedReverseAspect(localEvidence, quickSettings = state.quickSettings) {
  return quickSettings.aspectRatio === 'AUTO'
    ? (localEvidence?.sourceAspectRatio || localEvidence?.aspectRatio || '')
    : quickSettings.aspectRatio;
}

function shouldRunMethodologyReview(imageDataUrl, quickSettings = state.quickSettings, twoPhase) {
  if (!imageDataUrl || !globalThis.FBaseReverseMethodology) return false;
  if (quickSettings.promptDetail === 'concise') return false;
  return typeof twoPhase === 'boolean' ? twoPhase : activeSharedProfile()?.twoPhase !== false;
}

async function reviewReverseResult(draft, imageDataUrl, localEvidence, inputText, context = {}) {
  const methodology = globalThis.FBaseReverseMethodology;
  const settings = context.settings || state.settings;
  const quickSettings = context.quickSettings || state.quickSettings;
  const aspectRatio = resolvedReverseAspect(localEvidence, quickSettings);
  const quality = methodology.assessQuality(draft, { aspectRatio });
  const system = methodology.buildReviewPrompt({
    imageTypeKey: draft.imageType?.key,
    aspectRatio,
    sourceWidth: localEvidence?.width || 0,
    sourceHeight: localEvidence?.height || 0,
    palette: localEvidence?.palette || [],
    tonalEvidence: localEvidence?.tonalEvidence || null,
    variantEnabled: quickSettings.outputVariant === true,
    portraitFidelity: quickSettings.portraitFidelity === true
  });
  const auditContext = {
    userRequirement: inputText || '',
    firstPass: draft,
    deterministicEvidence: {
      width: localEvidence?.width || 0,
      height: localEvidence?.height || 0,
      aspectRatio,
      sourceAspectRatio: localEvidence?.sourceAspectRatio || localEvidence?.aspectRatio || '',
      generationAspectRatio: localEvidence?.generationAspectRatio || '',
      palette: localEvidence?.palette || [],
      tonalEvidence: localEvidence?.tonalEvidence || null
    },
    firstPassQuality: quality
  };
  const response = await requestVisionCompletion({
    model: settings.model,
    messages: [
      { role: 'system', content: system },
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: imageDataUrl } },
          { type: 'text', text: `请依据图片审校并重编译以下初稿：\n${JSON.stringify(auditContext)}` }
        ]
      }
    ],
    temperature: 0.1,
    max_tokens: quickSettings.promptDetail === 'precise' ? 9000 : 6000,
    stream: false
  }, settings, 185000);
  if (response?.aborted) throw makeFbaseAbortError();
  if (!response?.ok) throw makeRequestError(response, true);
  const reviewed = await parseReverseOutputWithRepair(extractLlmText(response.data), settings);
  const merged = methodology.mergeResults(draft, reviewed);
  return methodology.finalizeResult(merged, {
    aspectRatio,
    portraitFidelity: quickSettings.portraitFidelity === true
  });
}

function buildBuiltinReversePrompt(quickSettings = state.quickSettings) {
  const variantEnabled = quickSettings.outputVariant === true;
  const precise = quickSettings.promptDetail === 'precise';
  const outputFields = `imageType、breakdown、prompt${variantEnabled ? '、variantPrompt' : ''}`;
  const paletteRule = quickSettings.colorCardMode
    ? '色卡由本地确定性像素算法提取。不要输出 colorPalette、color_palette 或 palette 字段；只在"光线与色彩"和 prompt 中用简体中文描述主色调、冷暖、明暗与成像质感。色卡代表全画面大面积颜色分布，必须按背景、服装、建筑、地面等区域分配，人物肤色与局部材质从对应区域单独取证。'
    : '色卡模式关闭：不要输出 colorPalette、color_palette 或 palette 字段；只在"光线与色彩"和 prompt 中用简体中文自然语言概括主色调、饱和度、冷暖和光影倾向。';
  const jsonShape = '返回结构：{"imageType":{"key":"mixed_other","label":"混合视觉","confidence":0.8,"reason":"..."},"breakdown":[{"key":"image_type","label":"图像类型","value":"..."}],"prompt":"...","variantPrompt":"..."}';
  const densityRule = {
    concise: '拆解密度：只保留对复现影响最大的字段，先抓三至五个关键辨识特征，按需补充必要字段，不设数量下限。',
    standard: '拆解密度：覆盖全部有证据且影响成图的字段，按画面复杂度选择，每项简洁具体，不为数量补齐字段。',
    precise: '拆解密度：精细覆盖全部有证据维度，按画面实际需要展开，不设字段数量下限。'
  }[quickSettings.promptDetail];
  const promptPrecisionRule = precise
    ? '提示词精度：高精度。prompt 必须覆盖类型 profile 中全部有证据字段的结论，包括风格机制、主体身份、关键接触与视线、构图光色、表面层和动态负向约束；同时删除重复和冲突词。'
    : '提示词精度：标准精度。prompt 必须承接类型 profile 的关键解构点，删除空泛、重复、相近或冲突的形容词；普通肤色与手势不得机械扩写成长合约。';
  const variantRule = variantEnabled
    ? 'variantPrompt 是同系列变体提示词。只逐字锁定整体风格词链和成像机制词链；人物细节、妆发、服装、场景、道具、机位、构图、身体动作、手部关系、表情、视线和现场光线都可以在同一审美体系内重新设计。变体必须形成明显不同的观看关系与画面事件，同时保持系列识别，不要解释变化原因。'
    : '第三步只生成主提示词，variantPrompt 返回空字符串。';
  const actionRule = quickSettings.actionReferenceMode
    ? '动作参考模式开启时：动作姿态、身体重心、关节方向、手势、接触关系、视线和动作连续性属于高优先级维度，必须单独成栏并把控制语句写入提示词。'
    : '';
  const fusionDirectives = globalThis.FBaseReverseMethodology?.buildFusionDirectives({
    variantEnabled,
    portraitFidelity: quickSettings.portraitFidelity === true
  }) || '';
  return [
    // ── 角色与输出协议 ──
    '你是一名 Agent 式视觉取证与提示词编译专家。先在内部建立证据账本并比较候选解释，再分析参考图并输出合法 JSON。不要 Markdown，不要额外解释，不要展示内部推演过程。',
    `必须返回 ${outputFields} 字段，所有用户可见字段值使用简体中文。breakdown 每项使用 {"key":"英文键","label":"中文栏名","value":"结论"}，key 必须用下方所选 profile 字段清单给出的英文键。`,
    jsonShape,

    // ── 工作流程：类型路由（核心架构）──
    '工作流程分四步：第一步独立记录媒介、几何、身份、动作接触、道具和成像证据；第二步比较候选类型并用反证完成路由；第三步只按胜出类型的 profile 字段做拆解；第四步按生成优先级把强证据锚点重组为临时完整提示词，交给下一阶段独立复核。',
    'imageType.key 只能取以下之一：photographic_portrait（真实人像摄影）、anime_illustration（动漫/插画）、poster_design（海报/平面设计）、commercial_product（商业产品图）、product_still（静物棚拍）、space_landscape（空间/风景）、ui_infographic（界面/信息图）、mixed_other（混合视觉）。混合图片选一个主导类型，最多借用次级类型 1-3 个必要字段；平台 UI、水印、账号信息不参与类型路由。',

    // ── 通用证据门控 ──
    '【通用证据门控】只写可见或由光线、材质、透视明确支持的事实；无证据字段直接省略，严禁用空值凑数；无法确认的镜头参数、作者、品牌与具体软件不得虚构。同一事实只归入一个最合适的字段。',
    '【形体材质证据门控】先拆轮廓与连接拓扑，再拆材质本体、表面状态和损伤分布。形似骨、壳、布、皮膜或翅翼只表示造型类比，不能直接推导真实骨骼、翼膜、腐尸、亡灵或整体腐朽。局部孔洞、裂口、毛糙边缘和暗色内腔必须写明作用区域，禁止扩写成全身粗糙、全局碎裂或大面积破翼。',
    '【实物媒介优先门控】先区分现实物体摄影、活体摄影、插画和数字渲染，再判断物体描绘的题材。桌面承载、接触投影、木纹等尺度参照、球形或转轴关节、装配缝、分件边界、注塑或喷涂表面共同指向实体模型时，必须路由到 product_still；只有明确广告陈列与品牌商业布光才使用 commercial_product。主体写成实体可动模型、收藏玩具或手办产品，题材身份放在制造媒介之后。',
    '【可动模型证据合同】实体产品独立输出 physical_medium:实物媒介、scale_cues:尺度线索、manufacturing_evidence:制造与装配证据；出现关节时再输出 articulation_system:可动关节系统，写清肩、肘、腕、髋、膝、踝等可见位置的关节球、转轴、缝隙、分件连接和活动方向。尺度根据桌面、木纹、支撑面、接触影和景深描述为小比例桌面物件，不虚构具体厘米数。prompt 开头先锁定真实产品摄影、小比例实体模型、制造材质、可见关节与分件及平滑喷涂表面，再写角色造型。',
    densityRule,
    '每个有证据字段写 1-3 句具体控制描述：可见事实 + 空间关系或生成控制作用；禁止"高级、氛围感、精致、好看"等无法执行的空词，禁止为凑模板输出无证据字段。',
    '【画面坐标规则】所有位置、朝向、视线、肢体和道具描述统一使用观者视角的画布坐标：画面左侧、画面右侧、画面中央、前景、中景、背景；不使用人物自身左右。元素位于哪里、朝向哪里、从哪条边进入分开表达，不用"身体侧向左边"这类多义词。对明显非对称画面还要保留左右视觉重量分配（主体中心偏左/居中/偏右）；居中或近似对称画面不得强行添加偏置。',
    '【视线判断规则】水平视线的唯一一手证据是虹膜在眼裂中的位置：虹膜偏向画面右侧时，其画面左侧眼白通常更多，反之亦然。脸部朝向、情绪、构图叙事和附近物体都不能替代这一步；只有虹膜方向确定后，才可把该方向上的明确目标物作为一致性核对，不得由目标物倒推视线。',
    fusionDirectives,

    // ── 成像签名归纳 ──
    '【成像签名归纳】画面存在明显曝光、色温、美颜、颗粒、柔焦、压缩或渲染签名时，先按"固有属性 / 光线 / 曝光 / 后期与渲染"四层分离，再由证据归纳受控复合术语；复合术语必须带必要证据与排除条件，证据不足时退回窄描述，不猜滤镜名。四层不得混写：肤色/肤调只写固有皮肤表现，光线/色彩只写照明，成像质感只写捕捉或渲染表面，风格/滤镜与成像签名只写选定复合术语。',

    // ── 类型 profile（按判定结果只应用对应一段）──
    '【profile A · 真实人像 photographic_portrait】字段顺序：image_type:图像类型、medium_identity:媒介身份、style_reference:风格参考线索、style_filter:风格与滤镜、frame_rotation:画面旋转状态、gravity_reference:重力参照、capture_signature:采集成像签名、cinematic_staging:电影场面调度、cinematic_signature:电影成像签名、clarity_map:清晰度地图、exposure_map:曝光分布、framing:景别与取景、camera_angle:机位角度、lens:镜头语言、camera_subject_geometry:相机与主体几何、subject_occupancy:主体占位、perspective_strength:透视强度、near_field_geometry:近场几何、subject:主体身份、identity_anchors:人物身份锚点、face_geometry:面部几何、facial_maturity:面部成熟度、body_silhouette:身形轮廓、skin_tone:皮肤固有色、skin_exposure:皮肤局部曝光、skin_rendering:皮肤成像处理、pose_identity:动作类别、pose:动作姿态、gesture:手势与肢体、spatial_skeleton:空间骨架、support_mechanics:支撑与受力、contact_map:支撑接触图、gaze:视线方向、gaze_geometry:视线几何、expression:表情状态、micro_expression:微表情与情绪、hair_style:发型结构、accessories:配饰、prop_geometry:关键道具几何、clothing:服装款式、clothing_fit:服装贴合度、clothing_material:服装材质、garment_tension_map:服装张力与褶皱分布、scene:场景设定、background:背景结构、lighting_style:整体布光、light_quality:光质、color_system:色彩系统、rendering:渲染方式、grain:颗粒与噪点、sharpness:锐度、negative_constraints:负向约束。先判断媒介身份；分开记录机位、主体几何、脸部朝向和虹膜方向；关键道具必须保留形状拓扑与接触关系。',
    '人像观察规则：眼唇眉细节并入主体/微表情/肤调，不强制动漫脸部字段；摄影词（焦段、机位、直闪、窗光、胶片、CCD、颗粒、过曝、压缩）仅在画面支持时使用；近景美妆/角色化人像要写构图控制组（画幅、裁切方式、机位高度、直视或微仰/微俯、主体占比、头部位置、肩臂斜线、背景负空间）而非只写"近景"；保留可见锐度层级（最锐处/中等细节/渐柔处），不拍平成全局锐利或整体朦胧；手与脸、唇、道具接触时写明具体接触点与微形变（压痕、唇形中断、高光位移、悬停还是轻触）；复杂发型头饰先写大轮廓与画面占位，再写附件路径与材质；"约 70-85mm 中长焦感"这类词仅在透视压缩与景深支持时作为视觉印象使用，不写成相机元数据。',
    '【profile B · 动漫插画 anime_illustration】字段顺序：frame_carrier:画幅与载体、core_style_contract:核心风格合约、subject_identity:主体身份、face_archetype:脸部风格锁定、face_shape:脸型与面部线条、eye_design:眼型与瞳孔、brow_expression:眉形与眼神压力、mouth_lip_style:嘴部与唇色、body_silhouette:身形轮廓、skin_tone_color:肤色与肤调、pose_expression:动作与姿态、micro_expression:微表情与情绪、styling:发型/妆容/配饰、clothing_fit:服装贴合度、clothing_material:服装材质、skin_hair_highlight:皮肤与头发高光、composition_space:构图与空间、scene_background:场景与背景、light_color:光线与色彩、surface_imaging:表面与成像、dynamic_negative_constraints:动态负向约束。这是唯一必须展开全部脸部细分字段的类型。',
    '动漫核心风格合约按六层判断：总体视觉气质；绘画媒介与表现方法；制作工艺；作者与作品谱系；时代与载体；构图、摄影与空间语言。先写可观察证据，再给风格名称。合约只保留全局机制与职责边界，不得吞并脸型、眼型、嘴唇、动作、服装、场景和光色字段。六层证据完成后整理为主风格、可选辅助风格、表面层和载体层：主风格统一负责人物造型、线条、基础上色与空间；辅助风格可为零且只承担局部职责；表面层只负责扫描、颗粒、色偏、网点、压缩或像素；载体层只定义最终呈现。',
    '动漫机制判定：先看轮廓内部的线面关系、阴影边界和色块层数；全局扫描柔化、颗粒、压缩、低清和旧印刷扩散不能作为连续柔和渲染证据。闭合线稿、平面固有色和大范围 1-2 层硬边阴影同时成立时判为赛璐璐/平涂，局部腮红、鼻尖、窄条发丝高光不改变结论；只有皮肤、头发、服装中至少两类材质在轮廓内部都有大面积连续明暗且非扫描模糊造成时，才可写线稿保留型柔和渲染。厚涂必须同时有线稿明显弱化或可见笔刷肌理以及大区域连续混色，否则禁止折中词。手绘不均匀轮廓、棱角化旧式造型、有限色盘、1-2 层硬边阴影、简化手绘背景、扫描柔化或模拟颗粒中至少三项一致时，锁定传统赛璐璐/OVA 旧式语言，正向 prompt 禁止现代日系立绘、现代数字插画、现代手游立绘、高清网漫等覆盖词；高分辨率本身不是现代证据。',
    '动漫画师锚点+笔触词：必须锁定画风锚点（赛璐璐/半厚涂/厚涂/水彩/水墨/国风线描融合/平涂等），并给出 3-6 个来自画面证据的笔触词（块面塑造、柔和高光、无明显黑线稿、扫描网点、湿边晕染、硬边平涂、厚涂笔触堆叠等），不得用"精细画风"等空词代替。画师/工作室只作可选锚点：至少 3 项画风证据加置信度，最多 1 个专名，中文写法；证据不足完全省略。角色/IP 专名需至少 3 项独立身份锚点（发色发型、脸部/眼部结构、标志服装配色、专属道具、可识别场景）一致且无硬冲突才可写；冲突时删除改写为原创。',
    '动漫构图与光色：互斥景别（禁止中近景全身、半身全身）；只有关键接触、交叉或复杂遮挡的手臂才展开起点、路径、落点和遮挡，普通手臂保持简洁；极端面部特写不得虚构全身、服装或场景。光色先锁定固有色再写偏色限定区域；肤色默认一句写固有色相、明度和阴影倾向，只有显著环境染色时才扩展偏色边界。动漫情绪只能由眉形、眼睑压力、视线、嘴角和嘴唇状态推导；服装、红唇、道具或场景不能单独推出妩媚、挑逗或危险。',
    '【profile C · 海报设计 poster_design】字段：image_type:图像类型、style_reference:风格参考线索、style_filter:风格与滤镜、composition:版式/构图、subject:主体/主视觉、subject_visibility:主体可见性、focal_points:局部视觉焦点、clarity_occlusion:清晰度/遮挡地图、layout_map:版式结构地图、graphic_elements:图形元素功能、typography:字体与文字、hierarchy:版式层级、visual_weight:视觉权重、negative_space:留白关系、material:材质、color_system:色彩系统、generation_priority:生成优先级、failure_risks:失败风险、negative_constraints:负向约束。不能只反推元素清单：必须输出视觉控制机制（主体可见性、遮挡关系、清晰度分布、局部焦点、图形元素功能、文字权重、材质作用区）和版式结构地图（画幅、标题区/主视觉区/信息区/边缘标注区位置与占比、对齐、留白、图层前后顺序、阅读动线）。真人时尚海报用摄影人像字段为主、借用海报控制字段；文字只描述层级、位置、字重和遮挡功能，不复刻文案。毛玻璃、柔焦遮挡、扫描层、半透明蒙版、窗口化局部清晰必须写清哪些区域清晰、哪些被遮挡、哪些只是残影，不泛化成普通滤镜；局部窗口或线框要说明是装饰框、信息标注、扫描界面、局部可视窗口还是局部锐化框。',
    '【profile D · 商业产品 commercial_product】字段：physical_medium:实物媒介、scale_cues:尺度线索、manufacturing_evidence:制造与装配证据、articulation_system:可动关节系统（有证据时）、product_subject:产品主体、product_structure:产品结构、silhouette_topology:轮廓与拓扑、material_identity:材质本体、product_finish:产品表面工艺、surface_finish:表面状态、wear_distribution:损伤分布、selling_point:卖点表达、brand_mood:品牌气质、materials_details:材质细节、lighting_render:布光与渲染、arrangement:摆放关系、background:背景结构、usage_context:使用场景、postproduction_quality:后期完成度、generation_priority:生成优先级、failure_risks:失败风险。布光写软硬、方向、反射与高光控制；表面工艺写基材、粗糙度、光泽、厚薄、透光、边缘和缺陷分布；不虚构品牌与型号。',
    '【profile E · 静物棚拍 product_still】字段：physical_medium:实物媒介、scale_cues:尺度线索、manufacturing_evidence:制造与装配证据、articulation_system:可动关节系统（有证据时）、subject:主体身份、silhouette_topology:轮廓与拓扑、material_identity:材质本体、surface_finish:表面状态、wear_distribution:损伤分布、surface:台面与承载面、arrangement:摆放关系、set_props:布景与陈设、materials_details:材质细节、lighting_style:整体布光、depth_of_field:景深关系、background:背景结构、color_system:色彩系统、grain:颗粒与噪点、negative_constraints:负向约束。重点写实物尺度、制造装配、可见关节、物体接触投影、材料反射、表面连续区和局部损伤。',
    '【profile F · 空间风景 space_landscape】字段：scene:场景设定、composition:构图方式、subject_occupancy:主体占位、architecture:建筑与空间、architecture_geometry:建筑相对几何、spatial_layout_map:空间布局地图、environment:环境氛围、foreground:前景层、midground:中景层、background:背景层、spatial_depth:空间层次、perspective:透视关系、lighting_style:整体布光、tonal_map:明暗区域地图、exposure_map:曝光分布、color_system:色彩系统、texture:材质纹理、detail_density:细节密度、negative_constraints:负向约束。先定空间类型与视角，再用画布百分区间记录主体包围框、建筑总宽高比、中央体量相对大小、两翼与窗列节奏、前中后景边界和九宫格明暗关系。',
    '【profile G · 界面信息图 ui_infographic】字段：component_style:组件风格、layout_system:布局系统、information_hierarchy:信息层级、typography:字体与文字、graphic_elements:图形元素功能、color_system:色彩系统、visual_weight:视觉权重、negative_space:留白关系、usage_context:使用场景、negative_constraints:负向约束。描述层级、网格、组件样式与信息密度，不复刻具体文案。',
    '【profile H · 混合视觉 mixed_other】字段：style_reference:风格参考线索、style_filter:风格与滤镜、render_medium:数字渲染媒介、render_signature:渲染签名、asset_presentation:资产展示方式、composition:构图方式、framing:景别与取景、subject_occupancy:主体占位、negative_space:负空间、focal_points:核心视觉焦点、subject_visibility:主体可见性、layer_stack:图层遮挡顺序、subject:主体身份、silhouette_topology:轮廓与拓扑、stylization_geometry:风格化几何、skin_shader:数字皮肤着色、material_identity:材质本体、surface_finish:表面状态、wear_distribution:损伤分布、scene_background:场景与背景、foreground:前景、midground:中景、background:背景、lighting_style:整体布光、tonal_map:明暗区域地图、exposure_map:曝光分布、light_color:光线与色彩、color_system:色彩系统、materials_details:材质细节、rendering:渲染方式、sharpness:锐度、generation_priority:生成优先级、failure_risks:失败风险、negative_constraints:负向约束。先定主导视觉机制，借用次级类型最多 1-3 个必要控制字段。出现实体模型与可动关节证据时退出本类型并路由 product_still。出现三维、游戏角色或数字渲染证据时锁定数字媒介、渲染签名和曝光分布；只有皮肤、眼球或面部表面清楚可见时才输出数字皮肤着色。剪影图必须优先记录大光形、主体可见性、轮廓流动和图层遮挡。',
    '【高反差剪影取证】主体内部接近纯黑且五官、服装和材质小件不可辨时，不推断性别、冠饰、护甲、薄纱、腰饰、皮肤着色或隐藏衣层。先锁定可识别的大光形及其中心位置、画布占比、边界形状和与主体的重叠，再按画面坐标记录头部轮廓、手臂姿态、发丝与衣带的流向和终点。可识别的月盘必须明确写月盘，不能泛化为体积光。下方暗带只有出现连续镜像和波纹时才命名为水面。',

    // ── 门控规则（硬规则）──
    '【画幅单声明门控】画幅由本地读取的原图像素宽高确定。全篇只声明一次实测比例，后续字段不得再写不同比例或约数。prompt 把画幅放在最开头，主体姿态、视觉重心和模型猜测均不能覆盖像素比例。',
    '【成像质感优先门控】只有原图全局低清/泛朦且脸部主体也不清晰时，才允许在画幅后加"成像质感优先"一句；胶片颗粒、轻微噪点、暗角、前景虚化、背景虚化、柔焦美颜、局部压缩一律不算，严禁标注。',
    '【动态负向约束】负向约束基于当前图片真实原型动态生成 2-5 条具体跑偏风险，禁止照抄固定词表；原图本身具有的特征不能列为负向约束——原图已是该风格时应写"避免相反偏差"；负向约束放 prompt 末尾，用"避免……"句式紧凑表达；没有明确风险时写无额外负向约束。真人脸部负向根据原型生成：原图是萌系、幼态、圆脸、短下巴、大眼或甜美风格时严禁反萌系约束；成熟锐利脸才可约束幼态化。动漫常见跑偏风险如现代手游立绘化、默认萌系大眼、柔滑渐变覆盖硬边阴影、真人 COS、3D 塑料感、人物正中站桩、纸纹覆盖五官或辅助风格升级成全局主风格。',
    '【残影人物表情】只要画面有人物、人脸、人眼、嘴唇、手势或人体局部——即使只是背景残影——也必须拆解表情凝视：眼神方向、眼睛开合、上眼睑压力、嘴部状态、手与脸部关系、情绪气质。残影视线方向是复现构图叙事的关键证据。',
    '【字段反合并】profile 列出的细字段各自独立成栏：人像类身形轮廓、皮肤固有色、皮肤局部曝光、皮肤成像处理、服装贴合度和服装材质不得并入主体或造型；数字角色的媒介、资产展示、风格化几何和皮肤着色不得并入写实风格词；空间建筑的相对几何、布局地图和明暗地图不得并入场景名称；动漫类脸部风格锁定、眼型瞳孔、眉形眼神、嘴部唇色、脸部负向不得互相并入；海报类版式结构地图、清晰度遮挡地图、图形元素功能、生成优先级不得互相并入。无证据字段省略，但省略不等于合并。',

    // ── prompt 重组 ──
    '【prompt 重组】prompt 按六至九个短段重组，固定顺序为画幅与媒介、核心光形与图层、相机与构图、主体与占位、动作接触、服装道具、场景光色、成像质感、失败防线。高反差剪影先写大光形、主体遮挡和主轮廓流动，隐藏材质不进入 prompt。真实人像的面部、身形和皮肤三层放入主体段。数字人物仅把像素可见的数字几何和表面写入媒介与主体段。空间建筑的布局与相对几何放入构图段。实体可动模型的制造材质、关节和分件放入主体段。每项事实只写一次，局部题材词不能压过主要视觉结构。',
    'breakdown 保存完整取证和不确定性说明，prompt 只保留模型可执行的确定事实。无法确认、不能判定、未观察到、证据不足、具体身份未知等审校文字禁止进入 prompt；可见遮挡改写为直接事实，失败风险改写成简短的“避免……”指令。',
    '原图像素比例不属于常用整数画幅时，prompt 以方向、约数比例和原图像素尺寸表达，例如“横向宽幅，比例约1.91:1，原图像素2048×1071”。构图、主体占位、核心光形、主轮廓方向、关键接触和区域光色优先，删除推测过程和同义复述。',
    'prompt 使用高还原简体中文，只保留一个画幅比例并放在最前面。完整句使用句号，并列短项使用分号。禁止句号后紧接分号、连续句号、连续分号、空段和同义句重复。避免品牌、水印、平台界面和来源描述。比例、数字与 HEX 色值可以保留。',
    actionRule,
    paletteRule,
    promptPrecisionRule,
    '【输出前硬冲突审计】逐项检查并改写：复古/旧式与现代数字语言不能并存；赛璐璐与大范围连续柔和明暗不能并存；互斥景别不能并存；表面连续平滑与全局粗糙腐朽不能并存；单侧薄壳与完整翅翼不能混写；实体可动模型与连续有机生物不能混写；可见关节与无关节整体雕塑不能混写；造型类比与实体材质不能互相替代；正向风格与负向约束不得自相矛盾；专名与可见特征冲突时删除。',
    variantRule
  ].join('\n');
}

function extractLlmText(data) {
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map(item => item?.text || item?.content || '').join('');
  if (typeof data?.output_text === 'string') return data.output_text;
  if (Array.isArray(data?.output)) return data.output.flatMap(item => item?.content || []).map(item => item?.text || '').join('');
  return '';
}

function makeReverseOutputFormatError(detail = '') {
  const error = new Error(`模型返回结构异常${detail ? `：${detail}` : ''}，已阻止原始 JSON 片段进入画面解构和词库`);
  error.code = 'REVERSE_OUTPUT_FORMAT';
  return error;
}

function looksLikeSerializedReversePayload(value) {
  const text = String(value || '').trim();
  if (!text) return false;
  const structureHits = ['imageType', 'breakdown', 'prompt', 'variantPrompt']
    .filter(key => new RegExp(`(?:^|[,{\\s\"'])${key}(?:[\"']|\\s|:|$)`, 'i').test(text)).length;
  const jsonFieldHits = (text.match(/(?:^|[,\[{])\s*["']?(?:key|label|value|imageType|breakdown|prompt|variantPrompt)["']?\s*[:：]/gi) || []).length;
  return (/[{}\[\]]/.test(text) && structureHits >= 2) || jsonFieldHits >= 2;
}

function contaminatedBreakdownEntry(entry) {
  const labelToken = String(entry?.label || '').toLowerCase().replace(/[^a-z]/g, '');
  if (['key', 'label', 'value', 'imagetype', 'breakdown', 'prompt', 'variantprompt'].includes(labelToken)) return true;
  return looksLikeSerializedReversePayload(entry?.label) || looksLikeSerializedReversePayload(entry?.value);
}

function parseReverseJsonCandidate(text) {
  const candidates = [];
  const append = candidate => {
    const value = String(candidate || '').trim();
    if (value && !candidates.includes(value)) candidates.push(value);
  };
  append(text);
  append(String(text || '').replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, ''));
  const start = String(text || '').indexOf('{');
  const end = String(text || '').lastIndexOf('}');
  if (start >= 0 && end > start) append(String(text || '').slice(start, end + 1));
  for (const candidate of candidates) {
    const variants = [candidate];
    const normalized = candidate.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/,\s*([}\]])/g, '$1');
    if (normalized !== candidate) variants.push(normalized);
    for (const variant of variants) {
      try {
        const parsed = JSON.parse(variant);
        if (typeof parsed === 'string' && looksLikeSerializedReversePayload(parsed)) {
          try { return JSON.parse(parsed); } catch {}
        }
        return parsed;
      } catch {}
    }
  }
  return null;
}

function parseReverseOutput(rawText) {
  const text = String(rawText || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  let parsed = parseReverseJsonCandidate(text);
  if (!parsed || typeof parsed !== 'object') {
    if (looksLikeSerializedReversePayload(text)) throw makeReverseOutputFormatError('JSON 无法完整解析');
    const prompt = extractLabeledSection(text, ['完整提示词', '最终提示词', 'prompt']);
    const variantPrompt = extractLabeledSection(text, ['变体提示词', 'variant prompt']);
    const breakdownText = text.slice(0, Math.max(0, text.indexOf(prompt || '\u0000')) || text.length);
    const breakdown = breakdownText.split(/\n+/).map((line, index) => {
      const match = line.match(/^\s*(?:[-*\d.、]+\s*)?([^:：]{2,30})[:：]\s*(.+)$/);
      if (!match) return null;
      const entry = { key: `detail_${index + 1}`, label: match[1].trim(), value: match[2].trim() };
      return contaminatedBreakdownEntry(entry) ? null : entry;
    }).filter(Boolean);
    parsed = { imageType: {}, breakdown, prompt: prompt || text, variantPrompt };
  }
  const breakdown = globalThis.FinnBreakdownLabels.normalizeBreakdown(parsed.breakdown);
  const prompt = normalizeGeneratedPrompt(parsed.prompt || parsed.integratedPrompt || parsed.finalPrompt || '');
  const variantPrompt = normalizeGeneratedPrompt(parsed.variantPrompt || parsed.variant_prompt || parsed.variant || '');
  if (breakdown.some(contaminatedBreakdownEntry) || looksLikeSerializedReversePayload(prompt) || looksLikeSerializedReversePayload(variantPrompt)) {
    throw makeReverseOutputFormatError('检测到序列化字段混入内容');
  }
  if (!prompt) throw new Error('模型响应中没有可用的完整提示词');
  if (!breakdown.length) throw new Error('模型响应中没有可用的视觉拆解');
  return { imageType: normalizeReverseImageType(parsed.imageType || parsed.image_type), breakdown, prompt, variantPrompt };
}

async function parseReverseOutputWithRepair(rawText, settings = state.settings) {
  try {
    return parseReverseOutput(rawText);
  } catch (error) {
    if (error?.code !== 'REVERSE_OUTPUT_FORMAT') throw error;
    const response = await requestVisionCompletion({
      model: settings.model,
      messages: [
        {
          role: 'system',
          content: '你是 JSON 结构修复器。只修复语法和字段层级，不改写、不删减、不扩写任何视觉事实。仅输出一个合法 JSON 对象，必须含 imageType、breakdown、prompt，可选 variantPrompt。breakdown 必须是对象数组，每项只含 key、label、value。禁止 Markdown 代码块和解释文字。'
        },
        { role: 'user', content: String(rawText || '') }
      ],
      temperature: 0,
      max_tokens: 12000,
      stream: false
    }, settings, 120000);
    if (response?.aborted) throw makeFbaseAbortError();
    if (!response?.ok) throw makeReverseOutputFormatError('自动修复请求失败');
    try {
      return parseReverseOutput(extractLlmText(response.data));
    } catch {
      throw makeReverseOutputFormatError('自动修复后仍未形成合格结构');
    }
  }
}

function extractLabeledSection(text, labels) {
  const pattern = labels.map(label => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const match = String(text || '').match(new RegExp(`(?:${pattern})\\s*[:：]\\s*([\\s\\S]+?)(?=\\n\\s*(?:变体提示词|variant prompt)\\s*[:：]|$)`, 'i'));
  return match?.[1]?.trim() || '';
}

function normalizeGeneratedPrompt(value) {
  return String(value || '').replace(/^\s*(?:完整提示词|最终提示词|prompt|变体提示词|variant prompt)\s*[:：]\s*/i, '').trim();
}

// 中文提示词中允许保留的英文词（品牌 / 单位 / 技术缩写 / 平台名）
const ENGLISH_TOKEN_WHITELIST = new Set([
  'logo', 'app', 'ui', 'ux', 'ai', 'ps', 'ar', 'vr', 'xr', 'led', 'oled', 'lcd', 'cm', 'mm', 'kv', 'cg', 'ip',
  'gif', 'png', 'jpg', 'jpeg', 'pdf', 'psd', 'url', 'http', 'https', 'www', 'com',
  'bokeh', 'lofi', 'pop', 'art', 'ot', 'ok', 'pk', 'kt', 'uv',
  'midjourney', 'sdxl', 'flux', 'lora', 'figma', 'photoshop', 'illustrator',
  'iphone', 'ipad', 'macbook', 'imac', 'airpods', 'nike', 'adidas', 'chanel', 'dior', 'gucci', 'zara', 'uniqlo',
  'instagram', 'pinterest', 'behance', 'dribbble', 'unsplash', 'youtube', 'tiktok', 'bilibili',
  'wechat', 'weibo', 'douyin', 'facebook', 'twitter', 'google', 'chrome', 'windows',
  'hd', 'uhd', 'sd', 'xl', 'xxl', 'max', 'pro', 'plus', 'ultra', 'mini'
]);

function collectEnglishTokens(value) {
  const text = String(value || '')
    .replace(/https?:\/\/\S+/gi, ' ')   // 网址
    .replace(/#[0-9a-fA-F]{3,8}/g, ' '); // HEX 色值（#FFFFFF 等）
  const tokens = text.match(/[A-Za-z]{2,}/g) || [];
  return [...new Set(tokens.map(token => token.toLowerCase()))].filter(token => !ENGLISH_TOKEN_WHITELIST.has(token));
}

function generatedPromptContainsEnglish(value) {
  const tokens = collectEnglishTokens(value);
  if (!tokens.length) return false;
  // 少量短词（≤2 个、每个 ≤6 字母）视为品牌名/单位/缩写，不算"英文提示词"
  if (tokens.length <= 2 && tokens.every(token => token.length <= 6)) return false;
  return true;
}

// ===== 统一 AI 调用层 =====
// 润色、改写、对话、评估等智能功能共用：统一通道解析、system prompt 注册表、瞬时错误重试、宽松 JSON 解析。
// 新增智能功能时：往 AI_PROMPT_LIBRARY 加模板，然后 aiChat()/aiJson() 一行调用即可。

const AI_PROMPT_LIBRARY = {
  chineseRewrite: '你是 F·BASE 中文提示词重写器。把输入中的主提示词和已有变体提示词改写成流畅、连续、可直接生图的简体中文。删除英文单词和中英混写，保留主体、构图、动作、镜头、光线、色彩、材质、版式和失败防护信息。输入变体为空时继续返回空字符串。只返回 JSON：{"prompt":"...","variantPrompt":"..."}',
  xiezhenAdaptation: '你是 F·BASE 视觉提示词编译器。依据 faithfulPrompt 与 evidenceBreakdown 按 userRequest 和 outputGuide 交付可直接使用的中文提示词。用户明确修改的内容优先，其他关键视觉特征延续参考。风格选择控制光线、色彩和质感，不自动替换脸型、肤色或服装。系列按用户数量交付，未指定时三张；母版只给简洁可复制设定，不声称永久保存；试方向时每个方案独立可用。成年人物体态调整通过体量、轮廓、身体比例与服装受力表达，露肤程度独立控制。去除重复和低影响信息，不追加拆解、菜单或署名，除非用户要求。只返回 JSON：{"prompt":"中文提示词"}',
  resultAssistant: '你是 F·BASE 提示词编辑器。基于 currentPrompt、faithfulPrompt 和 breakdown 工作，不重新猜测图片。userInstruction 明确要求的修改优先，其余关键特征延续当前版本。local 按用户要求修改；compact 精简重复与低影响描述；faithful 补回遗漏的参考特征；texture 修正质感；audit 检查冲突遗漏。series_master 提炼可复制系列设定，不声称永久保存；series_variant 输出用户要求数量的同系列完整提示词，未指定时三张；lottery 给三个独立可用的短方向。存在 outputGuide 时结合执行。改变风格不自动替换人物身份、肤色或服装。成年人物胸部调整通过体量、轮廓、身体比例和服装受力表达，露肤程度独立控制。不要无依据改变其他特征，不自动加署名。保留分段，用简洁中文。只返回 JSON：{"prompt":"完整可用的提示词或分段方案","summary":"一句说明","changes":["必要变更"]}'
};

async function requestVisionCompletion(body, settings = state.settings, timeout = 185000) {
  const gateway = await runtimeSend({
    type: 'KBASE_FETCH',
    url: `${normalizeLibraryEndpoint(settings.libraryEndpoint)}/api/ai/chat`,
    method: 'POST',
    timeout,
    body: {
      task: 'vision',
      messages: Array.isArray(body?.messages) ? body.messages : [],
      temperature: body?.temperature,
      max_tokens: body?.max_tokens,
      timeout
    }
  });
  if (gateway?.ok || Number(gateway?.status) !== 0 || !usableClientSecret(settings.apiKey)) return gateway;
  return runtimeSend({
    type: 'LLM_FETCH',
    url: normalizeLlmEndpoint(settings.llmEndpoint),
    method: 'POST',
    timeout,
    apiKey: settings.apiKey,
    body
  });
}

// task 'vision' = 反推配置；task 'assistant' = 助手模型，未配置时回落反推配置
function resolveAiChannel(task, settings = state.settings) {
  if (task === 'assistant' && settings.assistantModel) {
    return { endpoint: settings.llmEndpoint, apiKey: settings.apiKey, model: settings.assistantModel };
  }
  return { endpoint: settings.llmEndpoint, apiKey: settings.apiKey, model: settings.model };
}

function isTransientAiError(response) {
  const status = Number(response?.status || 0);
  return status === 429 || status === 502 || status === 503 || status === 504;
}

function buildAiMessages(system, user, imageDataUrl) {
  const messages = [];
  if (system) messages.push({ role: 'system', content: system });
  if (imageDataUrl) {
    messages.push({
      role: 'user',
      content: [
        { type: 'text', text: String(user || '') },
        { type: 'image_url', image_url: { url: imageDataUrl } }
      ]
    });
  } else if (user) {
    messages.push({ role: 'user', content: String(user) });
  }
  return messages;
}

/**
 * 统一 AI 对话调用。
 * @param {object} options
 * @param {string} [options.task='assistant'] 通道：'assistant' 或 'vision'
 * @param {string} [options.system] system prompt（可直接引用 AI_PROMPT_LIBRARY 模板）
 * @param {string} [options.user] 用户输入文本
 * @param {string} [options.imageDataUrl] 可选图片（data URL），传入时自动组装多模态消息
 * @param {Array}  [options.messages] 直接传完整 messages，优先于 system/user 组装
 * @param {number} [options.temperature=0.3] [options.maxTokens=4000] [options.timeout=90000] [options.retries=1]
 * @returns {Promise<string>} 模型回复文本
 */
async function aiChat(options = {}) {
  const {
    task = 'assistant', system = '', user = '', imageDataUrl = '', messages = null,
    temperature = 0.3, maxTokens = 4000, timeout = 90000, retries = 1,
    settings = state.settings
  } = options;
  const finalMessages = messages || buildAiMessages(system, user, imageDataUrl);
  const channel = resolveAiChannel(task, settings);
  const hasLocalConfig = Boolean(channel.endpoint && usableClientSecret(channel.apiKey) && channel.model);

  // 优先走后端 AI 网关（密钥不离开后端）；后端未启动或网关不可用时回落直连
  const gatewayRequest = {
    type: 'KBASE_FETCH',
    url: `${normalizeLibraryEndpoint(settings.libraryEndpoint)}/api/ai/chat`,
    method: 'POST',
    timeout,
    body: { task, messages: finalMessages, temperature, max_tokens: maxTokens, timeout }
  };
  const directRequest = {
    type: 'LLM_FETCH',
    url: normalizeLlmEndpoint(channel.endpoint),
    method: 'POST',
    timeout,
    apiKey: channel.apiKey,
    body: {
      model: channel.model,
      messages: finalMessages,
      temperature,
      max_tokens: maxTokens,
      stream: false
    }
  };

  const runOnce = async () => {
    const gateway = await runtimeSend(gatewayRequest);
    if (gateway?.ok) return gateway;
    // status 0 = 后端不可达（未启动/连接拒绝），回落直连；其余错误（后端已应答）直接采用
    if (Number(gateway?.status) === 0 && hasLocalConfig) {
      return runtimeSend(directRequest);
    }
    return gateway;
  };

  let response = await runOnce();
  // 限流/网关抖动等瞬时错误自动重试，间隔递增
  for (let attempt = 0; attempt < retries; attempt += 1) {
    if (response?.ok || !isTransientAiError(response)) break;
    await new Promise(resolve => setTimeout(resolve, 1500 * (attempt + 1)));
    response = await runOnce();
  }
  if (!response?.ok) {
    if (!hasLocalConfig && Number(response?.status) === 0) {
      throw new Error('本机 F·BASE 服务未启动，且扩展内未配置 AI 直连参数。请启动后端（打开词库）或在设置中填写 API 配置');
    }
    throw makeRequestError(response, Boolean(imageDataUrl));
  }
  return extractLlmText(response.data);
}

// 宽松解析模型返回的 JSON（容忍 markdown 代码块包裹与前后杂文）
function parseAiJson(text) {
  const cleaned = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  try { return JSON.parse(cleaned); }
  catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start < 0 || end <= start) throw new Error('模型没有返回可识别的 JSON 结果');
    return JSON.parse(cleaned.slice(start, end + 1));
  }
}

// aiChat 的 JSON 版：要求模型返回 JSON 并解析为对象
async function aiJson(options = {}) {
  const text = await aiChat(options);
  return parseAiJson(text);
}

const RESULT_ASSISTANT_ACTIONS = {
  compact: { label: '精简', description: '删除重复描述、空泛质量词和标点噪声，同时保留全部视觉锚点。' },
  faithful: { label: '保真增强', description: '依据忠实原稿与画面解构补回当前提示词遗漏的关键视觉锚点。' },
  texture: { label: '质感修复', description: '重点校正媒介、采集感、皮肤反射、光质、颗粒、锐度和材质关系。' },
  local: { label: '调整一下', description: '直接说想怎么改，也可以说再来三张或试三个方向。' },
  series_master: { label: '保持这个感觉', description: '满意后提炼系列设定，可复制复用。' },
  series_variant: { label: '继续做一组', description: '延续当前风格，默认给三张独立可用的提示词。' },
  lottery: { label: '试三个方向', description: '先看三个简短方案，选好后再细化。' },
  audit: { label: '提示词体检', description: '检查冲突、遗漏、重复和模型难执行的表达，并生成清理稿。' }
};

function openResultAssistant() {
  if (state.assistantRunning) return;
  const prompt = generationPromptSource(state.promptMode);
  if (!prompt) {
    setStatus('当前页签还没有可处理的提示词', 'error');
    return;
  }
  state.assistantDraft = null;
  state.assistantRunning = false;
  state.assistantMessage = '';
  renderResultAssistant();
  if (typeof el.resultAssistantDialog?.showModal === 'function') el.resultAssistantDialog.showModal();
}

function renderResultAssistant() {
  if (!el.resultAssistantDialog) return;
  const action = RESULT_ASSISTANT_ACTIONS[state.assistantAction] || RESULT_ASSISTANT_ACTIONS.compact;
  const prompt = generationPromptSource(state.promptMode);
  el.resultAssistantMeta.textContent = `${promptModeLabel()} · ${action.description}`;
  el.resultAssistantCurrentLabel.textContent = promptModeLabel();
  el.resultAssistantCurrentPrompt.textContent = prompt || '当前没有提示词';
  el.resultAssistantActions.querySelectorAll('[data-assistant-action]').forEach(button => {
    button.classList.toggle('active', button.dataset.assistantAction === state.assistantAction);
    button.disabled = state.assistantRunning;
  });
  el.runResultAssistantButton.disabled = state.assistantRunning || !prompt;
  el.runResultAssistantButton.textContent = state.assistantRunning ? '正在生成调整稿…' : `生成${action.label}调整稿`;
  el.resultAssistantInstruction.disabled = state.assistantRunning;
  el.resultAssistantStatus.textContent = state.assistantRunning ? '助手模型正在处理当前文字' : state.assistantMessage;
  const draft = state.assistantDraft;
  el.resultAssistantOutput.classList.toggle('hidden', !draft);
  if (draft) {
    el.resultAssistantSummary.textContent = draft.summary || `${action.label}完成`;
    el.resultAssistantPrompt.textContent = draft.prompt;
    el.resultAssistantChanges.replaceChildren(...(draft.changes || []).slice(0, 6).map(change => {
      const span = document.createElement('span');
      span.textContent = change;
      return span;
    }));
  }
  renderResultAssistantRevisions();
}

function renderResultAssistantRevisions() {
  if (!el.resultAssistantRevisions) return;
  const revisions = Array.isArray(state.result?.assistantRevisions) ? state.result.assistantRevisions : [];
  el.resultAssistantRevisionCard.classList.toggle('hidden', !revisions.length);
  el.resultAssistantRevisions.replaceChildren(...revisions.slice(-6).reverse().map((revision, reverseIndex) => {
    const index = revisions.length - 1 - reverseIndex;
    const row = document.createElement('div');
    row.className = 'assistant-revision-row';
    const copy = document.createElement('div');
    const strong = document.createElement('strong');
    strong.textContent = revision.label || '小助手调整稿';
    const small = document.createElement('small');
    small.textContent = `${promptModeLabel(revision.promptMode)} · ${new Date(revision.createdAt || Date.now()).toLocaleString()}`;
    copy.append(strong, small);
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.assistantRestore = String(index);
    button.textContent = '恢复';
    row.append(copy, button);
    return row;
  }));
}

async function runResultAssistant() {
  if (state.assistantRunning || !state.result) return;
  const currentPrompt = generationPromptSource(state.promptMode);
  const userInstruction = el.resultAssistantInstruction.value.trim();
  if (!currentPrompt) {
    setStatus('当前页签还没有可处理的提示词', 'error');
    return;
  }
  const intent = globalThis.FBaseXiezhenAssets.resolveIntent(userInstruction, { xiezhenTemplate: 'detailed', aestheticPreset: 'faithful' });
  const action = intent.xiezhenTemplate !== 'detailed' ? intent.xiezhenTemplate : state.assistantAction;
  const sourceResult = state.result;
  const sourceMode = state.promptMode;
  if (action === 'local' && !userInstruction) {
    el.resultAssistantStatus.textContent = '写一句想怎么调整，例如：明亮柔和一点。';
    el.resultAssistantInstruction.focus();
    return;
  }
  state.assistantRunning = true;
  state.assistantDraft = null;
  state.assistantMessage = '';
  renderResultAssistant();
  try {
    const response = await aiJson({
      task: 'assistant',
      system: AI_PROMPT_LIBRARY.resultAssistant,
      user: JSON.stringify({
        mode: action,
        outputGuide: globalThis.FBaseXiezhenAssets.creativeGuide(intent.aestheticPreset, ['series_master', 'series_variant', 'lottery'].includes(action) ? action : 'detailed'),
        currentPrompt,
        faithfulPrompt: String(state.result.reversePromptFull || state.result.reversePrompt || '').trim(),
        breakdown: (state.result.breakdown || []).map(item => ({ key: item.key, label: item.label, value: item.value })),
        userInstruction
      }),
      temperature: action === 'local' ? 0.15 : 0.2,
      maxTokens: 5000
    });
    if (state.result !== sourceResult || state.promptMode !== sourceMode || generationPromptSource(sourceMode) !== currentPrompt) {
      state.assistantMessage = '当前任务或提示词已变化，请重新发起调整。';
      return;
    }
    const prompt = String(response?.prompt || '').trim();
    if (!prompt) throw new Error('助手模型没有返回有效调整稿');
    state.assistantDraft = {
      prompt,
      summary: String(response?.summary || '').trim(),
      changes: Array.isArray(response?.changes) ? response.changes.map(item => String(item || '').trim()).filter(Boolean) : [],
      action,
      sourceAnalysisId: sourceResult.analysisId,
      sourceMode,
      sourcePrompt: currentPrompt,
      instruction: userInstruction
    };
    state.assistantMessage = '调整稿已生成，应用前可先检查';
  } catch (error) {
    state.assistantMessage = error.message || '小助手处理失败';
  } finally {
    state.assistantRunning = false;
    renderResultAssistant();
  }
}

async function copyResultAssistantDraft() {
  const prompt = String(state.assistantDraft?.prompt || '').trim();
  if (!prompt) return;
  await copyText(prompt);
  state.assistantMessage = '调整稿已复制';
  renderResultAssistant();
}

function assignPromptModeValue(kind, value) {
  if (kind === 'xiezhen') state.result.xiezhenPrompt = value;
  else if (kind === 'variant') state.result.variantPrompt = value;
  else {
    state.result.reversePrompt = value;
    state.result.generationPrompt = value;
  }
  if (state.pendingImport?.analysis) {
    if (kind === 'xiezhen') state.pendingImport.analysis.xiezhenPrompt = value;
    else if (kind === 'variant') state.pendingImport.analysis.variantPrompt = value;
    else {
      state.pendingImport.analysis.reversePrompt = value;
      state.pendingImport.analysis.generationPrompt = value;
    }
  }
}

async function applyResultAssistantDraft() {
  const draft = state.assistantDraft;
  if (!draft?.prompt || !state.result) return;
  if (draft.sourceAnalysisId !== state.result.analysisId || draft.sourceMode !== state.promptMode || draft.sourcePrompt !== generationPromptSource(state.promptMode)) {
    state.assistantDraft = null;
    state.assistantMessage = '当前任务或提示词已变化，请重新发起调整。';
    renderResultAssistant();
    return;
  }
  const before = generationPromptSource(state.promptMode);
  const action = RESULT_ASSISTANT_ACTIONS[draft.action] || RESULT_ASSISTANT_ACTIONS.compact;
  const revisions = Array.isArray(state.result.assistantRevisions) ? state.result.assistantRevisions : [];
  revisions.push({
    id: `assistant-${Date.now().toString(36)}`,
    promptMode: state.promptMode,
    label: action.label,
    instruction: draft.instruction || '',
    before,
    after: draft.prompt,
    createdAt: Date.now()
  });
  state.result.assistantRevisions = revisions.slice(-20);
  assignPromptModeValue(state.promptMode, draft.prompt);
  await syncResultEdits();
  renderResult(state.result);
  state.assistantDraft = null;
  state.assistantMessage = `${action.label}调整稿已应用，原版本已保留`;
  renderResultAssistant();
  setStatus(`${action.label}调整稿已应用，原版本已保留`, 'success');
}

async function restoreAssistantRevision(index) {
  const revision = state.result?.assistantRevisions?.[index];
  if (!revision?.before) return;
  const current = generationPromptSource(revision.promptMode);
  state.result.assistantRevisions.push({
    id: `assistant-restore-${Date.now().toString(36)}`,
    promptMode: revision.promptMode,
    label: '恢复版本',
    instruction: '',
    before: current,
    after: revision.before,
    createdAt: Date.now()
  });
  state.result.assistantRevisions = state.result.assistantRevisions.slice(-20);
  assignPromptModeValue(revision.promptMode, revision.before);
  state.promptMode = revision.promptMode;
  await syncResultEdits();
  renderResult(state.result);
  state.assistantMessage = '已恢复所选提示词版本';
  renderResultAssistant();
  setStatus('已恢复所选提示词版本', 'success');
}

async function rewritePromptsInChinese(parsed, settings = state.settings) {
  const rewritten = await aiJson({
    task: 'assistant',
    system: AI_PROMPT_LIBRARY.chineseRewrite,
    user: JSON.stringify({ prompt: parsed.prompt, variantPrompt: parsed.variantPrompt }),
    temperature: 0.1,
    maxTokens: 3500,
    settings
  });
  const prompt = normalizeGeneratedPrompt(rewritten.prompt);
  const variantPrompt = normalizeGeneratedPrompt(rewritten.variantPrompt || rewritten.variant_prompt || '');
  if (!prompt) return parsed; // 重写结果为空 → 保留原版，不报废整个反推
  const rewrittenLeft = collectEnglishTokens(prompt).length + collectEnglishTokens(variantPrompt).length;
  const originalLeft = collectEnglishTokens(parsed.prompt).length + collectEnglishTokens(parsed.variantPrompt).length;
  // 重写版更干净才采用；剩余"英文"多为品牌名时保留原版，绝不因英文报错中断
  if (!rewrittenLeft || rewrittenLeft < originalLeft) return { ...parsed, prompt, variantPrompt };
  return parsed;
}

function shouldCreateXiezhenPrompt(quickSettings = state.quickSettings) {
  return quickSettings.xiezhenTemplate !== 'detailed' || quickSettings.aestheticPreset !== 'faithful';
}

function hydrateFaithfulXiezhenPrompt(result) {
  // Existing saved drafts remain available; ordinary results need no duplicate.
  return result;
}

async function createXiezhenPrompt(parsed, quickSettings, settings = state.settings, inputText = '') {
  const assets = globalThis.FBaseXiezhenAssets;
  if (!assets || !shouldCreateXiezhenPrompt(quickSettings)) return null;
  const template = assets.getTemplate(quickSettings.xiezhenTemplate);
  const preset = assets.getPreset(quickSettings.aestheticPreset);
  const adjusted = await aiJson({
    task: 'assistant',
    system: AI_PROMPT_LIBRARY.xiezhenAdaptation,
    user: JSON.stringify({
      faithfulPrompt: parsed.prompt,
      userRequest: inputText,
      existingVariantPrompt: parsed.variantPrompt || '',
      outputGuide: assets.creativeGuide(preset.id, template.id),
      template: { id: template.id, label: template.label, directive: template.directive },
      aestheticPreset: { id: preset.id, label: preset.label, description: preset.description },
      evidenceBreakdown: (parsed.breakdown || []).map(item => ({ label: item.label, value: item.value }))
    }),
    temperature: 0.15,
    maxTokens: template.id === 'lottery' ? 1800 : 4200,
    timeout: 120000,
    retries: 1,
    settings
  });
  const prompt = normalizeGeneratedPrompt(adjusted.prompt || adjusted.xiezhenPrompt || '');
  if (!prompt) throw new Error('写真调整模型没有返回可用提示词');
  return {
    prompt,
    meta: { templateId: template.id, templateLabel: template.label, presetId: preset.id, presetLabel: preset.label, source: 'llm' }
  };
}

function compileLocalXiezhenPrompt(parsed, quickSettings = state.quickSettings) {
  const assets = globalThis.FBaseXiezhenAssets;
  if (!assets) return null;
  const template = assets.getTemplate(quickSettings.xiezhenTemplate);
  const preset = assets.getPreset(quickSettings.aestheticPreset);
  let prompt = template.id === 'series_variant' && parsed.variantPrompt ? parsed.variantPrompt : parsed.prompt;
  if (template.id === 'lottery') {
    const terms = (parsed.breakdown || []).map(item => String(item.value || '').split(/[。；;]/)[0].trim()).filter(Boolean).slice(0, 18);
    prompt = terms.join('，');
  } else if (template.id === 'series_master') {
    prompt = `${prompt}\n系列固定项：主体身份、核心风格、成像机制、主色关系、人物与镜头比例保持稳定。允许变化项：场景、动作、服装细节和道具可在同一视觉体系内调整。`;
  }
  if (preset.id !== 'faithful') {
    const style = [...preset.styleChain, ...preset.imagingChain].filter(Boolean).join('，');
    prompt = `${prompt}\n审美调整：${preset.description}。${style ? `${style}。` : ''}保持原稿中的画幅、主体几何、肤色、服装颜色、动作和光线证据。`;
  }
  return {
    prompt: globalThis.FBaseReverseMethodology?.normalizePromptPunctuation(prompt) || String(prompt || '').trim(),
    meta: { templateId: template.id, templateLabel: template.label, presetId: preset.id, presetLabel: preset.label, source: 'local' }
  };
}

function normalizeReverseImageType(value) {
  const input = value && typeof value === 'object' ? value : {};
  const labels = {
    photographic_portrait: '摄影人像', anime_illustration: '动漫插画', poster_design: '海报设计',
    commercial_product: '商业产品图', product_still: '产品静物', space_landscape: '空间风景',
    ui_infographic: '界面信息图', mixed_other: '混合视觉'
  };
  const key = Object.hasOwn(labels, input.key) ? input.key : 'mixed_other';
  const confidenceNumber = Number(input.confidence);
  return {
    key,
    label: String(input.label || labels[key]).trim(),
    confidence: Number.isFinite(confidenceNumber) ? Math.max(0, Math.min(1, confidenceNumber)) : 0.65,
    reason: String(input.reason || '').trim()
  };
}

function buildFinnAnalysis(parsed, localEvidence, quickSettings = state.quickSettings, xiezhenOutput = null) {
  const axes = Object.fromEntries(AXIS_ORDER.map(axis => [axis, []]));
  const seenByAxis = Object.fromEntries(AXIS_ORDER.map(axis => [axis, new Set()]));
  for (const entry of parsed.breakdown) {
    const axis = globalThis.FinnBreakdownLabels.getAxis(entry.key);
    const cleanValue = globalThis.FBaseReverseMethodology.stripWatermarkClauses(entry.value);
    const chips = globalThis.FinnBreakdownLabels.splitValue(cleanValue);
    const candidates = chips.length ? chips : [cleanValue];
    for (const candidate of candidates) {
      const label = cleanAxisLabel(globalThis.FBaseReverseMethodology.stripWatermarkClauses(candidate), 40);
      const signal = label.toLocaleLowerCase('zh-CN').replace(/[\s，。,.、:：;；_（）()\[\]【】]+/g, '');
      if (!signal || seenByAxis[axis].has(signal)) continue;
      seenByAxis[axis].add(signal);
      axes[axis].push({
        label,
        value: label,
        shortLine: `呈现${label}的${axis === '视线与情绪' ? '人物情绪' : axis}特征`,
        definition: `${entry.label}维度中用于控制“${label}”这一视觉特征。`,
        effects: [`稳定${entry.label}的画面表现`, `强化${label}对应的视觉识别`],
        goodWith: [],
        badWith: [],
        risks: `权重过高可能让${entry.label}显得刻意，并削弱其他视觉层级。`
      });
    }
  }
  const terms = AXIS_ORDER.flatMap(axis => axes[axis].map(item => ({ axis, ...item })));
  const axisCounts = Object.fromEntries(AXIS_ORDER.map(axis => [axis, axes[axis].length]));
  const sectionRules = [
    ['composition', '构图与视线引导', /composition|framing|camera|lens|perspective|layout|hierarchy|focal|visual_weight|negative_space|rhythm|silhouette|topology/],
    ['subject', '主体与动作', /subject|pose|gesture|gaze|expression|face|eye|brow|mouth|skin|body|hair|clothing|accessories/],
    ['space', '空间与层次', /scene|background|foreground|midground|environment|architecture|surface|spatial|props|arrangement/],
    ['lightColor', '光线与色彩', /light|contrast|exposure|dynamic_range|color|saturation|temperature|tonal/],
    ['material', '材质与表面', /material|texture|product|physical_medium|scale_cues|manufacturing|articulation|detail_density|finish|wear|damage|roughness|translucency/],
    ['imaging', '成像特征', /style|medium|era|render|post_|grain|sharpness|blur|quality|artist|linework|coloring|shadow|highlight/],
    ['typography', '文字与版式', /typography|graphic|information|component|brand|selling|usage/],
    ['failureGuard', '生成边界', /priority|failure|negative_constraints|clarity|subject_visibility|layer_stack/]
  ];
  const sections = sectionRules.map(([key, title, pattern]) => ({
    key, title,
    content: parsed.breakdown.filter(entry => pattern.test(entry.key)).slice(0, 4).map(entry => `${entry.label}：${entry.value}`)
  })).filter(section => section.content.length);
  const selectedAspect = quickSettings.aspectRatio === 'AUTO'
    ? (localEvidence?.aspectRatio || '')
    : quickSettings.aspectRatio;
  const qualityAudit = globalThis.FBaseReverseMethodology?.assessQuality(parsed, {
    aspectRatio: selectedAspect
  }) || null;
  const compactPrompt = globalThis.FBaseReverseMethodology?.compileGenerationPrompt(parsed, {
    aspectRatio: selectedAspect,
    detail: quickSettings.promptDetail
  }) || parsed.prompt;
  return {
    ok: true,
    analysisVersion: 'fbase-breakdown-v18-image25-intent',
    analysisId: `ra_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    imageType: { ...parsed.imageType, aspectRatio: selectedAspect },
    subjectType: subjectTypeForImage(parsed.imageType.key),
    summary: parsed.imageType.reason || `${parsed.imageType.label}深度视觉拆解`,
    sections,
    palette: quickSettings.colorCardMode ? (localEvidence?.palette || []) : [],
    breakdown: parsed.breakdown,
    reversePrompt: compactPrompt,
    generationPrompt: compactPrompt,
    reversePromptFull: parsed.prompt,
    visualReconstructionSpec: parsed.prompt,
    variantPrompt: parsed.variantPrompt,
    xiezhenPrompt: String(xiezhenOutput?.prompt || '').trim(),
    xiezhenMeta: xiezhenOutput?.meta || null,
    faceAssetMatch: parsed.faceAssetMatch || null,
    quickSettings: { ...quickSettings },
    axes,
    terms,
    analyzed: terms.length,
    axisCounts,
    qualityAudit
  };
}

function subjectTypeForImage(key) {
  if (key === 'photographic_portrait' || key === 'anime_illustration') return '人像';
  if (key === 'commercial_product' || key === 'product_still') return '产品';
  if (key === 'space_landscape') return '风景';
  if (key === 'poster_design' || key === 'ui_infographic') return '设计';
  return '通用';
}

function currentSource(inputText, task) {
  const capture = task?.capture || state.capture;
  return {
    srcUrl: capture?.srcUrl || '',
    pageUrl: capture?.pageUrl || '',
    pageTitle: capture?.pageTitle || task?.name || state.uploadedName || '',
    alt: capture?.alt || '',
    captureMethod: capture?.captureMethod || (inputText ? 'prompt' : '')
  };
}

function startProgress() {
  let index = 0;
  setStatus(PROGRESS_STAGES[index], 'loading');
  clearInterval(state.progressTimer);
  state.progressTimer = setInterval(() => {
    index = Math.min(index + 1, PROGRESS_STAGES.length - 1);
    setStatus(PROGRESS_STAGES[index], 'loading');
  }, 6500);
}

function stopProgress() {
  clearInterval(state.progressTimer);
  state.progressTimer = null;
}

function breakdownGroupForEntry(entry) {
  const axis = globalThis.FinnBreakdownLabels.getAxis(entry.key);
  if (axis === '成像') return { key: 'imaging', label: '成像与风格' };
  if (axis === '光线') return { key: 'light', label: '光线与色彩' };
  if (axis === '镜头' || axis === '构图') return { key: 'camera', label: '镜头与构图' };
  if (axis === '头部' || axis === '视线与情绪' || axis === '动作') return { key: 'human', label: '人物与动作' };
  if (axis === '配饰与服装') return { key: 'material', label: '造型与材质' };
  return { key: 'scene', label: '场景与版式' };
}

function breakdownEntryMatches(entry) {
  const group = breakdownGroupForEntry(entry);
  if (state.breakdownFilter === 'favorite') {
    if (!state.favoritedTerms.has(entry.key)) return false;
  } else if (state.breakdownFilter !== 'all' && state.breakdownFilter !== group.key) {
    return false;
  }
  if (!state.breakdownSearch) return true;
  return `${entry.label} ${entry.value}`.toLowerCase().includes(state.breakdownSearch);
}

function renderBreakdownFilters(entries) {
  const counts = Object.fromEntries(BREAKDOWN_FILTERS.map(([key]) => [key, 0]));
  counts.all = entries.length;
  entries.forEach(entry => {
    counts[breakdownGroupForEntry(entry).key] += 1;
    if (state.favoritedTerms.has(entry.key)) counts.favorite += 1;
  });
  el.breakdownFilters.replaceChildren(...BREAKDOWN_FILTERS.filter(([key]) => key === 'all' || key === 'favorite' || counts[key]).map(([key, label]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.breakdownFilter = key;
    button.classList.toggle('active', state.breakdownFilter === key);
    const span = document.createElement('span'); span.textContent = label;
    const small = document.createElement('small'); small.textContent = counts[key];
    button.append(span, small);
    return button;
  }));
}

function createBreakdownRow(entry) {
  const row = document.createElement('article');
  row.className = 'breakdown-sheet-row';
  row.dataset.breakdownKey = entry.key;
  const dimension = document.createElement('div');
  dimension.className = 'breakdown-dimension';
  const label = document.createElement('strong');
  label.className = 'breakdown-label';
  label.textContent = entry.label;
  dimension.append(label);

  const capture = document.createElement('p');
  capture.className = 'breakdown-capture';
  const parts = globalThis.FinnBreakdownLabels.splitValueParts(entry.value);
  if (parts.some(part => part.type === 'keyword')) {
    for (const part of parts) {
      if (part.type === 'text') {
        capture.append(document.createTextNode(part.text));
        continue;
      }
      const chipText = cleanAxisLabel(part.text, 80);
      if (!chipText) {
        // 清洗后为空（整段都是符号）→ 退化为普通文本，不再作为词条展示
        capture.append(document.createTextNode(part.text));
        continue;
      }
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'breakdown-inline-token';
      chip.dataset.copyChip = 'true';
      chip.textContent = chipText;
      chip.setAttribute('aria-label', `复制：${chipText}`);
      chip.title = '点击复制';
      capture.append(chip);
    }
  } else {
    capture.textContent = cleanAxisLabel(entry.value, 500);
  }
  row.append(dimension, capture);
  return row;
}

function renderBreakdownWorkbench() {
  const entries = state.result?.breakdown || [];
  renderBreakdownFilters(entries);
  const visible = entries.filter(breakdownEntryMatches);
  el.breakdownVisibleCount.textContent = `${visible.length} / ${entries.length} 项`;
  const fragment = document.createDocumentFragment();
  if (visible.length) {
    const sheet = document.createElement('section');
    sheet.className = 'breakdown-sheet';
    sheet.append(...visible.map(createBreakdownRow));
    fragment.append(sheet);
  } else {
    const empty = document.createElement('div');
    empty.className = 'breakdown-empty';
    empty.textContent = state.breakdownSearch ? '没有匹配的拆解内容' : '当前筛选下没有内容';
    fragment.append(empty);
  }
  el.reverseSections.replaceChildren(fragment);
  const remainingVisible = visible.filter(entry => !state.favoritedTerms.has(entry.key)).length;
  el.breakdownExpandButton.textContent = state.breakdownFilter === 'all' ? `收藏当前列表 ${remainingVisible}` : `收藏当前分类 ${remainingVisible}`;
  el.breakdownExpandButton.disabled = !remainingVisible;
}

async function favoriteVisibleBreakdown() {
  const entries = (state.result?.breakdown || []).filter(entry => breakdownEntryMatches(entry) && !state.favoritedTerms.has(entry.key));
  if (!entries.length) return;
  el.breakdownExpandButton.disabled = true;
  setStatus(`正在收藏当前列表的 ${entries.length} 个维度`, 'loading');
  try {
    for (const entry of entries) {
      await saveFavoriteTerm(entry, entry.value, 'visible-batch-favorite');
      state.favoritedTerms.add(entry.key);
    }
    renderResult(state.result);
    flashConfirm(event?.currentTarget || el.breakdownExpandButton);
    setStatus(`已收藏当前列表的 ${entries.length} 个维度，本次会话累计入库 ${state.sessionImportedTerms || entries.length} 条`, 'success');
  } catch (error) {
    renderBreakdownWorkbench();
    setStatus(error.message || '当前列表收藏失败', 'error');
  }
}

function renderResultGenerationStyles(result = state.result) {
  if (!el.resultGenerationStyles) return;
  if (!el.resultGenerationStyles.childElementCount) {
    el.resultGenerationStyles.replaceChildren(...GENERATION_STYLE_CONTROLS.map(item => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.generationStyle = item.id;
      button.textContent = item.text;
      button.setAttribute('aria-pressed', 'false');
      return button;
    }));
  }
  const selected = new Set(resultGenerationStyleIds(result));
  el.resultGenerationStyles.querySelectorAll('[data-generation-style]').forEach(button => {
    const active = selected.has(button.dataset.generationStyle);
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  if (el.resultGenerationStyleLabel) el.resultGenerationStyleLabel.textContent = selected.size ? `${selected.size} 项` : '未选择';
  if (el.resultGenerationStylePreview) {
    el.resultGenerationStylePreview.textContent = generationStyleSentence(result) || '反推完成后可自由勾选，生成或重新生成时追加到当前任务。';
    el.resultGenerationStylePreview.classList.toggle('is-empty', !selected.size);
  }
  if (el.resultGenerationStyleClear) el.resultGenerationStyleClear.disabled = !selected.size;
  if (el.copyPromptWithGenerationStyleButton) el.copyPromptWithGenerationStyleButton.disabled = !String(result?.reversePrompt || '').trim();
}

function renderResultGenerationImageControls(result = state.result) {
  if (!el.resultGenerationImageControls) return;
  if (!el.resultGenerationImageControls.childElementCount) {
    el.resultGenerationImageControls.replaceChildren(...GENERATION_IMAGE_CONTROLS.map(item => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.generationImage = item.id;
      button.textContent = item.text;
      button.setAttribute('aria-pressed', 'false');
      return button;
    }));
  }
  const selected = new Set(resultGenerationImageIds(result));
  el.resultGenerationImageControls.querySelectorAll('[data-generation-image]').forEach(button => {
    const active = selected.has(button.dataset.generationImage);
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  if (el.resultGenerationImageLabel) el.resultGenerationImageLabel.textContent = selected.size ? `${selected.size} 项` : '未选择';
  if (el.resultGenerationImagePreview) {
    el.resultGenerationImagePreview.textContent = generationImageSentence(result) || '可自由组合镜头、皮肤、光线、胶片与传播质感。';
    el.resultGenerationImagePreview.classList.toggle('is-empty', !selected.size);
  }
  if (el.resultGenerationImageClear) el.resultGenerationImageClear.disabled = !selected.size;
}

function renderResult(result, { forceExpand = false } = {}) {
  hydrateFaithfulXiezhenPrompt(result);
  el.resultCard.classList.remove('hidden');
  const isNewAnalysis = result?.analysisId && result.analysisId !== state.lastRenderedAnalysisId;
  if (isNewAnalysis) {
    state.lastRenderedAnalysisId = result.analysisId;
    state.promptMode = 'reverse';
    state.visualArchiveMode = 'breakdown';
  }
  if (forceExpand) expandAllResultModules();
  el.resultEyebrow.textContent = 'REVERSE READY';
  el.resultCount.textContent = String(result.analyzed || 0);
  el.resultHeadline.textContent = '反推结果已生成';
  el.resultSummary.textContent = [result.summary || `识别 ${result.analyzed || 0} 个候选词条`, result.creationError].filter(Boolean).join('。');
  el.resultMeta.replaceChildren();
  const metaItems = [result.imageType?.label, result.imageType?.aspectRatio, result.subjectType].filter(Boolean);
  for (const value of [...new Set(metaItems)]) {
    const chip = document.createElement('span');
    chip.textContent = value;
    el.resultMeta.append(chip);
  }
  renderBreakdownWorkbench();
  const remainingRows = (result.breakdown || []).filter(entry => !state.favoritedTerms.has(entry.key)).length;
  el.favoriteAllButton.textContent = remainingRows ? `全部收藏 (${remainingRows})` : '已全部收藏';
  el.favoriteAllButton.disabled = !remainingRows;
  const showPalette = state.quickSettings.colorCardMode && (result.palette || []).length > 0;
  el.paletteSection.dataset.available = String(showPalette);
  el.paletteList.replaceChildren();
  el.paletteStrip.replaceChildren();
  el.paletteCount.textContent = `${(result.palette || []).length} 色`;
  for (const color of (result.palette || [])) {
    const segment = document.createElement('i');
    segment.style.backgroundColor = color.hex;
    segment.style.flexGrow = String(Number.isFinite(color.ratio) && color.ratio > 0 ? color.ratio : 1);
    segment.title = `${color.hex} ${Number.isFinite(color.ratio) ? `${color.ratio}%` : ''}`.trim();
    el.paletteStrip.append(segment);
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'palette-item';
    item.dataset.paletteHex = color.hex;
    const swatch = document.createElement('span');
    swatch.className = 'palette-swatch';
    swatch.style.backgroundColor = color.hex;
    const copy = document.createElement('span');
    copy.className = 'palette-copy';
    const hex = document.createElement('strong');
    hex.textContent = color.hex;
    const role = document.createElement('span');
    const ratio = document.createElement('b');
    ratio.textContent = Number.isFinite(color.ratio) ? `${color.ratio}%` : '均分';
    role.textContent = color.role || '参考色';
    copy.append(hex, ratio, role);
    item.append(swatch, copy);
    el.paletteList.append(item);
  }
  el.favoritePaletteButton.textContent = state.paletteFavorited ? '已收藏' : '收藏';
  el.favoritePaletteButton.classList.toggle('is-favorited', state.paletteFavorited);
  el.paletteReferenceButton.querySelector(':scope > span:first-child').textContent = state.quickSettings.referencePalette ? '生成时已参考色卡' : '生成时参考色卡';
  el.paletteReferenceButton.classList.toggle('is-favorited', state.quickSettings.referencePalette);
  el.reversePrompt.contentEditable = 'false';
  el.reversePrompt.classList.remove('is-editing');
  state.promptEditing.prompt = false;
  el.reversePrompt.textContent = result.reversePrompt || '';
  renderResultGenerationStyles(result);
  renderResultGenerationImageControls(result);
  renderResultGenerationControlCollapse();
  const hasXiezhenPrompt = Boolean(String(result.xiezhenPrompt || '').trim());
  el.xiezhenPrompt.contentEditable = 'false';
  el.xiezhenPrompt.classList.remove('is-editing');
  state.promptEditing.xiezhen = false;
  el.xiezhenPrompt.textContent = result.xiezhenPrompt || '';
  const xiezhenMeta = result.xiezhenMeta || {};
  el.xiezhenPromptTitle.textContent = xiezhenMeta.templateLabel ? `${xiezhenMeta.templateLabel}调整稿` : '写真调整提示词';
  el.xiezhenPromptMeta.textContent = [xiezhenMeta.templateLabel, xiezhenMeta.presetLabel].filter(Boolean).join(' · ');
  el.variantPrompt.contentEditable = 'false';
  el.variantPrompt.classList.remove('is-editing');
  state.promptEditing.variant = false;
  el.variantPrompt.textContent = result.variantPrompt || '';
  renderPromptFavoriteState();
  renderPromptWorkspace(result);
  renderVisualArchiveWorkspace(showPalette);
  syncResultJumpAvailability();
  renderGeneratedResult();
  scheduleWorkspacePublish();
}

function expandAllResultModules() {
  const workspace = el.resultWorkspace;
  if (workspace) {
    workspace.classList.remove('hidden');
    workspace.style.display = '';
  }
  el.resultCard.classList.remove('hidden');
  el.resultCard.style.display = '';
  for (const module of el.resultCard.querySelectorAll('.task-module')) {
    module.classList.remove('is-collapsed');
    const head = module.querySelector('[data-module-toggle]');
    if (head) head.setAttribute('aria-expanded', 'true');
  }
}

// 结果区锚点条：让"提示词/生图调整/色卡/画面解构"随时一键可达，并标出当前在哪一段。
// 注意：initialize() 在文件中段就会调用 bindEvents()，这里的模块级 const 会踩 TDZ，
// 所以跳转目标列表直接写在函数里，不提成常量。
function resultJumpTargets() {
  return ['promptModeSwitcher', 'generationTuningPanel', 'paletteSection', 'breakdownModule'];
}

function taskNavigationEntries() {
  const queueEntries = state.taskQueue.map(item => ({
    kind: 'queue',
    id: item.id,
    status: item.status || 'waiting',
    label: item.name || '视觉反推任务',
    analysisId: item.result?.analysisId || ''
  }));
  const historyEntries = state.history.map(item => ({
    kind: 'history',
    id: item.id,
    status: 'completed',
    label: item.result?.summary || '已完成任务',
    analysisId: item.result?.analysisId || ''
  }));
  return [...queueEntries, ...historyEntries];
}

function activeTaskNavigationIndex(entries = taskNavigationEntries()) {
  if (state.activeTaskId) return entries.findIndex(item => item.kind === 'queue' && item.id === state.activeTaskId);
  const analysisId = state.result?.analysisId || '';
  if (!analysisId) return -1;
  return entries.findIndex(item => item.kind === 'history' && item.analysisId === analysisId);
}

function taskNavigationStatus(entry) {
  if (!entry) return '打开完整队列';
  if (entry.kind === 'history') return '已完成';
  if (entry.status === 'running') return '正在运行';
  if (entry.status === 'queued') return '排队中';
  if (entry.status === 'error') return '运行失败';
  return '未开始';
}

function renderTaskNavigator() {
  if (!el.taskSwitcherButton) return;
  const entries = taskNavigationEntries();
  const activeIndex = activeTaskNavigationIndex(entries);
  const effectiveIndex = activeIndex >= 0 ? activeIndex : (entries.length ? 0 : -1);
  const current = effectiveIndex >= 0 ? entries[effectiveIndex] : null;
  el.taskSwitcherLabel.textContent = entries.length ? `任务 ${effectiveIndex + 1} / ${entries.length}` : '任务队列';
  el.taskSwitcherState.textContent = current ? `${taskNavigationStatus(current)} · ${current.label}` : '当前没有任务';
  el.previousTaskButton.disabled = effectiveIndex <= 0;
  el.nextTaskButton.disabled = effectiveIndex < 0 || effectiveIndex >= entries.length - 1;
  el.taskSwitcherButton.title = current ? `打开任务队列：${current.label}` : '打开任务队列';
}

async function navigateTaskBy(delta) {
  const entries = taskNavigationEntries();
  if (!entries.length) return;
  const activeIndex = activeTaskNavigationIndex(entries);
  const baseIndex = activeIndex >= 0 ? activeIndex : 0;
  const target = entries[Math.max(0, Math.min(entries.length - 1, baseIndex + delta))];
  if (!target || target === entries[activeIndex]) return;
  closeQueueDrawer();
  if (target.kind === 'queue') await activateQueuedTask(target.id);
  else openHistory(target.id);
}

// 顶栏 + 锚点条都是 sticky，任何滚动定位都要把这两层的高度让出来
function resultStickyOffset(extra = 0) {
  const head = document.querySelector('.studio-head');
  const bar = el.resultJumpBar && !el.resultJumpBar.hidden ? el.resultJumpBar : null;
  return (head ? head.getBoundingClientRect().height : 0)
    + (bar ? bar.getBoundingClientRect().height : 0)
    + extra;
}

function syncResultJumpBarOffset() {
  if (!el.resultJumpBar) return;
  const head = document.querySelector('.studio-head');
  if (head) el.resultJumpBar.style.top = `${Math.round(head.getBoundingClientRect().height)}px`;
}

function syncResultJumpAvailability() {
  if (!el.resultJumpBar) return;
  const paletteButton = el.resultJumpBar.querySelector('[data-jump-target="paletteSection"]');
  if (!paletteButton) return;
  const available = el.paletteSection?.dataset.available === 'true';
  paletteButton.disabled = !available;
  paletteButton.setAttribute('aria-disabled', String(!available));
  paletteButton.title = available ? '跳转到参考色卡' : '当前结果没有可用色卡';
}

function updateResultJumpBar() {
  if (!el.resultJumpBar) return;
  const shown = !!el.resultWorkspace && !el.resultWorkspace.classList.contains('hidden')
    && !!el.resultCard && !el.resultCard.classList.contains('hidden');
  el.resultJumpBar.hidden = !shown;
  if (shown) {
    syncResultJumpBarOffset();
    syncResultJumpAvailability();
    renderTaskNavigator();
    markCurrentJumpTarget();
  }
}

function scrollToResultSection(id) {
  if (id === 'paletteSection') setVisualArchiveMode('palette');
  if (id === 'breakdownModule') setVisualArchiveMode('breakdown');
  holdCurrentResultJumpTarget(id);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const target = document.getElementById(id);
    if (!target || target.offsetParent === null) return;
    // 色卡和解构共用视觉档案页签。先切换页签，再展开并读取更新后的真实位置。
    if (target.classList.contains('is-collapsed')) {
      target.querySelector('[data-module-toggle]')?.click();
    }
    requestAnimationFrame(() => {
      const top = Math.max(0, target.getBoundingClientRect().top + window.scrollY - resultStickyOffset(12));
      window.scrollTo({ top, behavior: 'smooth' });
      markCurrentJumpTarget();
    });
  }));
}

let resultJumpRequestedTarget = '';
let resultJumpRequestedAt = 0;

function setCurrentResultJumpTarget(id) {
  if (!el.resultJumpBar) return;
  el.resultJumpBar.querySelectorAll('[data-jump-target]').forEach(button => {
    button.classList.toggle('is-current', button.dataset.jumpTarget === id);
  });
}

function holdCurrentResultJumpTarget(id) {
  if (!resultJumpTargets().includes(id)) return;
  resultJumpRequestedTarget = id;
  resultJumpRequestedAt = Date.now();
  setCurrentResultJumpTarget(id);
}

function requestedResultJumpTargetIsActive(line) {
  if (!resultJumpRequestedTarget) return false;
  const node = document.getElementById(resultJumpRequestedTarget);
  if (!node || node.offsetParent === null) {
    resultJumpRequestedTarget = '';
    return false;
  }
  const rect = node.getBoundingClientRect();
  const waitingForSmoothScroll = Date.now() - resultJumpRequestedAt < 1400;
  const visibleInReadingArea = rect.bottom > line && rect.top < window.innerHeight - 20;
  if (waitingForSmoothScroll || visibleInReadingArea) {
    setCurrentResultJumpTarget(resultJumpRequestedTarget);
    return true;
  }
  resultJumpRequestedTarget = '';
  return false;
}

// 取"最后一个已经越过基准线"的模块作为当前位置，符合从上往下的阅读顺序
function markCurrentJumpTarget() {
  if (!el.resultJumpBar || el.resultJumpBar.hidden) return;
  const line = resultStickyOffset(48);
  if (requestedResultJumpTargetIsActive(line)) return;
  let currentId = '';
  for (const id of resultJumpTargets()) {
    const node = document.getElementById(id);
    if (!node || node.offsetParent === null) continue;
    if (node.getBoundingClientRect().top <= line) currentId = id;
  }
  setCurrentResultJumpTarget(currentId);
}

// 注意：这个函数在模块作用域，取不到 bindEvents() 里的局部 const on，
// 必须用 addEventListener 直接绑。之前在这里调 on() 会抛 ReferenceError，
// 被 bindEvents 的 try/catch 吞掉，导致它之后的所有事件绑定静默失效。
function bindResultJumpBar() {
  if (!el.resultJumpBar) return;
  el.previousTaskButton?.addEventListener('click', () => navigateTaskBy(-1));
  el.nextTaskButton?.addEventListener('click', () => navigateTaskBy(1));
  el.taskSwitcherButton?.addEventListener('click', toggleQueueDrawer);
  el.resultJumpBar.addEventListener('click', event => {
    const button = event.target.closest('[data-jump-target]');
    if (button) scrollToResultSection(button.dataset.jumpTarget);
  });
  window.addEventListener('scroll', markCurrentJumpTarget, { passive: true });
  window.addEventListener('resize', () => { syncResultJumpBarOffset(); markCurrentJumpTarget(); });
  // 结果卡的显示/隐藏散落在好几处，用 observer 统一盯住 class 变化最省心
  if (el.resultCard && window.MutationObserver) {
    new MutationObserver(updateResultJumpBar).observe(el.resultCard, { attributes: true, attributeFilter: ['class', 'style'] });
  }
  updateResultJumpBar();
}

// 一次性滚动定位。双 rAF 保证展开后的布局（高度）已生效再读位置；无锁定、无持续校准，
// 不干扰用户随后的任何手动滚动。
// 反推完最想看的是提示词，所以默认落在提示词区，而不是结果区顶部。
function revealCurrentResult({ smooth = true } = {}) {
  const workspace = el.resultWorkspace;
  if (!workspace || workspace.classList.contains('hidden')) return;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const anchor = el.promptModeSwitcher && el.promptModeSwitcher.offsetParent !== null
      ? el.promptModeSwitcher
      : workspace;
    const top = Math.max(0, anchor.getBoundingClientRect().top + window.scrollY - resultStickyOffset(12));
    window.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' });
  }));
}

function revealCurrentResultTwoStage() {
  revealCurrentResult({ smooth: false });
  requestAnimationFrame(() => requestAnimationFrame(() => revealCurrentResult()));
}

function renderGeneratedResult() {
  const resultAnalysisId = state.result?.analysisId || '';
  if (state.generatedImage?.analysisId && resultAnalysisId && state.generatedImage.analysisId !== resultAnalysisId) {
    console.warn('F·BASE 已拦截跨任务生成图', { generated: state.generatedImage.analysisId, result: resultAnalysisId });
    state.generatedImage = null;
  }
  const generated = state.generatedImage;
  el.generatedResultModule.classList.toggle('hidden', !generated);
  if (!generated) {
    el.generatedImage.removeAttribute('src');
    el.resultOriginalImage.removeAttribute('src');
    el.generatedRequestPromptPanel?.classList.add('hidden');
    if (el.generatedRequestPromptText) el.generatedRequestPromptText.textContent = '';
    if (el.generatedRequestPromptBody) el.generatedRequestPromptBody.hidden = true;
    el.generatedRequestPromptToggle?.setAttribute('aria-expanded', 'false');
    scheduleWorkspacePublish();
    return;
  }
  el.generatedImage.src = generated.dataUrl || generated.url;
  // 原图查找优先级：generated.original（completeActiveTask 保存的持久副本）
  //   → state.result.sourceImage（历史打开时恢复） → state.sourceDataUrl/capture（当前任务）
  // 避免任务完成后清空 capture 导致按钮变灰
  const original = generated.original || state.result?.sourceImage || state.sourceDataUrl || state.capture?.dataUrl || state.capture?.srcUrl || '';
  if (original) el.resultOriginalImage.src = original;
  else el.resultOriginalImage.removeAttribute('src');
  const processingMeta = generated.processing ? ' · 正在整理画幅与保存' : '';
  const similarityMeta = Number.isFinite(Number(generated.similarityScore)) ? ` · 相似校准 ${Math.round(Number(generated.similarityScore))}` : '';
  const aspectMeta = generated.aspectWarning ? ` · 画幅偏差：${generated.aspectWarning}` : '';
  el.generatedResultMeta.textContent = `${generated.model || '生图模型'} · ${formatHistoryTime(generated.createdAt)}${processingMeta}${similarityMeta}${aspectMeta}`;
  const requestPrompt = String(generated.prompt || '').trim();
  el.generatedRequestPromptPanel?.classList.toggle('hidden', !requestPrompt);
  if (el.generatedRequestPromptText) el.generatedRequestPromptText.textContent = requestPrompt;
  if (el.generatedRequestPromptMeta) {
    const basePrompt = String(generated.basePrompt || '').trim();
    el.generatedRequestPromptMeta.textContent = basePrompt && basePrompt !== requestPrompt
      ? `已记录完整请求，共 ${requestPrompt.length} 字`
      : `已记录本次请求，共 ${requestPrompt.length} 字`;
  }
  el.resultImageStage.dataset.view = state.resultView;
  for (const button of el.resultImageStage.parentElement.querySelectorAll('[data-result-view]')) {
    button.classList.toggle('active', button.dataset.resultView === state.resultView);
    if (button.dataset.resultView !== 'result') button.disabled = !original;
  }
  el.favoriteGeneratedButton.textContent = generated.favorited ? '已收藏' : '收藏';
  el.favoriteGeneratedButton.classList.toggle('is-favorited', Boolean(generated.favorited));
  el.saveEagleButton.textContent = generated.eagleSaved ? '已存 Eagle' : 'Eagle';
  el.saveEagleButton.classList.toggle('is-saved', Boolean(generated.eagleSaved));
  renderGenerationFeedback(generated);
  scheduleWorkspacePublish();
}

function renderGenerationFeedback(generated = state.generatedImage) {
  if (!el.generationFeedbackOptions || !el.generationFeedbackStatus) return;
  const selected = new Set(Array.isArray(generated?.feedbackTags) ? generated.feedbackTags : []);
  el.generationFeedbackOptions.querySelectorAll('[data-generation-feedback]').forEach(button => {
    const active = selected.has(button.dataset.generationFeedback);
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
    button.disabled = Boolean(generated?.feedbackSaving);
  });
  if (generated?.feedbackSaving) el.generationFeedbackStatus.textContent = '正在保存到本机';
  else if (generated?.feedbackError) el.generationFeedbackStatus.textContent = generated.feedbackError;
  else if (generated?.feedbackSavedAt) el.generationFeedbackStatus.textContent = `已记录 · ${formatHistoryTime(generated.feedbackSavedAt)}`;
  else el.generationFeedbackStatus.textContent = '本机记录，用于后续优化';
}

async function handleGenerationFeedback(event) {
  const button = event.target.closest('[data-generation-feedback]');
  const generated = state.generatedImage;
  if (!button || !generated || generated.feedbackSaving) return;
  const value = button.dataset.generationFeedback;
  const tags = new Set(Array.isArray(generated.feedbackTags) ? generated.feedbackTags : []);
  if (tags.has(value)) tags.delete(value);
  else {
    if (value === 'matched') tags.clear();
    else tags.delete('matched');
    tags.add(value);
  }
  generated.feedbackTags = [...tags];
  generated.feedbackSaving = true;
  generated.feedbackError = '';
  renderGenerationFeedback(generated);

  const feedbackId = generated.feedbackId || `feedback_${state.result?.analysisId || generated.taskId || generated.createdAt || Date.now()}`;
  generated.feedbackId = feedbackId;
  try {
    const endpoint = normalizeLibraryEndpoint(state.settings.libraryEndpoint);
    const response = tags.size
      ? await runtimeSend({
          type: 'KBASE_FETCH',
          url: `${endpoint}/api/reverse_feedback`,
          method: 'PUT',
          timeout: 30000,
          body: {
            id: feedbackId,
            analysisId: state.result?.analysisId || generated.analysisId || '',
            taskId: generated.taskId || state.activeTaskId || '',
            model: generated.model || '',
            imageType: state.result?.imageType || null,
            prompt: generated.prompt || '',
            sourceImage: generated.original || state.result?.sourceImage || '',
            generatedImage: generated.dataUrl || generated.url || '',
            feedbackTags: [...tags],
            outcome: tags.has('matched') ? 'matched' : 'needs_work',
            requestedAspect: generated.requestedAspect || '',
            actualWidth: generated.actualWidth || 0,
            actualHeight: generated.actualHeight || 0,
            quickSettings: state.quickSettings,
            createdAt: generated.feedbackCreatedAt || Date.now()
          }
        })
      : await runtimeSend({
          type: 'KBASE_FETCH',
          url: `${endpoint}/api/reverse_feedback/${encodeURIComponent(feedbackId)}`,
          method: 'DELETE',
          timeout: 15000
        });
    if (!response?.ok) throw makeRequestError(response, true);
    generated.feedbackCreatedAt = generated.feedbackCreatedAt || Date.now();
    generated.feedbackSavedAt = tags.size ? Date.now() : 0;
    await attachGeneratedImageToHistory(generated, state.result);
  } catch (error) {
    generated.feedbackError = error.message || '反馈保存失败';
  } finally {
    generated.feedbackSaving = false;
    renderGenerationFeedback(generated);
  }
}

function handleResultViewClick(event) {
  const button = event.target.closest('[data-result-view]');
  if (!button || button.disabled) return;
  state.resultView = button.dataset.resultView;
  renderGeneratedResult();
}

// ===== 结果图片 Lightbox：全屏预览 + 滚轮缩放/拖动平移 + 旁边解构面板 =====

function openResultLightbox(view) {
  const generated = state.generatedImage;
  if (!generated) return;
  const generatedUrl = generated.dataUrl || generated.url || '';
  const original = generated.original || state.result?.sourceImage || state.sourceDataUrl || state.capture?.dataUrl || state.capture?.srcUrl || '';
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({
      source: 'FBASE_SIDEPANEL',
      type: 'FBASE_OPEN_IMAGE_VIEWER',
      payload: { view, generatedUrl, originalUrl: original }
    }, '*');
    return;
  }
  const lb = document.getElementById('resultLightbox');
  if (!lb) return;
  const genImg = document.getElementById('lightboxGenerated');
  const origImg = document.getElementById('lightboxOriginal');
  if (genImg) genImg.src = generatedUrl;
  if (origImg) {
    if (original) { origImg.src = original; origImg.classList.remove('hidden'); }
    else { origImg.classList.add('hidden'); origImg.removeAttribute('src'); }
  }
  // 视图切换按钮状态
  lb.querySelectorAll('.lightbox-view-switch [data-lb-view]').forEach(btn => {
    const v = btn.dataset.lbView;
    btn.classList.toggle('active', v === view);
    btn.disabled = (v !== 'result' && !original);
  });
  const wrap = document.getElementById('lightboxImageWrap');
  if (wrap) wrap.dataset.lbView = view;
  if (view === 'original') lightboxState.active = 'original';
  if (view === 'result') lightboxState.active = 'generated';
  // 复制解构内容到右侧面板（clone 节点，不影响原有交互）
  const bdBody = document.getElementById('lightboxBreakdownBody');
  if (bdBody && el.reverseSections) {
    bdBody.innerHTML = '';
    bdBody.append(...Array.from(el.reverseSections.childNodes).map(node => node.cloneNode(true)));
  }
  resetLightboxTransform();
  lb.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeResultLightbox() {
  const lb = document.getElementById('resultLightbox');
  if (lb) lb.classList.add('hidden');
  document.body.style.overflow = '';
  lightboxState.dragging = false;
}

function resetLightboxTransform() {
  Object.values(lightboxState.images).forEach(item => {
    item.scale = 1;
    item.x = 0;
    item.y = 0;
  });
  applyLightboxTransform();
}

function applyLightboxTransform() {
  const gen = document.getElementById('lightboxGenerated');
  const orig = document.getElementById('lightboxOriginal');
  const generatedState = lightboxState.images.generated;
  const originalState = lightboxState.images.original;
  if (gen) gen.style.transform = `translate(${generatedState.x}px, ${generatedState.y}px) scale(${generatedState.scale})`;
  if (orig) orig.style.transform = `translate(${originalState.x}px, ${originalState.y}px) scale(${originalState.scale})`;
  const activeState = lightboxState.images[lightboxState.active];
  const reset = document.getElementById('lightboxZoomReset');
  if (reset) reset.textContent = `${Math.round(activeState.scale * 100)}%`;
  gen?.classList.toggle('is-active-image', lightboxState.active === 'generated');
  orig?.classList.toggle('is-active-image', lightboxState.active === 'original');
}

function lightboxImageKey(target) {
  return target?.id === 'lightboxOriginal' ? 'original' : 'generated';
}

function activeLightboxImage() {
  return lightboxState.images[lightboxState.active];
}

function zoomActiveLightbox(factor) {
  const current = activeLightboxImage();
  current.scale = Math.max(0.25, Math.min(8, current.scale * factor));
  applyLightboxTransform();
}

function resetActiveLightbox() {
  const current = activeLightboxImage();
  current.scale = 1;
  current.x = 0;
  current.y = 0;
  applyLightboxTransform();
}

function bindLightboxEvents() {
  if (lightboxState.bound) return;
  lightboxState.bound = true;
  const lb = document.getElementById('resultLightbox');
  if (!lb) return;
  document.getElementById('lightboxCloseButton')?.addEventListener('click', closeResultLightbox);
  document.getElementById('lightboxBackdrop')?.addEventListener('click', closeResultLightbox);
  document.getElementById('lightboxZoomOut')?.addEventListener('click', () => zoomActiveLightbox(0.8));
  document.getElementById('lightboxZoomIn')?.addEventListener('click', () => zoomActiveLightbox(1.25));
  document.getElementById('lightboxZoomReset')?.addEventListener('click', resetActiveLightbox);
  // 视图切换
  lb.querySelector('.lightbox-view-switch')?.addEventListener('click', e => {
    const btn = e.target.closest('[data-lb-view]');
    if (!btn || btn.disabled) return;
    openResultLightbox(btn.dataset.lbView);
  });
  const stage = document.getElementById('lightboxStage');
  const wrap = document.getElementById('lightboxImageWrap');
  if (stage && wrap) {
    // 滚轮缩放
    stage.addEventListener('wheel', e => {
      e.preventDefault();
      const image = e.target.closest('#lightboxGenerated, #lightboxOriginal');
      if (image) lightboxState.active = lightboxImageKey(image);
      zoomActiveLightbox(e.deltaY < 0 ? 1.15 : 0.87);
    }, { passive: false });
    // 拖动平移
    wrap.addEventListener('mousedown', e => {
      const image = e.target.closest('#lightboxGenerated, #lightboxOriginal');
      if (!image) return;
      lightboxState.active = lightboxImageKey(image);
      const current = activeLightboxImage();
      lightboxState.dragging = true;
      lightboxState.dragStart = { x: e.clientX - current.x, y: e.clientY - current.y };
      wrap.classList.add('dragging');
      image.classList.add('dragging');
      applyLightboxTransform();
    });
    document.addEventListener('mousemove', e => {
      if (!lightboxState.dragging) return;
      const current = activeLightboxImage();
      current.x = e.clientX - lightboxState.dragStart.x;
      current.y = e.clientY - lightboxState.dragStart.y;
      applyLightboxTransform();
    });
    document.addEventListener('mouseup', () => {
      if (!lightboxState.dragging) return;
      lightboxState.dragging = false;
      wrap.classList.remove('dragging');
      wrap.querySelectorAll('img').forEach(img => img.classList.remove('dragging'));
    });
    // 双击复位
    wrap.addEventListener('dblclick', e => {
      const image = e.target.closest('#lightboxGenerated, #lightboxOriginal');
      if (image) lightboxState.active = lightboxImageKey(image);
      resetActiveLightbox();
    });
  }
  // ESC 关闭
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && lb && !lb.classList.contains('hidden')) {
      e.preventDefault();
      closeResultLightbox();
    }
  });
}

async function resolveGeneratedDataUrl() {
  if (state.generatedImage?.dataUrl) return state.generatedImage.dataUrl;
  if (!state.generatedImage?.url) return '';
  const fetched = await runtimeSend({ type: 'IMAGE_FETCH', url: state.generatedImage.url });
  if (!fetched?.ok || !fetched.dataUrl) throw new Error(fetched?.error || '无法读取生成图片');
  return fetched.dataUrl;
}

async function downloadGeneratedImage() {
  try {
    const dataUrl = await resolveGeneratedDataUrl();
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `FBASE-${Date.now()}.png`;
    document.body.append(link);
    link.click();
    link.remove();
    flashConfirm(event?.currentTarget || el.downloadGeneratedButton);
    setStatus('生成结果已下载', 'success');
  } catch (error) {
    setStatus(error.message || '生成结果下载失败', 'error');
  }
}

async function favoriteGeneratedImage() {
  const generated = state.generatedImage;
  if (!generated || generated.favorited) return;
  try {
    const id = await stableFavoriteId('generated', generated.prompt);
    const now = Date.now();
    await putLibraryRecord('recipes', {
      id,
      title: state.result?.summary || 'F·BASE 生成结果',
      summary: state.result?.summary || '',
      prompt: generated.prompt,
      variantPrompt: state.result?.variantPrompt || '',
      image: generated.dataUrl || generated.url,
      sourceImage: state.sourceDataUrl || state.capture?.dataUrl || state.capture?.srcUrl || '',
      imageType: state.result?.imageType || {},
      breakdown: state.result?.breakdown || [],
      palette: state.result?.palette || [],
      model: generated.model,
      source: 'fbase-generated-favorite',
      captureMethod: 'generated-favorite',
      createdAt: now,
      updatedAt: now
    });
    generated.favorited = true;
    renderGeneratedResult();
    flashConfirm(event?.currentTarget || el.favoriteGeneratedButton);
    setStatus('生成结果已收藏到 F·BASE', 'success');
  } catch (error) {
    setStatus(error.message || '生成结果收藏失败', 'error');
  }
}

async function saveGeneratedToEagle() {
  const generated = state.generatedImage;
  if (!generated) return;
  if (state.settings.eagleEnabled === false) {
    setStatus('Eagle 保存当前已关闭，请在配置中开启', 'error');
    return;
  }
  el.saveEagleButton.disabled = true;
  el.saveEagleButton.textContent = '保存中';
  try {
    const endpoint = normalizeEagleEndpoint(state.settings.eagleEndpoint);
    const body = {
      name: buildEagleName(state.result?.summary || generated.prompt),
      website: state.capture?.pageUrl || '',
      tags: splitEagleTags(state.settings.eagleTags),
      annotation: `F·BASE 提示词：${generated.prompt}`
    };
    if (generated.dataUrl) body.base64 = generated.dataUrl.replace(/^data:image\/[^;]+;base64,/, '');
    else body.url = generated.url;
    const response = await runtimeSend({ type: 'EAGLE_FETCH', url: endpoint, method: 'POST', headers: { 'content-type': 'application/json' }, body });
    if (!response?.ok || response.data?.status === 'error') throw new Error(response?.data?.message || response?.error || 'Eagle 拒绝了保存请求');
    generated.eagleSaved = true;
    renderGeneratedResult();
    setStatus('生成结果已保存到 Eagle', 'success');
  } catch (error) {
    setStatus(error.message || '保存到 Eagle 失败', 'error');
  } finally {
    el.saveEagleButton.disabled = false;
    renderGeneratedResult();
  }
}

function normalizeEagleEndpoint(value) {
  const url = new URL(String(value || DEFAULT_SETTINGS.eagleEndpoint).trim());
  if (url.protocol !== 'http:' || !['localhost', '127.0.0.1'].includes(url.hostname) || url.port !== '41595') throw new Error('Eagle 地址需要指向本机 41595 端口');
  return url.href;
}

function splitEagleTags(value) {
  return [...new Set(String(value || '').split(/[,，;；\n]+/).map(item => item.trim()).filter(Boolean))].slice(0, 20);
}

function buildEagleName(value) {
  const text = String(value || 'F·BASE 生成结果').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim();
  return text.slice(0, 72) || `F·BASE ${Date.now()}`;
}

async function testEagleConnection() {
  try {
    const endpoint = normalizeEagleEndpoint(el.eagleEndpointInput.value);
    const infoUrl = new URL('/api/application/info', endpoint).href;
    showSettingsResult('正在连接 Eagle', 'loading');
    const response = await runtimeSend({ type: 'EAGLE_FETCH', url: infoUrl, method: 'GET' });
    if (!response?.ok || response.data?.status === 'error') throw new Error(response?.data?.message || response?.error || 'Eagle 未响应');
    showSettingsResult('Eagle 连接成功', 'success');
  } catch (error) {
    showSettingsResult(error.message || 'Eagle 连接失败', 'error');
  }
}

function renderImportSuccess(result) {
  el.resultEyebrow.textContent = 'IMPORTED';
  el.resultCount.textContent = String(result.analyzed || result.imported || 0);
  el.resultHeadline.textContent = result.alreadyImported ? '这份结果已经入库' : '反推结果已自动写入';
}

async function copyReversePrompt() {
  const prompt = state.result?.reversePrompt || '';
  if (!prompt) return;
  await copyWithFeedback(event?.currentTarget || document.activeElement, prompt);
  setStatus('完整提示词已复制', 'success');
}

async function copyXiezhenPrompt() {
  const prompt = state.result?.xiezhenPrompt || '';
  if (!prompt) return;
  await copyWithFeedback(event?.currentTarget || document.activeElement, prompt);
  setStatus('写真调整提示词已复制', 'success');
}

async function copyPromptWithGenerationStyle() {
  const prompt = generationPromptSource(state.promptMode);
  if (!prompt) {
    setStatus('当前页签还没有可复制的提示词', 'error');
    return;
  }
  const style = generationStyleSentence(state.result, prompt);
  const image = generationImageSentence(state.result, prompt);
  await copyWithFeedback(event?.currentTarget || document.activeElement, [prompt, style, image].filter(Boolean).join('\n\n'));
  setStatus(style || image ? '已复制当前提示词和末尾的已选调整' : '已复制当前提示词', 'success');
}

async function copyVariantPrompt() {
  const prompt = state.result?.variantPrompt || '';
  if (!prompt) return;
  await copyWithFeedback(event?.currentTarget || document.activeElement, prompt);
  setStatus('变体提示词已复制', 'success');
}

async function copyPalette() {
  const colors = state.result?.palette || [];
  if (!colors.length) return;
  const text = colors.map(color => `${color.hex} ${color.role || '参考色'}${Number.isFinite(color.ratio) ? ` ${color.ratio}%` : ''}`).join('；');
  await copyWithFeedback(event?.currentTarget || document.activeElement, text);
  setStatus(`已复制 ${colors.length} 个参考色`, 'success');
}

async function favoritePalette() {
  const colors = state.result?.palette || [];
  if (!colors.length) return;
  try {
    const signature = colors.map(color => `${color.hex}:${color.ratio || 0}`).join('|');
    const id = await stableFavoriteId('palette', signature);
    if (state.paletteFavorited) {
      await deleteLibraryRecord('combos', id);
      state.paletteFavorited = false;
      renderResult(state.result);
      setStatus('色卡收藏已取消', 'success');
      return;
    }
    const now = Date.now();
    await putLibraryRecord('combos', {
      id,
      title: state.result?.summary || '视觉反推参考色卡',
      type: 'color-palette',
      palette: colors,
      prompt: state.result?.reversePrompt || '',
      image: state.sourceDataUrl || state.capture?.dataUrl || state.capture?.srcUrl || '',
      imageType: state.result?.imageType || {},
      source: 'fbase-palette-favorite',
      captureMethod: 'palette-favorite',
      createdAt: now,
      updatedAt: now
    });
    state.paletteFavorited = true;
    renderResult(state.result);
    flashConfirm(event?.currentTarget || el.favoritePaletteButton);
    setStatus('参考色卡已收藏到 F·BASE', 'success');
  } catch (error) {
    setStatus(error.message || '参考色卡收藏失败', 'error');
  }
}

async function togglePaletteReference() {
  // 同 updateQuickSettings：基于 storage 最新值翻转，避免 stale state 覆盖其它开关
  let latest = state.quickSettings;
  try {
    const stored = await chrome.storage.local.get('fbaseQuickSettings');
    if (stored.fbaseQuickSettings) latest = normalizeQuickSettings(stored.fbaseQuickSettings);
  } catch {}
  state.quickSettings = normalizeQuickSettings({ ...latest, referencePalette: !latest.referencePalette });
  if (state.quickSettings.referencePalette) state.quickSettings.colorCardMode = true;
  await chrome.storage.local.set({ fbaseQuickSettings: state.quickSettings });
  if (state.result) renderResult(state.result);
  setStatus(state.quickSettings.referencePalette ? '生图时会参考当前色卡' : '生图时不再锁定当前色卡', 'success');
}

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const input = document.createElement('textarea');
    input.value = value;
    document.body.append(input);
    input.select();
    document.execCommand('copy');
    input.remove();
  }
}

// 操作成功微反馈（克制动效）：按钮轻微缩放 + 青绿极淡光晕一闪，600ms 自然消退
function flashConfirm(button) {
  if (!button) return;
  button.classList.remove('copy-flash');
  void button.offsetWidth; // 重启动画
  button.classList.add('copy-flash');
  setTimeout(() => button.classList.remove('copy-flash'), 600);
}

// 复制成功微反馈：轻闪 + 文案短暂切换为「已复制」，消除"复制没复制？"疑虑
async function copyWithFeedback(button, value, successText = '已复制') {
  if (!button) return copyText(value);
  const original = button.textContent;
  try {
    await copyText(value);
  } catch (error) {
    setStatus('复制失败，请手动选择文本复制', 'error');
    throw error;
  }
  flashConfirm(button);
  button.textContent = successText;
  setTimeout(() => { button.textContent = original; }, 700);
}

async function handleBreakdownFavorite(event) {
  try {
    const groupToggle = event.target.closest('[data-toggle-group]');
    if (groupToggle) {
      const key = groupToggle.dataset.toggleGroup;
      if (state.collapsedBreakdownGroups.has(key)) state.collapsedBreakdownGroups.delete(key);
      else state.collapsedBreakdownGroups.add(key);
      renderBreakdownWorkbench();
      return;
    }
    const groupFavorite = event.target.closest('[data-favorite-group]');
    if (groupFavorite) return await favoriteBreakdownGroup(groupFavorite.dataset.favoriteGroup);
    const editButton = event.target.closest('[data-edit-breakdown]');
    if (editButton) return await editBreakdownRow(editButton);
    const copyButton = event.target.closest('[data-copy-breakdown]');
    if (copyButton) {
      const entry = state.result?.breakdown?.find(item => item.key === copyButton.dataset.copyBreakdown);
      if (!entry) return;
      await copyWithFeedback(copyButton, `${entry.label}：${entry.value}`);
      setStatus(`已复制：${entry.label}`, 'success');
      return;
    }
    const chip = event.target.closest('[data-copy-chip]');
    if (chip) {
      // 拆解已随反推整体入库，点单个词条不再重复收藏，改为复制该词
      const text = chip.textContent.trim();
      if (!text) return;
      await copyText(text);
      flashConfirm(chip);
      setStatus(`已复制：${text}`, 'success');
      return;
    }
    const rowButton = event.target.closest('[data-favorite-row]');
    if (!rowButton) return;
    const entry = state.result?.breakdown?.find(item => item.key === rowButton.dataset.favoriteRow);
    if (!entry) return;
    if (state.favoritedTerms.has(entry.key)) {
      await removeFavoriteTerm(entry, entry.value);
      state.favoritedTerms.delete(entry.key);
      setStatus(`已取消整条收藏：${entry.label}`, 'success');
    } else {
      await saveFavoriteTerm(entry, entry.value, 'manual-favorite');
      state.favoritedTerms.add(entry.key);
      flashConfirm(rowButton);
      setStatus(`已收藏整条：${entry.label}，本次会话累计入库 ${state.sessionImportedTerms || 1} 条`, 'success');
    }
    renderResult(state.result);
  } catch (error) {
    renderBreakdownWorkbench();
    setStatus(error.message || '收藏失败，请确认词库后端已经启动', 'error');
  }
}

async function editBreakdownRow(button) {
  const entry = state.result?.breakdown?.find(item => item.key === button.dataset.editBreakdown);
  const row = button.closest('.breakdown-sheet-row');
  const capture = row?.querySelector('.breakdown-capture');
  if (!entry || !capture) return;
  const editing = button.dataset.editing === 'true';
  if (!editing) {
    capture.replaceChildren(document.createTextNode(entry.value));
    capture.contentEditable = 'true';
    capture.classList.add('is-editing');
    button.dataset.editing = 'true';
    button.textContent = '保存';
    capture.focus();
    const range = document.createRange();
    range.selectNodeContents(capture);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    return;
  }
  const value = capture.innerText.replace(/\s+/g, ' ').trim();
  if (!value) {
    setStatus('拆解内容不能为空', 'error');
    return;
  }
  entry.value = value;
  if (state.pendingImport?.analysis?.breakdown) {
    const pendingEntry = state.pendingImport.analysis.breakdown.find(item => item.key === entry.key);
    if (pendingEntry) pendingEntry.value = value;
  }
  await syncResultEdits();
  renderResult(state.result);
  setStatus(`已保存修改：${entry.label}`, 'success');
}

async function togglePromptEdit(kind) {
  const isVariant = kind === 'variant';
  const isXiezhen = kind === 'xiezhen';
  const editKey = isVariant ? 'variant' : (isXiezhen ? 'xiezhen' : 'prompt');
  const target = isVariant ? el.variantPrompt : (isXiezhen ? el.xiezhenPrompt : el.reversePrompt);
  const editing = Boolean(state.promptEditing[editKey]);
  if (!editing) {
    target.contentEditable = 'true';
    target.classList.add('is-editing');
    state.promptEditing[editKey] = true;
    target.focus();
    updateResultDockState();
    return;
  }
  const value = target.innerText.replace(/\s+/g, ' ').trim();
  if (!value) {
    setStatus('提示词不能为空', 'error');
    return;
  }
  if (isVariant) state.result.variantPrompt = value;
  else if (isXiezhen) state.result.xiezhenPrompt = value;
  else {
    state.result.reversePrompt = value;
    state.result.generationPrompt = value;
  }
  if (state.pendingImport?.analysis) {
    if (isVariant) state.pendingImport.analysis.variantPrompt = value;
    else if (isXiezhen) state.pendingImport.analysis.xiezhenPrompt = value;
    else {
      state.pendingImport.analysis.reversePrompt = value;
      state.pendingImport.analysis.generationPrompt = value;
    }
  }
  target.contentEditable = 'false';
  target.classList.remove('is-editing');
  state.promptEditing[editKey] = false;
  updateResultDockState();
  await syncResultEdits();
  renderResult(state.result);
  setStatus(isVariant ? '变体提示词已保存' : (isXiezhen ? '写真调整提示词已保存' : '完整提示词已保存'), 'success');
}

async function syncResultEdits() {
  if (!state.result) return;
  const historyIndex = state.history.findIndex(item => item.result?.analysisId === state.result.analysisId);
  if (historyIndex >= 0) {
    const previousResult = state.history[historyIndex].result || {};
    state.history[historyIndex] = { ...state.history[historyIndex], result: compactHistoryResult(state.result, previousResult) };
    await chrome.storage.local.set({ finnHistory: state.history });
    renderHistory();
  }
  if (!state.result.recipeId) return;
  await putLibraryRecord('recipes', {
    id: state.result.recipeId,
    prompt: state.result.reversePrompt || '',
    reversePrompt: state.result.reversePrompt || '',
    variantPrompt: state.result.variantPrompt || '',
    xiezhenPrompt: state.result.xiezhenPrompt || '',
    xiezhenMeta: state.result.xiezhenMeta || null,
    breakdown: state.result.breakdown || [],
    palette: state.result.palette || [],
    summary: state.result.summary || ''
  });
}

async function favoriteBreakdownGroup(groupKey) {
  const entries = (state.result?.breakdown || []).filter(entry => breakdownGroupForEntry(entry).key === groupKey && !state.favoritedTerms.has(entry.key));
  if (!entries.length) return;
  setStatus(`正在收藏这一组的 ${entries.length} 条拆解`, 'loading');
  for (const entry of entries) {
    await saveFavoriteTerm(entry, entry.value, 'group-favorite');
    state.favoritedTerms.add(entry.key);
  }
  renderResult(state.result);
  flashConfirm(document.querySelector(`[data-favorite-group="${groupKey}"]`));
  setStatus(`已收藏这一组的 ${entries.length} 条拆解`, 'success');
}

async function favoriteAllBreakdown() {
  const entries = (state.result?.breakdown || []).filter(entry => !state.favoritedTerms.has(entry.key));
  if (!entries.length) return;
  el.favoriteAllButton.disabled = true;
  setStatus(`正在批量收藏 ${entries.length} 条拆解`, 'loading');
  try {
    for (const entry of entries) {
      await saveFavoriteTerm(entry, entry.value, 'batch-favorite');
      state.favoritedTerms.add(entry.key);
    }
    renderResult(state.result);
    flashConfirm(el.favoriteAllButton);
    setStatus(`已批量收藏 ${entries.length} 条拆解，本次会话累计入库 ${state.sessionImportedTerms || entries.length} 条`, 'success');
  } catch (error) {
    renderResult(state.result);
    setStatus(error.message || '批量收藏失败', 'error');
  }
}

async function favoritePrompt(kind) {
  const isVariant = kind === 'variant';
  const isXiezhen = kind === 'xiezhen';
  const prompt = isVariant ? state.result?.variantPrompt : (isXiezhen ? state.result?.xiezhenPrompt : state.result?.reversePrompt);
  if (!prompt) return;
  try {
    const id = await stableFavoriteId('prompt', prompt);
    if (state.favoritedPrompts.has(kind)) {
      await deleteLibraryRecord('recipes', id);
      state.favoritedPrompts.delete(kind);
      renderPromptFavoriteState();
      setStatus(isVariant ? '已从档案移除变体提示词' : (isXiezhen ? '已从档案移除写真调整提示词' : '已从档案移除完整提示词'), 'success');
      return;
    }
    const now = Date.now();
    const record = {
      id,
      title: isVariant ? '同风格变体提示词' : (isXiezhen ? `${state.result?.xiezhenMeta?.templateLabel || '写真'}调整提示词` : (state.result?.summary || '视觉反推提示词')),
      summary: state.result?.summary || '',
      prompt,
      variantPrompt: isVariant ? prompt : (state.result?.variantPrompt || ''),
      image: state.sourceDataUrl || state.capture?.dataUrl || null,
      imageType: state.result?.imageType || {},
      breakdown: state.result?.breakdown || [],
      palette: state.result?.palette || [],
      quickSettings: state.result?.quickSettings || { ...state.quickSettings },
      model: state.settings.model,
      source: 'fbase-prompt-favorite',
      captureMethod: isXiezhen ? 'xiezhen-prompt-favorite' : 'prompt-favorite',
      createdAt: now,
      updatedAt: now
    };
    await putLibraryRecord('recipes', record);
    state.favoritedPrompts.add(kind);
    renderPromptFavoriteState();
    flashConfirm(event?.currentTarget);
    setStatus(isVariant ? '变体提示词已存到档案' : (isXiezhen ? '写真调整提示词已存到档案' : '完整提示词已存到档案'), 'success');
  } catch (error) {
    setStatus(error.message || '提示词存档案失败', 'error');
  }
}

function renderPromptFavoriteState() {
  const promptSaved = state.favoritedPrompts.has('prompt');
  const xiezhenSaved = state.favoritedPrompts.has('xiezhen');
  const variantSaved = state.favoritedPrompts.has('variant');
  el.favoritePromptButton.textContent = promptSaved ? '已收藏' : '收藏';
  el.favoritePromptButton.classList.toggle('is-favorited', promptSaved);
  el.favoritePromptButton.setAttribute('aria-pressed', String(promptSaved));
  el.favoriteXiezhenButton.textContent = xiezhenSaved ? '已收藏' : '收藏';
  el.favoriteXiezhenButton.classList.toggle('is-favorited', xiezhenSaved);
  el.favoriteXiezhenButton.setAttribute('aria-pressed', String(xiezhenSaved));
  el.favoriteVariantButton.textContent = variantSaved ? '已收藏' : '收藏';
  el.favoriteVariantButton.classList.toggle('is-favorited', variantSaved);
  el.favoriteVariantButton.setAttribute('aria-pressed', String(variantSaved));
  updateResultDockState();
}

async function saveFavoriteTerm(entry, value, captureMethod) {
  const axis = globalThis.FinnBreakdownLabels.getAxis(entry.key);
  // 统一在入库前清洗首尾标点，与九轴词条生成逻辑保持一致，杜绝"（真实人像摄影，"这类词条进库
  const cleanedValue = cleanAxisLabel(String(value || ''), 160);
  const label = (cleanedValue || String(entry.label || '').trim()).slice(0, 40);
  const axisLabel = axis === '视线与情绪' ? '人物情绪' : axis;
  const pairings = favoritePairingsForAxis(axis);
  const id = await stableFavoriteId(axis, cleanedValue);
  const now = Date.now();
  const record = {
    id,
    axis,
    label,
    value: cleanedValue.slice(0, 160),
    shortLine: `呈现${label}的${axisLabel}特征`,
    // 与插件视觉档案内容对齐：definition 用该栏位的完整观察原句，模板仅在原句缺失时兜底
    definition: String(entry.value || '').trim() || `${entry.label}维度中用于控制“${label}”这一视觉特征。`,
    effects: [`稳定${entry.label}的画面表现`, `强化${label}对应的视觉识别`],
    goodWith: pairings.goodWith,
    badWith: pairings.badWith,
    risks: `权重过高可能让${entry.label}显得刻意，并削弱其他视觉层级。`,
    annotation: state.result?.summary || '',
    image: null,
    subjectType: state.result?.subjectType || '通用',
    source: 'fbase-floating-favorite',
    sourceImage: state.capture?.srcUrl || '',
    sourcePage: state.capture?.pageUrl || '',
    sourcePrompt: el.promptInput.value.trim().slice(0, 3000),
    reversePrompt: (state.result?.reversePrompt || '').slice(0, 3000),
    breakdownKey: entry.key,
    breakdownLabel: entry.label,
    captureMethod,
    model: state.settings.model,
    createdAt: now,
    updatedAt: now
  };
  await putLibraryRecord('terms', record);
  // 入库闭环可见性（UX 审计 P0-1）：写入成功后本次会话累计 +1
  state.sessionImportedTerms = (state.sessionImportedTerms || 0) + 1;
}

function favoritePairingsForAxis(axis) {
  const values = {
    成像: { goodWith: ['主体层次清晰', '光线过渡自然'], badWith: ['多种成像质感混杂', '过度锐化处理'] },
    光线: { goodWith: ['主体受光明确', '环境色自然呼应'], badWith: ['多重光源方向冲突', '高光区域过曝'] },
    镜头: { goodWith: ['主体焦点清晰', '透视尺度自然'], badWith: ['焦点位置混乱', '极端透视变形'] },
    构图: { goodWith: ['视觉焦点明确', '画面留白合理'], badWith: ['主体重心失衡', '视线引导相互冲突'] },
    头部: { goodWith: ['人物轮廓清晰', '服装材质协调'], badWith: ['头发遮挡五官', '发丝结构粘连'] },
    '视线与情绪': { goodWith: ['头部姿态一致', '肢体情绪呼应'], badWith: ['表情含义冲突', '视线方向矛盾'] },
    动作: { goodWith: ['肢体重心自然', '人物与场景互动'], badWith: ['关节结构扭曲', '动作方向相互冲突'] },
    '配饰与服装': { goodWith: ['整体色彩呼应', '人物身份匹配'], badWith: ['装饰元素过载', '材质逻辑冲突'] },
    '场景与道具': { goodWith: ['光线方向一致', '空间尺度合理'], badWith: ['背景信息过度拥挤', '空间透视关系混乱'] }
  };
  return values[axis] || values.成像;
}

async function removeFavoriteTerm(entry, value) {
  const axis = globalThis.FinnBreakdownLabels.getAxis(entry.key);
  const raw = String(value || '');
  const cleaned = cleanAxisLabel(raw, 160);
  // 兼容清洗前后两种 ID：旧档案按原始值生成 ID，新档案按清洗值生成
  const ids = new Set([await stableFavoriteId(axis, raw)]);
  if (cleaned && cleaned !== raw) ids.add(await stableFavoriteId(axis, cleaned));
  for (const id of ids) await deleteLibraryRecord('terms', id);
}

async function putLibraryRecord(store, record) {
  const response = await runtimeSend({
    type: 'KBASE_FETCH',
    url: `${normalizeLibraryEndpoint(state.settings.libraryEndpoint)}/api/${store}`,
    method: 'PUT',
    timeout: 15000,
    body: record
  });
  if (!response?.ok) throw makeRequestError(response, false);
}

async function deleteLibraryRecord(store, id) {
  const response = await runtimeSend({
    type: 'KBASE_FETCH',
    url: `${normalizeLibraryEndpoint(state.settings.libraryEndpoint)}/api/${store}/${encodeURIComponent(id)}`,
    method: 'DELETE',
    timeout: 15000
  });
  if (!response?.ok) throw makeRequestError(response, false);
}

async function stableFavoriteId(namespace, value) {
  const data = new TextEncoder().encode(`${namespace}|${String(value || '').trim().toLocaleLowerCase('zh-CN')}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const hex = [...new Uint8Array(digest)].slice(0, 12).map(byte => byte.toString(16).padStart(2, '0')).join('');
  return `${namespace === 'prompt' ? 'r' : 't'}_fav_${hex}`;
}

function normalizeHistory(value) {
  if (!Array.isArray(value)) return [];
  return value.filter(item => item && typeof item === 'object' && item.id && item.result?.reversePrompt)
    .map(item => {
      const generatedAnalysisId = item.result?.generatedImage?.analysisId || '';
      const resultAnalysisId = item.result?.analysisId || '';
      if (!generatedAnalysisId || !resultAnalysisId || generatedAnalysisId === resultAnalysisId) return item;
      return { ...item, result: { ...item.result, generatedImage: null } };
    })
    .slice(0, MAX_HISTORY_ITEMS);
}

function compactHistoryResult(result, fallback = {}) {
  return {
    analysisVersion: result.analysisVersion || fallback.analysisVersion || '',
    analysisId: result.analysisId || fallback.analysisId || '',
    imageType: result.imageType || {},
    subjectType: result.subjectType || '',
    summary: result.summary || '',
    sections: Array.isArray(result.sections) ? result.sections : [],
    palette: Array.isArray(result.palette) ? result.palette : [],
    breakdown: Array.isArray(result.breakdown) ? result.breakdown : [],
    reversePrompt: result.reversePrompt || '',
    generationPrompt: result.generationPrompt || result.reversePrompt || '',
    reversePromptFull: result.reversePromptFull || result.reversePrompt || '',
    visualReconstructionSpec: result.visualReconstructionSpec || result.reversePromptFull || fallback.visualReconstructionSpec || fallback.reversePromptFull || '',
    variantPrompt: result.variantPrompt || '',
    xiezhenPrompt: result.xiezhenPrompt || '',
    xiezhenMeta: result.xiezhenMeta || null,
    assistantRevisions: Array.isArray(result.assistantRevisions) ? result.assistantRevisions.slice(-20) : [],
    generationStyleControls: resultGenerationStyleIds(result),
    generationImageControls: resultGenerationImageIds(result),
    sourceImage: result.sourceImage || fallback.sourceImage || fallback.generatedImage?.original || '',
    quickSettings: result.quickSettings || {},
    analyzed: Number(result.analyzed || 0),
    imported: Number(result.imported || 0),
    duplicates: Number(result.duplicates || 0),
    recipeId: result.recipeId || fallback.recipeId || '',
    autoImported: Boolean(result.autoImported),
    generatedImage: result.generatedImage && typeof result.generatedImage === 'object'
      ? result.generatedImage
      : (fallback.generatedImage && typeof fallback.generatedImage === 'object' ? fallback.generatedImage : null),
    axisCounts: result.axisCounts || {},
    qualityAudit: result.qualityAudit || null,
    terms: Array.isArray(result.terms) ? result.terms : []
  };
}

function openWorkspaceDb() {
  if (workspaceDbPromise) return workspaceDbPromise;
  workspaceDbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open('fbase-shared-workspace', 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('entries')) request.result.createObjectStore('entries', { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('无法打开共享工作台缓存'));
  });
  return workspaceDbPromise;
}

async function writeWorkspaceEntry(id, value) {
  const db = await openWorkspaceDb();
  await new Promise((resolve, reject) => {
    const transaction = db.transaction('entries', 'readwrite');
    transaction.objectStore('entries').put({ id, value });
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error || new Error('共享工作台写入失败'));
  });
}

async function readWorkspaceEntry(id) {
  const db = await openWorkspaceDb();
  return await new Promise((resolve, reject) => {
    const request = db.transaction('entries', 'readonly').objectStore('entries').get(id);
    request.onsuccess = () => resolve(request.result?.value || null);
    request.onerror = () => reject(request.error || new Error('共享工作台读取失败'));
  });
}

async function pruneWorkspaceTasks(activeIds) {
  const db = await openWorkspaceDb();
  const keep = new Set(activeIds.map(id => `task:${id}`));
  await new Promise((resolve, reject) => {
    const transaction = db.transaction('entries', 'readwrite');
    const store = transaction.objectStore('entries');
    const request = store.getAllKeys();
    request.onsuccess = () => request.result
      .filter(id => String(id).startsWith('task:') && !keep.has(id))
      .forEach(id => store.delete(id));
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error || new Error('共享任务缓存清理失败'));
  });
}

function scheduleWorkspacePublish() {
  if (!workspaceReady || applyingSharedWorkspace) return;
  clearTimeout(workspaceSyncTimer);
  workspaceSyncTimer = setTimeout(() => {
    workspaceSyncTimer = null;
    publishSharedWorkspace().catch(error => console.warn('F·BASE workspace publish failed', error));
  }, 80);
}

async function publishSharedWorkspace() {
  if (!workspaceReady || applyingSharedWorkspace) return;
  await Promise.all(state.taskQueue.map(task => writeWorkspaceEntry(`task:${task.id}`, task)));
  await pruneWorkspaceTasks(state.taskQueue.map(task => task.id));
  if (state.generatedImage) await writeWorkspaceEntry('generated:current', state.generatedImage);
  const result = state.result ? { ...compactHistoryResult(state.result), generatedImage: null } : null;
  const updatedAt = Date.now();
  lastWorkspaceUpdate = updatedAt;
  await chrome.storage.session.set({
    [WORKSPACE_SYNC_KEY]: {
      source: workspaceInstanceId,
      updatedAt,
      prompt: el.promptInput.value,
      queueIds: state.taskQueue.map(task => task.id),
      queueFallback: state.taskQueue.map(({ dataUrl, capture, ...task }) => ({ ...task, capture: capture ? { ...capture, dataUrl: '' } : null })),
      completedTasks: [...completedTaskTombstones.entries()],
      activeTaskId: state.activeTaskId,
      result,
      hasGeneratedImage: Boolean(state.generatedImage),
      resultView: state.resultView,
      favoritedTerms: [...state.favoritedTerms],
      favoritedPrompts: [...state.favoritedPrompts],
      paletteFavorited: state.paletteFavorited
    }
  });
}

async function recoverOrphanedRunnerTasks(tasks) {
  const runnerIds = [...new Set((tasks || [])
    .filter(task => (task?.status === 'running' || task?.status === 'queued') && task.runnerId && task.runnerId !== workspaceInstanceId)
    .map(task => task.runnerId))];
  if (!runnerIds.length) return tasks;
  const checks = await Promise.all(runnerIds.map(async runnerId => {
    try {
      const response = await runtimeSend({ type: 'FBASE_RUNNER_STATUS', runnerId });
      return [runnerId, response?.alive === true];
    } catch {
      return [runnerId, false];
    }
  }));
  const liveRunners = new Map(checks);
  const liveRunnerIds = new Set([...liveRunners.entries()].filter(([, alive]) => alive).map(([runnerId]) => runnerId));
  return tasks.map(task => TASK_QUEUE_RUNTIME.recoverOrphaned(task, liveRunnerIds, workspaceInstanceId)).filter(Boolean);
}

async function applySharedWorkspace(shared) {
  if (!shared || shared.source === workspaceInstanceId) return;
  const updatedAt = Number(shared.updatedAt) || 0;
  if (updatedAt && updatedAt < lastWorkspaceUpdate) return;
  lastWorkspaceUpdate = updatedAt;
  for (const entry of Array.isArray(shared.completedTasks) ? shared.completedTasks : []) {
    const [id, completedAt] = Array.isArray(entry) ? entry : [];
    if (!id || !Number(completedAt)) continue;
    completedTaskTombstones.set(id, Math.max(Number(completedTaskTombstones.get(id)) || 0, Number(completedAt)));
  }
  pruneCompletedTaskTombstones();
  const fallbacks = new Map((shared.queueFallback || []).map(task => [task.id, task]));
  const tasks = await Promise.all((shared.queueIds || []).map(async id => {
    try { return await readWorkspaceEntry(`task:${id}`) || fallbacks.get(id) || null; }
    catch { return fallbacks.get(id) || null; }
  }));
  const durableCompletions = await Promise.all(tasks.filter(Boolean).map(async task => {
    try { return [task.id, await readWorkspaceEntry(`completed:${task.id}`)]; }
    catch { return [task.id, null]; }
  }));
  for (const [id, record] of durableCompletions) {
    const completedAt = Number(record?.completedAt) || 0;
    if (!id || !completedAt) continue;
    completedTaskTombstones.set(id, Math.max(Number(completedTaskTombstones.get(id)) || 0, completedAt));
  }
  pruneCompletedTaskTombstones();
  const recoveredTasks = await recoverOrphanedRunnerTasks(tasks.filter(Boolean));
  const completedAnalysisIds = new Set(state.history.map(item => item.result?.analysisId).filter(Boolean));
  const completedSourceTaskIds = new Set(state.history.map(item => item.sourceTaskId).filter(Boolean));
  const liveTasks = recoveredTasks.filter(task => {
    if (!task || taskHasCompletedResult(task)) return false;
    const alreadySaved = completedSourceTaskIds.has(task.id) || (task.result?.analysisId && completedAnalysisIds.has(task.result.analysisId));
    if (alreadySaved) completedTaskTombstones.set(task.id, Date.now());
    return !alreadySaved;
  });
  const normalizedQueue = await dedupeQueuedCaptures(liveTasks);
  const mergedTasks = TASK_QUEUE_RUNTIME.mergeSharedTasks(
    normalizedQueue.tasks,
    state.taskQueue,
    runningTaskIds,
    completedTaskTombstones
  );
  let generatedImage = null;
  if (shared.hasGeneratedImage) {
    try { generatedImage = await readWorkspaceEntry('generated:current'); } catch {}
  }
  applyingSharedWorkspace = true;
  try {
    // 共享窗口更新队列时保留本窗口真正执行中的对象引用，让异步结果回写到同一张卡。
    state.taskQueue = mergedTasks;
    const normalizedActiveId = normalizedQueue.idMap.get(shared.activeTaskId) || shared.activeTaskId;
    state.activeTaskId = state.taskQueue.some(task => task.id === normalizedActiveId) ? normalizedActiveId : '';
    const activeTask = state.taskQueue.find(task => task.id === state.activeTaskId) || null;
    state.capture = activeTask?.capture || null;
    state.sourceDataUrl = activeTask?.dataUrl || activeTask?.capture?.dataUrl || '';
    state.uploadedName = activeTask?.name || '';
    state.localEvidence = null;
    state.result = shared.result || null;
    state.pendingImport = null;
    state.generatedImage = generatedImage;
    state.resultView = shared.resultView || 'result';
    state.favoritedTerms = new Set(shared.favoritedTerms || []);
    state.favoritedPrompts = new Set(shared.favoritedPrompts || []);
    state.paletteFavorited = Boolean(shared.paletteFavorited);
    if (document.activeElement !== el.promptInput && typeof shared.prompt === 'string') el.promptInput.value = shared.prompt;
    if (state.result) {
      renderResult(state.result);
    }
    else {
      el.resultCard.classList.add('hidden');
      renderGeneratedResult();
    }
    renderCapture();
    renderInputState();
    renderHistory();
  } finally {
    applyingSharedWorkspace = false;
  }
}

async function createHistoryThumbnail(dataUrl) {
  if (!dataUrl) return '';
  try {
    const image = await loadImage(dataUrl);
    const scale = Math.min(1, 160 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) return '';
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.62);
  } catch {
    return '';
  }
}

// 生成图入历史用的高清预览：长边 1280 / JPEG 0.9。
// 不能复用 160px 的 createHistoryThumbnail——那个是列表小缩略图级别，
// 用来存生成图本体会导致从历史打开时预览发糊。
async function createGeneratedImagePreview(dataUrl) {
  if (!dataUrl) return '';
  try {
    const image = await loadImage(dataUrl);
    const scale = Math.min(1, 1280 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) return '';
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.9);
  } catch {
    return dataUrl;
  }
}

async function saveHistory(result, imageDataUrl, task) {
  try {
    const enriched = {
      ...result,
      sourceImage: imageDataUrl
        || (task ? task.sourceDataUrl : state.sourceDataUrl)
        || (task ? task.capture?.dataUrl : state.capture?.dataUrl)
        || (task ? task.capture?.srcUrl : state.capture?.srcUrl)
        || result.sourceImage || ''
    };
    const entry = {
      id: `history_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      sourceTaskId: task?.id || state.activeTaskId || '',
      createdAt: Date.now(),
      model: task?.settingsSnapshot?.model || state.settings.model || '',
      thumbnail: await createHistoryThumbnail(enriched.sourceImage),
      result: compactHistoryResult(enriched)
    };
    const history = [entry, ...state.history.filter(item => item.result?.analysisId !== enriched.analysisId)]
      .slice(0, MAX_HISTORY_ITEMS);
    while (history.length > 1 && historyByteLength(history) > MAX_HISTORY_BYTES) history.pop();
    state.history = history;
    await chrome.storage.local.set({ finnHistory: history });
    renderHistory();
  } catch (error) {
    console.warn('F·BASE history save failed', error);
  }
}

async function attachGeneratedImageToHistory(generatedImage = state.generatedImage, resultContext = state.result) {
  if (!generatedImage || !resultContext?.analysisId) return;
  try {
    const geometry = { requestedAspect: generatedImage.requestedAspect, actualWidth: generatedImage.actualWidth, actualHeight: generatedImage.actualHeight, aspectWarning: generatedImage.aspectWarning };
    const feedback = { feedbackId: generatedImage.feedbackId, feedbackTags: generatedImage.feedbackTags, feedbackCreatedAt: generatedImage.feedbackCreatedAt, feedbackSavedAt: generatedImage.feedbackSavedAt };
    const storedImage = generatedImage.url
      ? { url: generatedImage.url, dataUrl: '', model: generatedImage.model, prompt: generatedImage.prompt, createdAt: generatedImage.createdAt, similarityScore: generatedImage.similarityScore, calibrationRounds: generatedImage.calibrationRounds, taskId: generatedImage.taskId, analysisId: generatedImage.analysisId, ...geometry, ...feedback }
      : { url: '', dataUrl: await createGeneratedImagePreview(generatedImage.dataUrl), model: generatedImage.model, prompt: generatedImage.prompt, createdAt: generatedImage.createdAt, similarityScore: generatedImage.similarityScore, calibrationRounds: generatedImage.calibrationRounds, taskId: generatedImage.taskId, analysisId: generatedImage.analysisId, ...geometry, ...feedback };
    state.history = state.history.map(item => item.result?.analysisId === resultContext.analysisId
      ? { ...item, result: { ...item.result, generatedImage: storedImage } }
      : item);
    while (state.history.length > 1 && historyByteLength(state.history) > MAX_HISTORY_BYTES) state.history.pop();
    await chrome.storage.local.set({ finnHistory: state.history });
    renderHistory();
  } catch (error) {
    console.warn('F·BASE generated history save failed', error);
  }
}

// 生成成功后把作品同步到后端作品库，网站「工作台 → 作品库」画廊可见；后端未启动时静默跳过
function syncWorkToBackend(generated = state.generatedImage, resultContext = state.result) {
  if (!generated) return;
  runtimeSend({
    type: 'KBASE_FETCH',
    url: `${normalizeLibraryEndpoint(state.settings.libraryEndpoint)}/api/works`,
    method: 'PUT',
    timeout: 30000,
    body: {
      id: `work_${generated.createdAt || Date.now()}_ext`,
      prompt: generated.prompt || '',
      model: generated.model || '',
      analysisId: resultContext?.analysisId || generated.analysisId || '',
      image: generated.dataUrl ? { dataUrl: generated.dataUrl } : { url: generated.url },
      origin: 'extension',
      favorited: false
    }
  }).then(response => {
    if (!response?.ok) console.warn('F·BASE work sync skipped', response?.error || response?.status);
  }).catch(error => console.warn('F·BASE work sync failed', error));
}

function historyByteLength(history) {
  return new TextEncoder().encode(JSON.stringify(history)).byteLength;
}

function renderHistory() {
  removeCompletedQueueGhosts();
  el.historyList.replaceChildren();
  hideThumbPreview();     // 行节点被换掉了，预览浮层必须收掉，否则会停在一个已销毁的图上
  const taskCount = state.taskQueue.length;
  const visibleHistory = state.history;
  const visibleCount = taskCount + visibleHistory.length;
  el.historyEmpty.querySelector('span:last-child').textContent = '新任务和已完成任务会显示在这里。';
  el.historyEmpty.classList.toggle('hidden', visibleCount > 0);
  el.clearHistoryButton.disabled = state.history.length === 0;
  if (el.queueBadge) el.queueBadge.textContent = String(taskCount + state.history.length);
  document.querySelector('.task-strip')?.classList.remove('is-collapsed');
  state.taskQueue.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = `history-item queue-task ${item.id === state.activeTaskId ? 'is-active' : ''} is-${item.status || 'waiting'}`;
    row.tabIndex = 0;
    row.dataset.queueTaskId = item.id;
    row.setAttribute('role', 'button');
    row.setAttribute('aria-label', `打开队列任务 ${item.name}`);
    const thumb = document.createElement('div');
    thumb.className = 'history-thumb';
    if (item.thumbnail) {
      const image = document.createElement('img');
      image.src = item.thumbnail;
      image.alt = '';
      thumb.append(image);
    } else thumb.textContent = 'F';
    const copy = document.createElement('div');
    copy.className = 'history-copy';
    const title = document.createElement('strong');
    // 未开始的卡统一显示为普通任务，完成卡由终态锁和完成日志直接移出队列。
    if (item.status === 'running') title.textContent = `运行中 ${index + 1}`;
    else if (item.status === 'queued') title.textContent = `排队中 ${index + 1}`;
    else if (item.status === 'error') title.textContent = `失败 ${index + 1}`;
    else if (item.overwriteAnalysisId) title.textContent = `重推 ${index + 1}`;
    else title.textContent = `任务 ${index + 1}`;
    const meta = document.createElement('small');
    if (item.status === 'running') {
      const phaseLabel = TASK_PHASE_LABELS[item.phase] || '视觉反推';
      meta.textContent = item.overwriteAnalysisId ? `重推：${phaseLabel}` : phaseLabel;
    } else if (item.status === 'queued') {
      meta.textContent = '等待并发空位';
    } else if (item.status === 'error') {
      meta.textContent = item.error || '失败';
    } else if (item.overwriteAnalysisId) {
      meta.textContent = '点击开始覆盖旧档案';
    } else {
      meta.textContent = '点击开始反推';
    }
    copy.append(title, meta);
    const run = document.createElement('button');
    run.type = 'button';
    run.className = 'ui-icon-tile tile-ghost history-run';
    run.dataset.runQueueTask = item.id;
    run.setAttribute('aria-label', '开始反推这个独立任务');
    run.title = '开始反推';
    run.innerHTML = UI_ICONS.play;
    run.hidden = item.status === 'running' || item.status === 'queued';
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'ui-icon-tile tile-ghost history-delete';
    remove.dataset.deleteQueueTask = item.id;
    remove.setAttribute('aria-label', '删除这个队列任务');
    remove.innerHTML = UI_ICONS.trash;
    remove.disabled = taskIsInFlight(item);
    remove.hidden = taskIsInFlight(item);
    row.append(thumb, copy, run, remove);
    if (item.thumbnail) row.append(buildRowZoomButton());
    el.historyList.append(row);
  });
  visibleHistory.forEach((item, index) => {
    const row = document.createElement('div');
    const activeAnalysisId = !state.activeTaskId ? state.result?.analysisId || '' : '';
    const isActiveHistory = Boolean(activeAnalysisId && item.result?.analysisId === activeAnalysisId);
    row.className = `history-item ${isActiveHistory ? 'is-active' : ''}`;
    row.tabIndex = 0;
    row.dataset.historyId = item.id;
    row.setAttribute('role', 'button');
    row.setAttribute('aria-label', `打开历史记录 ${item.result.summary || '视觉反推'}`);
    const thumb = document.createElement('div');
    thumb.className = 'history-thumb';
    if (item.thumbnail) {
      const image = document.createElement('img');
      image.src = item.thumbnail;
      image.alt = '';
      thumb.append(image);
    } else {
      thumb.textContent = 'F';
    }
    const copy = document.createElement('div');
    copy.className = 'history-copy';
    const title = document.createElement('strong');
    title.textContent = `#${state.history.length - index}`;
    const meta = document.createElement('small');
    meta.textContent = [item.result.imageType?.label, `${item.result.analyzed || 0}`].filter(Boolean).join(' · ');
    copy.append(title, meta);
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'ui-icon-tile tile-ghost history-delete';
    remove.dataset.deleteHistory = item.id;
    remove.setAttribute('aria-label', '删除这条历史记录');
    remove.innerHTML = UI_ICONS.trash;
    const redo = document.createElement('button');
    redo.type = 'button';
    redo.className = 'ui-icon-tile tile-ghost history-redo';
    redo.dataset.redoHistory = item.id;
    redo.setAttribute('aria-label', '用档案原图重新反推并覆盖');
    redo.title = '重新反推（覆盖旧档案）';
    redo.innerHTML = UI_ICONS.refresh;
    row.append(thumb, copy, redo, remove);
    if (item.thumbnail || item.result?.sourceImage) row.append(buildRowZoomButton());
    el.historyList.append(row);
  });
  renderTaskNavigator();
  renderQueueStats();
  scheduleWorkspacePublish();
}

function renderQueueStats() {
  const unqueuedCurrent = !state.activeTaskId && (state.running || state.result || state.capture || el.promptInput?.value.trim()) ? 1 : 0;
  const total = state.history.length + state.taskQueue.length + unqueuedCurrent;
  const queuedRunning = state.taskQueue.filter(item => item.status === 'running').length;
  const running = queuedRunning + (state.running && !state.activeTaskId ? 1 : 0);
  el.queueStats.textContent = `${total} 个任务 · ${running} 个运行中 · ${state.history.length} 个已完成`;
}

function formatHistoryTime(value) {
  const date = new Date(Number(value) || Date.now());
  return new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
}

function handleHistoryClick(event) {
  if (stripDragSuppressClick) {          // 刚刚是在横向滑动，不当成点击
    stripDragSuppressClick = false;
    return;
  }
  // 看原图走专属的放大镜按钮，卡片其余任何地方都是"打开这个任务"——不再有歧义
  const zoomButton = event.target.closest('[data-zoom-row]');
  if (zoomButton) {
    event.stopPropagation();
    const src = fullImageForRow(zoomButton.closest('.history-item'));
    if (src) {
      hideThumbPreview();
      openThumbViewer(src);
    }
    return;
  }
  const runQueueTaskButton = event.target.closest('[data-run-queue-task]');
  if (runQueueTaskButton) {
    event.stopPropagation();
    const task = state.taskQueue.find(item => item.id === runQueueTaskButton.dataset.runQueueTask);
    if (task) requestTaskRun(task, false);
    return;
  }
  const deleteQueueButton = event.target.closest('[data-delete-queue-task]');
  if (deleteQueueButton) {
    event.stopPropagation();
    deleteQueuedTask(deleteQueueButton.dataset.deleteQueueTask);
    return;
  }
  const deleteButton = event.target.closest('[data-delete-history]');
  if (deleteButton) {
    event.stopPropagation();
    deleteHistory(deleteButton.dataset.deleteHistory);
    return;
  }
  const redoButton = event.target.closest('[data-redo-history]');
  if (redoButton) {
    event.stopPropagation();
    redoHistoryTask(redoButton.dataset.redoHistory);
    return;
  }
  const row = event.target.closest('[data-history-id]');
  if (row) {
    closeQueueDrawer();     // 选完就收起，露出后面的结果，想再换任务点顶栏即可
    return openHistory(row.dataset.historyId);
  }
  const queueRow = event.target.closest('[data-queue-task-id]');
  if (queueRow) {
    closeQueueDrawer();
    activateQueuedTask(queueRow.dataset.queueTaskId);
  }
}

const STRIP_WHEEL_GESTURE_MS = 500;   // 连续手势的判定窗口：超过这个间隔算"新手势"
const STRIP_WHEEL_RELEASE_DELTA = 40; // 到头后，单次要超过这个竖向位移才认定"确实想滚页面"
let stripWheelLastAt = 0;

/**
 * 任务队列是横向长条：手指/触控板斜着划一下，浏览器常常把它判成"竖向"手势，
 * 而长条本身 overflow-y:hidden 吃不下竖向滚动，于是整页被带着往上跑。
 * 这里接管 wheel，把整段连续手势都锁在横向——包括已经滑到第一个/最后一个之后。
 *
 * 交还页面的条件很苛刻，三个都要满足：
 *   1. 已经到头，2. 是中断后重新起手，3. 单次位移够大（明确在竖着滚）。
 * 少了第 3 条就会出现"停下来看一眼预览，再划就飞到页面顶部"——触控板日常
 * 位移只有个位数，永远不该被当成想滚页面。
 */
function handleStripWheel(event) {
  const strip = event.currentTarget;
  const max = strip.scrollWidth - strip.clientWidth;
  if (max <= 1) {                             // 没有超宽内容，或长条已收起 → 交给页面正常滚动
    stripWheelLastAt = 0;
    return;
  }
  const now = event.timeStamp || Date.now();
  const sameGesture = stripWheelLastAt > 0 && now - stripWheelLastAt < STRIP_WHEEL_GESTURE_MS;
  stripWheelLastAt = now;
  const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? strip.clientWidth : 1;
  const dx = (event.deltaX || 0) * unit;
  const dy = (event.deltaY || 0) * unit;
  // 横向为主（含斜滑）用 deltaX；竖向为主（普通滚轮 / 触控板上下）把 deltaY 映射成横向
  const delta = Math.abs(dx) >= Math.abs(dy) ? dx : dy;
  if (!delta) return;
  const atStart = delta < 0 && strip.scrollLeft <= 0;
  const atEnd = delta > 0 && strip.scrollLeft >= max - 1;
  const strongVertical = Math.abs(dy) >= STRIP_WHEEL_RELEASE_DELTA && Math.abs(dy) > Math.abs(dx);
  if ((atStart || atEnd) && !sameGesture && strongVertical) return;  // 三个条件齐了才交还页面
  event.preventDefault();                                           // 其余一律吃掉，页面不动
  strip.scrollLeft = Math.max(0, Math.min(max, strip.scrollLeft + delta));
}

// ===== 队列 / 历史缩略图：悬停看大图，点缩略图全屏看，不再被强制跳到下方 =====

const THUMB_PREVIEW_DELAY_MS = 200;   // 悬停多久才弹预览，避免扫过时乱闪
const THUMB_DRAG_SLOP_PX = 8;         // 位移超过这个距离就认定是"在滑动"，不算点击
let thumbPreviewTimer = 0;
let thumbPreviewRow = null;
let thumbPreviewSrc = '';
let thumbPointerStart = null;
let stripDragSuppressClick = false;

// 缩略图右下角的放大镜，是"全屏看原图"的唯一入口，和"点卡片打开任务"彻底分开
function buildRowZoomButton() {
  const zoom = document.createElement('button');
  zoom.type = 'button';
  zoom.className = 'ui-icon-tile tile-ghost history-zoom';
  zoom.dataset.zoomRow = '1';
  zoom.setAttribute('aria-label', '全屏查看原图');
  zoom.title = '全屏查看原图';
  zoom.innerHTML = UI_ICONS.zoom;
  return zoom;
}

// 拿到这一条的"原图"：历史记录有完整 sourceImage，队列任务用的是原始捕获图
function fullImageForRow(row) {
  if (!row) return '';
  const historyId = row.dataset.historyId;
  if (historyId) {
    const entry = state.history.find(item => item.id === historyId);
    return entry?.result?.sourceImage || entry?.thumbnail || '';
  }
  const taskId = row.dataset.queueTaskId;
  if (taskId) {
    const task = state.taskQueue.find(item => item.id === taskId);
    return task?.thumbnail || task?.capture?.dataUrl || task?.capture?.srcUrl || '';
  }
  return '';
}

function positionThumbPreview(row) {
  if (!row || !el.thumbPreview || el.thumbPreview.hidden) return;
  const rect = row.getBoundingClientRect();
  const box = el.thumbPreview.getBoundingClientRect();
  const margin = 8;
  let left = rect.left + rect.width / 2 - box.width / 2;
  left = Math.max(margin, Math.min(left, window.innerWidth - box.width - margin));
  let top = rect.top - box.height - 8;
  if (top < margin) top = rect.bottom + 8;
  top = Math.max(margin, Math.min(top, window.innerHeight - box.height - margin));
  el.thumbPreview.style.left = `${Math.round(left)}px`;
  el.thumbPreview.style.top = `${Math.round(top)}px`;
}

function showThumbPreview(row) {
  const src = fullImageForRow(row);
  if (!src || !el.thumbPreview) return;
  thumbPreviewRow = row;
  const image = el.thumbPreviewImage;
  if (thumbPreviewSrc !== src) {   // 用变量而不是 dataset 记录，避免把整段 dataURL 再往 DOM 里塞一份
    thumbPreviewSrc = src;
    image.src = src;
  }
  // 先挂上但不显形：图片没加载完时盒子只有十几像素高，此刻算出来的位置是错的，
  // 等图到位再定位 + 淡入，浮层才不会先出现再跳一下。
  el.thumbPreview.classList.remove('is-visible');
  el.thumbPreview.hidden = false;
  const reveal = () => {
    if (thumbPreviewRow !== row) return;            // 期间鼠标已经挪走了
    positionThumbPreview(row);
    el.thumbPreview.classList.add('is-visible');
  };
  if (image.complete && image.naturalWidth) reveal();
  else {
    image.onload = reveal;
    image.onerror = () => { if (thumbPreviewRow === row) hideThumbPreview(); };
  }
}

function hideThumbPreview() {
  if (thumbPreviewTimer) {
    clearTimeout(thumbPreviewTimer);
    thumbPreviewTimer = 0;
  }
  thumbPreviewRow = null;
  thumbPreviewSrc = '';
  if (!el.thumbPreview) return;
  el.thumbPreview.classList.remove('is-visible');
  el.thumbPreview.hidden = true;
  el.thumbPreviewImage?.removeAttribute('src');
}

function handleThumbPointerOver(event) {
  if (event.pointerType === 'touch') return;      // 触屏不弹悬停浮层，免得挡住点击
  const row = event.target.closest('.history-item');
  if (!row || row === thumbPreviewRow) return;
  if (thumbPreviewTimer) clearTimeout(thumbPreviewTimer);
  if (el.thumbPreview) {
    el.thumbPreview.classList.remove('is-visible');
    el.thumbPreview.hidden = true;
  }
  thumbPreviewRow = row;
  thumbPreviewTimer = setTimeout(() => showThumbPreview(row), THUMB_PREVIEW_DELAY_MS);
}

function handleThumbPointerOut(event) {
  if (event.pointerType === 'touch') return;
  const next = event.relatedTarget;
  if (next && event.currentTarget.contains(next)) return;   // 还在长条里，先不收
  hideThumbPreview();
}

function handleThumbPointerDown(event) {
  thumbPointerStart = { x: event.clientX, y: event.clientY };
  stripDragSuppressClick = false;
}

// 这是"滑动误触跳转"的防线：手/鼠标挪动超过阈值就记一笔，随后的 click 直接丢掉
function handleThumbPointerMove(event) {
  if (!thumbPointerStart) return;
  const moved = Math.abs(event.clientX - thumbPointerStart.x) > THUMB_DRAG_SLOP_PX
    || Math.abs(event.clientY - thumbPointerStart.y) > THUMB_DRAG_SLOP_PX;
  if (!moved) return;
  stripDragSuppressClick = true;
  thumbPointerStart = null;
  hideThumbPreview();
}

function openThumbViewer(src) {
  if (!src || !el.thumbViewer) return;
  el.thumbViewerImage.src = src;
  el.thumbViewer.hidden = false;
  document.body.style.overflow = 'hidden';
  document.documentElement.style.overflow = 'hidden';
  el.thumbViewerClose?.focus?.({ preventScroll: true });   // focus 默认会把元素滚进视野，必须拦掉
}

function closeThumbViewer() {
  if (!el.thumbViewer || el.thumbViewer.hidden) return;
  el.thumbViewer.hidden = true;
  el.thumbViewerImage.removeAttribute('src');
  document.body.style.overflow = '';
  document.documentElement.style.overflow = '';
}

function handleHistoryKeydown(event) {
  if (event.target.closest('[data-delete-history], [data-delete-queue-task], [data-redo-history], [data-run-queue-task]')) return;
  if (event.key !== 'Enter' && event.key !== ' ') return;
  const row = event.target.closest('[data-history-id]');
  event.preventDefault();
  if (row) return openHistory(row.dataset.historyId);
  const queueRow = event.target.closest('[data-queue-task-id]');
  if (queueRow) activateQueuedTask(queueRow.dataset.queueTaskId);
}

function deleteQueuedTask(id) {
  const task = state.taskQueue.find(item => item.id === id);
  if (taskIsInFlight(task)) {
    setStatus('运行中的独立任务会保留到完成', 'error');
    return;
  }
  const wasActive = state.activeTaskId === id;
  state.taskQueue = state.taskQueue.filter(item => item.id !== id);
  if (wasActive) {
    state.activeTaskId = '';
    clearImage();
  }
  renderHistory();
  setStatus('队列任务已删除', 'success');
}

function historyImageCandidate(value) {
  if (typeof value === 'string') return value.trim();
  if (!value || typeof value !== 'object') return '';
  return String(value.dataUrl || value.url || value.srcUrl || '').trim();
}

function absoluteArchiveImageUrl(value) {
  const source = historyImageCandidate(value);
  if (/^https?:\/\//i.test(source)) return source;
  if (source.startsWith('/media/')) return `${normalizeLibraryEndpoint(state.settings.libraryEndpoint)}${source}`;
  return '';
}

async function resolveHistoryRedoImage(entry, archive) {
  const fullCandidates = [
    archive?.image,
    archive?.sourceImage,
    entry?.result?.sourceImage,
    entry?.result?.generatedImage?.original
  ].map(historyImageCandidate).filter(Boolean);
  const direct = fullCandidates.find(value => /^data:image\/(?:jpe?g|png|webp|gif|avif);base64,/i.test(value));
  if (direct) return { dataUrl: direct, sourceUrl: '', degraded: false };
  for (const candidate of fullCandidates) {
    const sourceUrl = absoluteArchiveImageUrl(candidate);
    if (!sourceUrl) continue;
    try {
      const fetched = await runtimeSend({ type: 'IMAGE_FETCH', url: sourceUrl });
      if (fetched?.ok && /^data:image\//i.test(fetched.dataUrl || '')) {
        return { dataUrl: fetched.dataUrl, sourceUrl, degraded: false };
      }
    } catch (_) {}
  }
  const thumbnail = historyImageCandidate(entry?.thumbnail);
  if (/^data:image\//i.test(thumbnail)) return { dataUrl: thumbnail, sourceUrl: '', degraded: true };
  return { dataUrl: '', sourceUrl: '', degraded: false };
}

// 历史条目重推：从词库档案取原图，重新反推并原地覆盖旧档案（词条库按内容判重不受影响）
async function redoHistoryTask(historyId) {
  const entry = state.history.find(item => item.id === historyId);
  const analysisId = entry?.result?.analysisId;
  if (!entry || !analysisId) return;
  if (state.running) {
    setStatus('当前纯提示词任务正在运行，请稍后再重推', 'error');
    return;
  }
  setStatus('正在从词库档案获取原图…', 'loading');
  let archive = null;
  try {
    const response = await runtimeSend({
      type: 'KBASE_FETCH',
      url: `${normalizeLibraryEndpoint(state.settings.libraryEndpoint)}/api/recipes`,
      method: 'GET',
      timeout: 15000
    });
    if (response?.ok) {
      const recipes = Array.isArray(response.data)
        ? response.data
        : (Array.isArray(response.data?.items) ? response.data.items : []);
      archive = recipes.find(item => item.analysisId === analysisId)
        || recipes.find(item => entry.result.recipeId && item.id === entry.result.recipeId)
        || null;
    }
  } catch (_) { /* 后端未启动时走下方提示 */ }
  const recoveredImage = await resolveHistoryRedoImage(entry, archive);
  const imageDataUrl = recoveredImage.dataUrl;
  if (!imageDataUrl) {
    setStatus('档案原图已经丢失，当前记录也没有可恢复的预览图。请重新添加原图后再反推', 'error');
    return;
  }
  const restoredSourceUrl = recoveredImage.sourceUrl
    || absoluteArchiveImageUrl(archive?.sourceImage)
    || absoluteArchiveImageUrl(entry.result.sourceImage);
  const redoCapture = {
    captureId: createCaptureEventId('redo'),
    dataUrl: imageDataUrl,
    pageTitle: archive?.sourceTitle || entry.result.summary || '档案重推',
    pageUrl: archive?.sourcePage || '',
    srcUrl: restoredSourceUrl,
    alt: '',
    capturedAt: Date.now(),
    captureMethod: 'archive-redo'
  };
  const task = {
    id: await captureTaskId(redoCapture),
    name: `重推：${entry.result.summary || '反推档案'}`,
    status: 'waiting',
    createdAt: Date.now(),
    thumbnail: entry.thumbnail || '',
    dataUrl: imageDataUrl,
    capture: redoCapture,
    overwriteAnalysisId: analysisId
  };
  state.taskQueue.push(task);
  await activateQueuedTask(task.id);
  setStatus(recoveredImage.degraded
    ? '完整原图已缺失，已使用档案预览图发起重推，细节精度可能降低'
    : '已用档案原图发起重新反推，结果将覆盖旧档案', recoveredImage.degraded ? 'loading' : 'success');
  analyzeAndContinue();
}

// 九轴词条清洗：剥掉 LLM 输出残留在词条首尾的括号与标点
// （如"（真实人像摄影，"→"真实人像摄影"、"【（《胶片感》），】"→"胶片感"），截断后再清一次尾部防暴露新标点
function cleanAxisLabel(text, max = 40) {
  let value = String(text || '').trim();
  // 覆盖全部常见中英文开闭对 + 标点/符号，避免"】）》」』"这些闭字符只出现在一侧时剥不掉
  const edgeChars = '\\s（）()〔〕【】〖〗「」『』《》〈〉<>［］{}·・\\-—_|｜,.，、；;：:。.！!？?~～*"\'"' + "'" + '"' + '`‛“”‘’‹›«»„"';
  const startRe = new RegExp('^[' + edgeChars + ']+', 'u');
  const endRe = new RegExp('[' + edgeChars + ']+$', 'u');
  for (let round = 0; round < 4; round += 1) {
    const next = value.replace(startRe, '').replace(endRe, '');
    if (next === value) break;
    value = next;
  }
  const tailRe = new RegExp('[,，。.、:：;；!！?？~～*、·・\\-—_|｜]+$', 'u');
  return value.slice(0, max).replace(tailRe, '').trim();
}

function openHistory(id) {
  const item = state.history.find(candidate => candidate.id === id);
  if (!item) return;
  state.result = item.result;
  state.activeTaskId = '';
  // 历史恢复原图：挂到 sourceDataUrl / generatedImage.original 上
  // 让 renderGeneratedResult 和 原图/对比 按钮能找到原图
  const sourceImage = item.result.sourceImage || item.thumbnail || '';
  state.sourceDataUrl = sourceImage;
  if (item.result.generatedImage) {
    state.generatedImage = { ...item.result.generatedImage, original: item.result.generatedImage.original || sourceImage, favorited: false, eagleSaved: false };
  } else {
    state.generatedImage = null;
  }
  // 历史条目不带 capture 对象（避免与当前采集浮动窗混淆），清空以免内容混乱
  state.capture = null;
  state.uploadedName = '';
  state.localEvidence = null;
  state.pendingImport = null;
  state.favoritedTerms = new Set();
  state.favoritedPrompts = new Set();
  state.paletteFavorited = false;
  renderResult(item.result, { forceExpand: true });
  renderInputState();
  renderCapture();
  renderHistory();
  setStatus('已打开历史记录，可以查看或复制完整中文提示词', 'success');
  revealCurrentResult();
}

async function deleteHistory(id) {
  state.history = state.history.filter(item => item.id !== id);
  await chrome.storage.local.set({ finnHistory: state.history });
  renderHistory();
}

async function clearHistory() {
  state.history = [];
  await chrome.storage.local.remove('finnHistory');
  renderHistory();
  setStatus('拆解历史已清空', 'success');
}

function invalidateAnalysis() {
  state.revision += 1;
  state.result = null;
  state.pendingImport = null;
  state.localEvidence = null;
  state.generatedImage = null;
  renderGeneratedResult();
  el.resultCard.classList.add('hidden');
  scheduleWorkspacePublish();
}

async function extractLocalImageEvidence(dataUrl, includePalette = true) {
  const image = await loadImage(dataUrl);
  const maxSide = 224;
  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('无法读取图片像素，请重新选择图片');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  let palette = [];
  if (includePalette) {
    palette = globalThis.FBaseColorField.extractDeterministicPalettePixels(
      pixels.data,
      canvas.width,
      canvas.height,
      { language: 'zh' }
    );
  }
  const sourceAspectRatio = globalThis.FBaseImageSizing.resolveMeasuredAspectRatio(
    `${image.naturalWidth}x${image.naturalHeight}`
  );
  return {
    width: image.naturalWidth,
    height: image.naturalHeight,
    aspectRatio: sourceAspectRatio,
    sourceAspectRatio,
    generationAspectRatio: globalThis.FBaseImageSizing.resolveSupportedAspectRatio(
      `${image.naturalWidth}x${image.naturalHeight}`
    ),
    tonalEvidence: summarizeTonalEvidence(pixels.data, canvas.width, canvas.height),
    palette
  };
}

function summarizeTonalEvidence(data, width, height) {
  const regionNames = ['左上', '上中', '右上', '左中', '中央', '右中', '左下', '下中', '右下'];
  const cells = regionNames.map(region => ({ region, count: 0, lightness: 0, red: 0, green: 0, blue: 0 }));
  let count = 0;
  let lightnessSum = 0;
  let lightnessSquareSum = 0;
  let chromaSum = 0;
  let darkCount = 0;
  let highlightCount = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      if (data[offset + 3] < 16) continue;
      const red = data[offset];
      const green = data[offset + 1];
      const blue = data[offset + 2];
      const lab = globalThis.FBaseColorField.rgbToOklab(red, green, blue);
      const chroma = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
      count += 1;
      lightnessSum += lab.L;
      lightnessSquareSum += lab.L * lab.L;
      chromaSum += chroma;
      if (lab.L < 0.3) darkCount += 1;
      if (lab.L > 0.88) highlightCount += 1;
      const column = Math.min(2, Math.floor(x * 3 / Math.max(1, width)));
      const row = Math.min(2, Math.floor(y * 3 / Math.max(1, height)));
      const cell = cells[row * 3 + column];
      cell.count += 1;
      cell.lightness += lab.L;
      cell.red += red;
      cell.green += green;
      cell.blue += blue;
    }
  }
  const safeCount = Math.max(1, count);
  const meanLightness = lightnessSum / safeCount;
  const variance = Math.max(0, lightnessSquareSum / safeCount - meanLightness * meanLightness);
  const spatialGrid = cells.map(cell => {
    const cellCount = Math.max(1, cell.count);
    const hex = `#${[cell.red, cell.green, cell.blue].map(value => Math.max(0, Math.min(255, Math.round(value / cellCount))).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
    return { region: cell.region, hex, lightness: Number((cell.lightness / cellCount).toFixed(4)) };
  });
  const ordered = [...spatialGrid].sort((left, right) => left.lightness - right.lightness);
  return {
    meanLightness: Number(meanLightness.toFixed(4)),
    lightnessDeviation: Number(Math.sqrt(variance).toFixed(4)),
    meanChroma: Number((chromaSum / safeCount).toFixed(4)),
    darkRatio: Number((darkCount / safeCount).toFixed(4)),
    highlightRatio: Number((highlightCount / safeCount).toFixed(4)),
    brightestRegion: ordered.at(-1)?.region || '',
    darkestRegion: ordered[0]?.region || '',
    spatialGrid
  };
}

async function checkLibrary(showMessage = true) {
  try {
    const endpoint = normalizeLibraryEndpoint(state.settings.libraryEndpoint);
    const response = await runtimeSend({ type: 'KBASE_FETCH', url: `${endpoint}/api/health`, method: 'GET', timeout: 4000 });
    const online = Boolean(response?.ok && response.data?.ok);
    setServiceState(online ? 'online' : 'offline', online ? '词库在线' : '词库离线');
    if (showMessage) setStatus(online ? 'F·BASE 词库服务已连接' : 'F·BASE 服务未启动，请先运行 start-finn-services.bat', online ? 'success' : 'error');
    return online;
  } catch (error) {
    setServiceState('offline', '词库离线');
    if (showMessage) setStatus(error.message || 'F·BASE 服务未启动', 'error');
    return false;
  }
}

function setServiceState(type, text) {
  state.serviceOnline = type === 'online';
  el.serviceState.className = `service-state ${type}`;
  el.serviceState.querySelector('span').textContent = text;
}

// 后端离线前置校验（UX 审计 P0-2）：提交反推前先确认后端在线，
// 把"提交后才失败"提前为"点按钮就告知原因"
function assertLibraryOnline() {
  // 初次「检测中」(undefined) 不拦截，只在确认离线时拦截
  if (state.serviceOnline !== false) return true;
  setStatus('F·BASE 后端未启动：请先运行 start-finn-services.bat，再重新提交任务', 'error');
  checkLibrary(true);
  return false;
}

function sharedProfileId() {
  return `llm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function isMaskedClientSecret(value) {
  return String(value || '').startsWith('••••');
}

function usableClientSecret(value) {
  const secret = String(value || '').trim();
  return secret && !isMaskedClientSecret(secret) ? secret : '';
}

function normalizeProfileSecrets(input) {
  const source = input && typeof input === 'object' ? input : {};
  return Object.fromEntries(Object.entries(source).slice(0, 100).map(([id, value]) => [String(id), {
    key: usableClientSecret(value?.key),
    imageApiKey: usableClientSecret(value?.imageApiKey)
  }]));
}

function restoreProfileSecrets(profile, fallbackSettings = null) {
  return { ...profile };
}

async function rememberProfileSecrets(profiles = state.profiles) {
  profileSecrets = {};
  await chrome.storage.local.remove(PROFILE_SECRET_STORE_KEY);
}

function normalizeSharedProfiles(profiles) {
  return (Array.isArray(profiles) ? profiles : []).map((profile, index) => {
    if (!profile || !profile.id) return null;
    return {
      id: String(profile.id),
      name: String(profile.name || `配置 ${index + 1}`),
      endpoint: String(profile.endpoint || profile.llmEndpoint || ''),
      key: String(profile.key || profile.apiKey || ''),
      model: String(profile.model || ''),
      reasoning: !!profile.reasoning,
      twoPhase: profile.twoPhase !== false,
      models: normalizeModels(profile.models || []),
      imageEndpoint: String(profile.imageEndpoint || ''),
      imageApiKey: String(profile.imageApiKey || ''),
      imageModel: String(profile.imageModel || ''),
      imageModels: normalizeImageModelCandidates(Array.isArray(profile.imageModels) ? profile.imageModels.join(',') : '', profile.imageModel || ''),
      assistantModel: String(profile.assistantModel || ''),
      eagleEnabled: profile.eagleEnabled !== false,
      eagleEndpoint: String(profile.eagleEndpoint || DEFAULT_SETTINGS.eagleEndpoint),
      eagleTags: String(profile.eagleTags || DEFAULT_SETTINGS.eagleTags),
      libraryEndpoint: String(profile.libraryEndpoint || DEFAULT_SETTINGS.libraryEndpoint),
      updatedAt: Number(profile.updatedAt || 0)
    };
  }).filter(Boolean);
}

function settingsFromSharedProfile(profile) {
  return {
    libraryEndpoint: profile.libraryEndpoint || DEFAULT_SETTINGS.libraryEndpoint,
    llmEndpoint: profile.endpoint || '',
    apiKey: profile.key || '',
    model: profile.model || '',
    imageEndpoint: profile.imageEndpoint || '',
    imageApiKey: profile.imageApiKey || '',
    imageModel: profile.imageModel || '',
    imageModels: Array.isArray(profile.imageModels) ? [...profile.imageModels] : [],
    activeImageModel: '',
    assistantModel: profile.assistantModel || '',
    eagleEnabled: profile.eagleEnabled !== false,
    eagleEndpoint: profile.eagleEndpoint || DEFAULT_SETTINGS.eagleEndpoint,
    eagleTags: profile.eagleTags || DEFAULT_SETTINGS.eagleTags
  };
}

function sharedProfileFromSettings(base, settings, name) {
  return {
    ...(base || {}),
    id: base?.id || sharedProfileId(),
    name: String(name || base?.name || '未命名配置').trim() || '未命名配置',
    endpoint: settings.llmEndpoint || '',
    key: settings.apiKey || '',
    model: settings.model || '',
    reasoning: !!base?.reasoning,
    twoPhase: base?.twoPhase !== false,
    models: normalizeModels(state.models),
    imageEndpoint: settings.imageEndpoint || '',
    imageApiKey: settings.imageApiKey || '',
    imageModel: settings.imageModel || '',
    imageModels: Array.isArray(settings.imageModels) ? settings.imageModels.filter(item => typeof item === 'string' && item.trim()).map(item => item.trim()).slice(0, 500) : [],
    activeImageModel: settings.activeImageModel || '',
    assistantModel: settings.assistantModel || '',
    eagleEnabled: settings.eagleEnabled !== false,
    eagleEndpoint: settings.eagleEndpoint || DEFAULT_SETTINGS.eagleEndpoint,
    eagleTags: settings.eagleTags || DEFAULT_SETTINGS.eagleTags,
    libraryEndpoint: settings.libraryEndpoint || DEFAULT_SETTINGS.libraryEndpoint,
    updatedAt: Date.now()
  };
}

function activeSharedProfile() {
  return state.profiles.find(profile => profile.id === state.activeProfileId) || state.profiles[0] || null;
}

function renderSharedProfiles() {
  const active = activeSharedProfile();
  el.profileSelect.replaceChildren(...state.profiles.map(profile => {
    const option = document.createElement('option');
    option.value = profile.id;
    option.selected = profile.id === active?.id;
    option.textContent = profile.model ? `${profile.name} · ${profile.model}` : profile.name;
    return option;
  }));
  el.profileCurrent.textContent = active?.model ? `${active.name} · ${active.model}` : (active?.name || '选择 API 档案');
  el.profileSearchInput.closest('.profile-search').classList.toggle('hidden', state.profiles.length <= 5);
  const query = el.profileSearchInput.value.trim().toLowerCase();
  const visible = state.profiles.filter(profile => !query || `${profile.name} ${profile.model} ${profile.endpoint}`.toLowerCase().includes(query));
  el.profileOptionList.replaceChildren(...visible.map(profile => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'profile-option';
    button.dataset.profileId = profile.id;
    button.setAttribute('role', 'option');
    button.setAttribute('aria-selected', String(profile.id === active?.id));
    button.classList.toggle('is-active', profile.id === active?.id);
    const copy = document.createElement('span');
    copy.className = 'profile-option-copy';
    const name = document.createElement('strong');
    name.textContent = profile.name;
    const detail = document.createElement('small');
    detail.textContent = [profile.model || '未选择模型', shortHost(profile.endpoint)].filter(Boolean).join(' · ');
    copy.append(name, detail);
    const mark = document.createElement('span');
    mark.className = 'ui-icon-tile tile-accent profile-option-mark';
    mark.innerHTML = UI_ICONS.check;
    button.append(copy, mark);
    return button;
  }));
  el.profileNameInput.value = active?.name || '';
  el.profileCount.textContent = `${state.profiles.length} 份`;
  el.deleteProfileButton.disabled = state.profiles.length <= 1;
}

function toggleProfileOptions() {
  if (el.profileOptions.classList.contains('hidden')) openProfileOptions();
  else closeProfileOptions();
}

function openProfileOptions() {
  closeModelOptions();
  el.profileSearchInput.value = '';
  renderSharedProfiles();
  el.profileOptions.classList.remove('hidden');
  el.profileToggleButton.setAttribute('aria-expanded', 'true');
  if (state.profiles.length > 5) requestAnimationFrame(() => el.profileSearchInput.focus());
}

function closeProfileOptions() {
  el.profileOptions.classList.add('hidden');
  el.profileToggleButton.setAttribute('aria-expanded', 'false');
}

async function persistSharedProfiles() {
  await rememberProfileSecrets();
  const endpoint = normalizeLibraryEndpoint(state.settings.libraryEndpoint);
  const response = await runtimeSend({
    type: 'KBASE_FETCH',
    url: `${endpoint}/api/settings/llm-profiles`,
    method: 'PUT',
    timeout: 8000,
    body: { profiles: state.profiles, activeId: state.activeProfileId }
  });
  if (!response?.ok) throw makeRequestError(response, true);
  const safeProfiles = normalizeSharedProfiles(response.data?.profiles);
  if (safeProfiles.length) {
    state.profiles = safeProfiles;
    state.activeProfileId = safeProfiles.some(profile => profile.id === response.data?.activeId)
      ? response.data.activeId
      : safeProfiles[0].id;
    state.settings = settingsFromSharedProfile(activeSharedProfile());
  }
  await rememberProfileSecrets();
  return response.data;
}

async function loadSharedProfiles(showMessage = false) {
  try {
    const fallbackSettings = { ...state.settings };
    const endpoint = normalizeLibraryEndpoint(state.settings.libraryEndpoint);
    const response = await runtimeSend({
      type: 'KBASE_FETCH',
      url: `${endpoint}/api/settings/llm-profiles`,
      method: 'GET',
      timeout: 6000
    });
    if (!response?.ok) throw makeRequestError(response, true);
    let profiles = normalizeSharedProfiles(response.data?.profiles);
    if (!profiles.length) {
      const initial = sharedProfileFromSettings(null, state.settings, '默认配置');
      profiles = [initial];
      state.profiles = profiles;
      state.activeProfileId = initial.id;
      await persistSharedProfiles();
    } else {
      state.profiles = profiles;
      state.activeProfileId = profiles.some(profile => profile.id === response.data?.activeId)
        ? response.data.activeId
        : profiles[0].id;
    }
    const active = activeSharedProfile();
    state.settings = settingsFromSharedProfile(active);
    state.models = normalizeModels(active.models);
    await rememberProfileSecrets(profiles);
    await chrome.storage.local.set({ finnSettings: state.settings, finnModels: state.models });
    fillSettingsForm();
    renderSharedProfiles();
    renderModel();
    if (showMessage) showSettingsResult(`已同步 ${profiles.length} 份共享档案`, 'success');
    return true;
  } catch (error) {
    if (!state.profiles.length) {
      const fallback = sharedProfileFromSettings(null, state.settings, '本机配置');
      state.profiles = [fallback];
      state.activeProfileId = fallback.id;
    }
    renderSharedProfiles();
    if (showMessage) showSettingsResult(error.message || '共享配置读取失败', 'error');
    return false;
  }
}

function saveCurrentProfileDraft() {
  const active = activeSharedProfile();
  if (!active) return;
  const settings = readSettingsForm();
  const updated = sharedProfileFromSettings(active, settings, el.profileNameInput.value);
  state.profiles = state.profiles.map(profile => profile.id === active.id ? updated : profile);
}

async function switchSharedProfile() {
  try {
    saveCurrentProfileDraft();
    const target = state.profiles.find(profile => profile.id === el.profileSelect.value);
    if (!target) return;
    state.activeProfileId = target.id;
    state.settings = settingsFromSharedProfile(target);
    state.models = normalizeModels(target.models);
    fillSettingsForm();
    renderSharedProfiles();
    await persistSharedProfiles();
    await chrome.storage.local.set({ finnSettings: state.settings, finnModels: state.models });
    renderModel();
    showSettingsResult(`已切换到 ${target.name}`, 'success');
  } catch (error) {
    showSettingsResult(error.message || '档案切换失败', 'error');
  }
}

async function createSharedProfile() {
  try { saveCurrentProfileDraft(); } catch (_) {}
  const profile = sharedProfileFromSettings(null, { ...DEFAULT_SETTINGS }, `新配置 ${state.profiles.length + 1}`);
  state.profiles.push(profile);
  state.activeProfileId = profile.id;
  state.settings = settingsFromSharedProfile(profile);
  state.models = [];
  fillSettingsForm();
  renderSharedProfiles();
  await persistSharedProfiles();
  el.profileNameInput.focus();
  el.profileNameInput.select();
  showSettingsResult('已新建共享档案，请填写接口信息', 'success');
}

async function deleteSharedProfile() {
  const active = activeSharedProfile();
  if (!active || state.profiles.length <= 1) return;
  if (!confirm(`确认删除配置档案“${active.name}”？`)) return;
  state.profiles = state.profiles.filter(profile => profile.id !== active.id);
  delete profileSecrets[active.id];
  state.activeProfileId = state.profiles[0].id;
  const target = activeSharedProfile();
  state.settings = settingsFromSharedProfile(target);
  state.models = normalizeModels(target.models);
  fillSettingsForm();
  renderSharedProfiles();
  await persistSharedProfiles();
  await chrome.storage.local.set({ finnSettings: state.settings, finnModels: state.models });
  renderModel();
  showSettingsResult('当前共享档案已删除', 'success');
}

async function openSettings() {
  fillSettingsForm();
  showSettingsResult('', '');
  el.settingsDialog.showModal();
  await loadSharedProfiles(false);
}

function fillSettingsForm() {
  el.libraryEndpointInput.value = state.settings.libraryEndpoint;
  el.llmEndpointInput.value = state.settings.llmEndpoint;
  el.apiKeyInput.value = state.settings.apiKey;
  el.modelInput.value = state.settings.model;
  el.imageEndpointInput.value = state.settings.imageEndpoint || '';
  el.imageApiKeyInput.value = state.settings.imageApiKey || '';
  el.imageModelInput.value = state.settings.imageModel || '';
  el.imageModelsInput.value = (state.settings.imageModels || []).join(', ');
  el.assistantModelInput.value = state.settings.assistantModel || '';
  el.eagleEnabledInput.checked = state.settings.eagleEnabled !== false;
  el.eagleEndpointInput.value = state.settings.eagleEndpoint || DEFAULT_SETTINGS.eagleEndpoint;
  el.eagleTagsInput.value = state.settings.eagleTags || DEFAULT_SETTINGS.eagleTags;
  el.profileNameInput.value = activeSharedProfile()?.name || '';
  renderSharedProfiles();
  updateModelHelp();
  updateImageModelHelp();
}

function normalizeModels(models) {
  return [...new Set((Array.isArray(models) ? models : [])
    .map(item => String(item?.id || item || '').trim())
    .filter(Boolean))]
    .sort(compareModels);
}

function compareModels(a, b) {
  const visualDifference = Number(isLikelyVisualModel(b)) - Number(isLikelyVisualModel(a));
  if (visualDifference) return visualDifference;
  return a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' });
}

// 识别生图模型：按常见命名匹配（gpt-image / seedream / seedance / dall-e / flux / 即梦 等）
function isLikelyImageModel(model) {
  const id = String(model || '').toLowerCase();
  return [
    /gpt-image/,
    /dall[-·.]?e/,
    /seedream/,
    /seedance/,
    /flux/,
    /hidream/,
    /cogview/,
    /kolors/,
    /midjourney/,
    /(^|[._-])mj([._-]|$)/,
    /jimeng/,
    /imagen/,
    /stable-diffusion/,
    /sdxl/,
    /sd3/,
    /qwen-image/,
    /wanx/,
    /irag/,
    /banana/,
    /longxia/
  ].some(pattern => pattern.test(id));
}

// 生图模型候选：逗号/分号/换行分隔 → 去重数组，当前生效模型排在首位
function normalizeImageModelCandidates(value, activeModel) {
  const list = String(value || '')
    .split(/[,;\n]/)
    .map(item => item.trim())
    .filter(Boolean);
  if (activeModel) list.unshift(activeModel);
  return [...new Set(list)].slice(0, 500);
}

// 生图时可切换的模型选项：当前生效模型 + 候选列表去重
function imageModelOptions(settings = state.settings) {
  const list = [settings.imageModel, ...(settings.imageModels || [])];
  if (settings.activeImageModel) list.unshift(settings.activeImageModel);
  return [...new Set(list.map(item => String(item || '').trim()).filter(Boolean))];
}

// 本次生图实际使用的模型
function effectiveImageModel(settings = state.settings) {
  const options = imageModelOptions(settings);
  if (!options.length) return '';
  return settings.activeImageModel && options.includes(settings.activeImageModel)
    ? settings.activeImageModel
    : (settings.imageModel || options[0]);
}

function isLikelyVisualModel(model) {
  const id = String(model || '').toLowerCase();
  return [
    /(^|[._-])vl([._-]|$)/,
    /vision/,
    /^qwen3\.(5|6|7)-(plus|flash)(-|$)/,
    /gpt-4o/,
    /gpt-4\.1/,
    /gemini.*(flash|pro)/,
    /claude-3/,
    /pixtral/,
    /llava/,
    /minicpm-v/
  ].some(pattern => pattern.test(id));
}

function modelGroupName(model) {
  const id = String(model || '').toLowerCase();
  if (/^(qwen|qwq|wanx)|tongyi/.test(id)) return '通义与 Qwen';
  if (/^(gpt|chatgpt|o1|o3|o4|text-embedding|dall-e)/.test(id)) return 'OpenAI';
  if (/^claude/.test(id)) return 'Claude';
  if (/^(gemini|imagen|veo)/.test(id)) return 'Gemini';
  if (/^deepseek/.test(id)) return 'DeepSeek';
  if (/^(doubao|seedream|seedance)/.test(id)) return '豆包与字节';
  if (/^(kimi|moonshot)/.test(id)) return 'Kimi';
  if (/^(glm|cogview|cogvideo)/.test(id)) return '智谱';
  if (/^(minimax|abab)/.test(id)) return 'MiniMax';
  if (isLikelyVisualModel(id) || /image|video|vision/.test(id)) return '其他视觉模型';
  return '其他模型';
}

function updateModelHelp() {
  el.modelHelp.textContent = state.models.length
    ? `已载入 ${state.models.length} 个模型，可输入名称筛选，视觉模型优先显示`
    : '图片拆解需要选择支持视觉输入的模型';
}

function updateImageModelHelp() {
  const count = normalizeImageModelCandidates(el.imageModelsInput?.value || '', el.imageModelInput?.value.trim()).length;
  el.imageModelHelp.textContent = count
    ? `已载入 ${count} 个生图模型，可输入名称筛选并切换`
    : '获取模型后会单独显示生图 API 返回的模型，并按系列分组';
}

function toggleImageModelOptions() {
  if (el.imageModelOptions.classList.contains('hidden')) openImageModelOptions();
  else closeImageModelOptions();
}

function openImageModelOptions(query = '') {
  const models = normalizeImageModelCandidates(el.imageModelsInput.value, el.imageModelInput.value.trim());
  if (!models.length) {
    showSettingsResult('请先点击“获取全部模型”，也可以直接填写生图模型 ID', '');
    return;
  }
  renderImageModelOptions(query);
  el.imageModelOptions.classList.remove('hidden');
  el.imageModelInput.setAttribute('aria-expanded', 'true');
  el.imageModelToggleButton.setAttribute('aria-expanded', 'true');
}

function closeImageModelOptions() {
  el.imageModelOptions.classList.add('hidden');
  el.imageModelInput.setAttribute('aria-expanded', 'false');
  el.imageModelToggleButton.setAttribute('aria-expanded', 'false');
}

function renderImageModelOptions(query = '') {
  const allModels = normalizeImageModelCandidates(el.imageModelsInput.value, el.imageModelInput.value.trim());
  const needle = query.trim().toLowerCase();
  const matches = allModels.filter(model => !needle || model.toLowerCase().includes(needle));
  const visible = matches.slice(0, MAX_MODEL_RESULTS);
  const current = el.imageModelInput.value.trim();
  const fragment = document.createDocumentFragment();
  const groups = new Map();
  visible.forEach(model => {
    const groupName = modelGroupName(model);
    if (!groups.has(groupName)) groups.set(groupName, []);
    groups.get(groupName).push(model);
  });
  for (const [groupName, groupModels] of groups) {
    const group = document.createElement('section');
    group.className = 'model-option-group';
    const heading = document.createElement('div');
    heading.className = 'model-option-heading';
    const headingName = document.createElement('span');
    headingName.textContent = groupName;
    const headingCount = document.createElement('small');
    headingCount.textContent = String(groupModels.length);
    heading.append(headingName, headingCount);
    group.append(heading);
    groupModels.forEach(model => {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'model-option';
      option.dataset.model = model;
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', String(model === current));
      option.title = model;
      const name = document.createElement('span');
      name.className = 'model-option-name';
      name.textContent = model;
      const tag = document.createElement('span');
      tag.className = 'model-option-tag image-model-tag';
      tag.textContent = isLikelyImageModel(model) ? '生图' : '待确认';
      option.append(name, tag);
      group.append(option);
    });
    fragment.append(group);
  }
  if (!matches.length) {
    const empty = document.createElement('div');
    empty.className = 'model-options-note';
    empty.textContent = '没有匹配项，可继续手动填写完整模型 ID';
    fragment.append(empty);
  } else if (matches.length > visible.length) {
    const more = document.createElement('div');
    more.className = 'model-options-note';
    more.textContent = `还有 ${matches.length - visible.length} 个结果，请继续输入名称缩小范围`;
    fragment.append(more);
  }
  el.imageModelOptions.replaceChildren(fragment);
}

function handleImageModelOptionClick(event) {
  const option = event.target.closest('.model-option');
  if (option) selectImageModel(option.dataset.model);
}

function selectImageModel(model) {
  el.imageModelInput.value = model;
  el.imageModelsInput.value = normalizeImageModelCandidates(el.imageModelsInput.value, model).join(', ');
  closeImageModelOptions();
  updateImageModelHelp();
  showSettingsResult(`已选择生图模型 ${model}`, 'success');
}

function handleImageModelInputKeydown(event) {
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    openImageModelOptions(el.imageModelInput.value);
    el.imageModelOptions.querySelector('.model-option')?.focus();
  } else if (event.key === 'Escape') {
    closeImageModelOptions();
  } else if (event.key === 'Enter' && !el.imageModelOptions.classList.contains('hidden')) {
    const first = el.imageModelOptions.querySelector('.model-option');
    if (first) {
      event.preventDefault();
      selectImageModel(first.dataset.model);
    }
  }
}

function handleImageModelOptionsKeydown(event) {
  const options = [...el.imageModelOptions.querySelectorAll('.model-option')];
  const index = options.indexOf(document.activeElement);
  if (event.key === 'ArrowDown' && options.length) {
    event.preventDefault();
    options[(index + 1) % options.length].focus();
  } else if (event.key === 'ArrowUp' && options.length) {
    event.preventDefault();
    options[(index - 1 + options.length) % options.length].focus();
  } else if (event.key === 'Escape') {
    event.preventDefault();
    closeImageModelOptions();
    el.imageModelInput.focus();
  }
}

function toggleModelOptions() {
  if (el.modelOptions.classList.contains('hidden')) openModelOptions();
  else closeModelOptions();
}

function openModelOptions(query = '') {
  if (!state.models.length) {
    showSettingsResult('请先点击“获取模型”加载列表，也可以直接填写模型 ID', '');
    return;
  }
  renderModelOptions(query);
  el.modelOptions.classList.remove('hidden');
  el.modelInput.setAttribute('aria-expanded', 'true');
  el.modelToggleButton.setAttribute('aria-expanded', 'true');
}

function closeModelOptions() {
  el.modelOptions.classList.add('hidden');
  el.modelInput.setAttribute('aria-expanded', 'false');
  el.modelToggleButton.setAttribute('aria-expanded', 'false');
}

function renderModelOptions(query = '') {
  const needle = query.trim().toLowerCase();
  const matches = state.models.filter(model => !needle || model.toLowerCase().includes(needle));
  let visible = matches.slice(0, MAX_MODEL_RESULTS);
  const current = el.modelInput.value.trim();
  if (!needle && current && matches.includes(current) && !visible.includes(current)) {
    visible = [current, ...visible.slice(0, MAX_MODEL_RESULTS - 1)];
  }

  const fragment = document.createDocumentFragment();
  const groups = new Map();
  visible.forEach(model => {
    const groupName = modelGroupName(model);
    if (!groups.has(groupName)) groups.set(groupName, []);
    groups.get(groupName).push(model);
  });
  for (const [groupName, groupModels] of groups) {
    const group = document.createElement('section');
    group.className = 'model-option-group';
    const heading = document.createElement('div');
    heading.className = 'model-option-heading';
    const headingName = document.createElement('span');
    headingName.textContent = groupName;
    const headingCount = document.createElement('small');
    headingCount.textContent = String(groupModels.length);
    heading.append(headingName, headingCount);
    group.append(heading);
    for (const model of groupModels) {
    const option = document.createElement('button');
    option.type = 'button';
    option.className = 'model-option';
    option.dataset.model = model;
    option.setAttribute('role', 'option');
    option.setAttribute('aria-selected', String(model === current));
    option.title = model;

    const name = document.createElement('span');
    name.className = 'model-option-name';
    name.textContent = model;
    option.append(name);

    if (isLikelyVisualModel(model)) {
      const tag = document.createElement('span');
      tag.className = 'model-option-tag';
      tag.textContent = '视觉优先';
      option.append(tag);
    }
      group.append(option);
    }
    fragment.append(group);
  }

  if (!matches.length) {
    const empty = document.createElement('div');
    empty.className = 'model-options-note';
    empty.textContent = '没有匹配项，可继续手动填写完整模型 ID';
    fragment.append(empty);
  } else if (matches.length > visible.length) {
    const more = document.createElement('div');
    more.className = 'model-options-note';
    more.textContent = `还有 ${matches.length - visible.length} 个结果，请继续输入名称缩小范围`;
    fragment.append(more);
  }
  el.modelOptions.replaceChildren(fragment);
}

function handleModelOptionClick(event) {
  const option = event.target.closest('.model-option');
  if (!option) return;
  selectModel(option.dataset.model);
}

function selectModel(model) {
  el.modelInput.value = model;
  el.modelInput.focus();
  closeModelOptions();
  showSettingsResult(`已选择 ${model}`, 'success');
}

function handleModelInputKeydown(event) {
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    openModelOptions();
    el.modelOptions.querySelector('.model-option')?.focus();
  } else if (event.key === 'Escape') {
    closeModelOptions();
  } else if (event.key === 'Enter' && !el.modelOptions.classList.contains('hidden')) {
    const first = el.modelOptions.querySelector('.model-option');
    if (first) {
      event.preventDefault();
      selectModel(first.dataset.model);
    }
  }
}

function handleModelOptionsKeydown(event) {
  const options = [...el.modelOptions.querySelectorAll('.model-option')];
  const index = options.indexOf(document.activeElement);
  if (event.key === 'ArrowDown' && options.length) {
    event.preventDefault();
    options[(index + 1) % options.length].focus();
  } else if (event.key === 'ArrowUp' && options.length) {
    event.preventDefault();
    options[(index - 1 + options.length) % options.length].focus();
  } else if (event.key === 'Escape') {
    event.preventDefault();
    closeModelOptions();
    el.modelInput.focus();
  }
}

async function saveSettings(event) {
  event.preventDefault();
  try {
    const settings = readSettingsForm();
    if (!settings.llmEndpoint || !settings.apiKey || !settings.model) throw new Error('请完整填写 API 地址、Key 和视觉模型 ID');
    state.settings = settings;
    const active = activeSharedProfile();
    const updated = sharedProfileFromSettings(active, settings, el.profileNameInput.value);
    state.profiles = active
      ? state.profiles.map(profile => profile.id === active.id ? updated : profile)
      : [updated];
    state.activeProfileId = updated.id;
    await persistSharedProfiles();
    await chrome.storage.local.set({ finnSettings: state.settings, finnModels: state.models });
    el.settingsDialog.close();
    renderModel();
    renderRuntimeSettings();
    await checkLibrary(true);
  } catch (error) {
    showSettingsResult(error.message, 'error');
  }
}

function readSettingsForm() {
  return {
    libraryEndpoint: normalizeLibraryEndpoint(el.libraryEndpointInput.value),
    llmEndpoint: normalizeLlmEndpoint(el.llmEndpointInput.value),
    apiKey: el.apiKeyInput.value.trim(),
    model: el.modelInput.value.trim(),
    imageEndpoint: el.imageEndpointInput.value.trim(),
    imageApiKey: el.imageApiKeyInput.value.trim(),
    imageModel: el.imageModelInput.value.trim(),
    imageModels: normalizeImageModelCandidates(el.imageModelsInput.value, el.imageModelInput.value.trim()),
    activeImageModel: el.imageModelInput.value.trim() === (state.settings.activeImageModel || '') ? el.imageModelInput.value.trim() : (state.settings.activeImageModel || ''),
    assistantModel: el.assistantModelInput.value.trim(),
    eagleEnabled: el.eagleEnabledInput.checked,
    eagleEndpoint: el.eagleEndpointInput.value.trim() || DEFAULT_SETTINGS.eagleEndpoint,
    eagleTags: el.eagleTagsInput.value.trim() || DEFAULT_SETTINGS.eagleTags
  };
}

async function fetchModels() {
  try {
    const settings = readSettingsForm();
    if (!settings.llmEndpoint || !settings.apiKey) throw new Error('请先填写 API 地址和 Key');
    showSettingsResult('正在同时拉取反推模型和生图模型', 'loading');
    const requestModels = async (endpoint, apiKey, channel) => {
      let response = await runtimeSend({
        type: 'KBASE_FETCH',
        url: `${normalizeLibraryEndpoint(settings.libraryEndpoint)}/api/models`,
        method: 'POST',
        timeout: 25000,
        body: { endpoint, key: apiKey, channel }
      });
      if (Number(response?.status) === 0 && usableClientSecret(apiKey)) {
        response = await runtimeSend({
          type: 'LLM_FETCH',
          url: deriveModelsEndpoint(endpoint),
          method: 'GET',
          timeout: 25000,
          apiKey
        });
      }
      if (!response?.ok) throw makeRequestError(response, false);
      return normalizeModels(Array.isArray(response.data) ? response.data : (response.data?.data || []));
    };
    const imageEndpoint = settings.imageEndpoint || settings.llmEndpoint;
    const imageApiKey = settings.imageApiKey || settings.apiKey;
    const sameSource = deriveModelsEndpoint(imageEndpoint) === deriveModelsEndpoint(settings.llmEndpoint) && imageApiKey === settings.apiKey;
    const [modelsResult, imageResult] = await Promise.allSettled([
      requestModels(settings.llmEndpoint, settings.apiKey, 'vision'),
      sameSource ? Promise.resolve(null) : requestModels(imageEndpoint, imageApiKey, 'image')
    ]);
    if (modelsResult.status === 'rejected') throw modelsResult.reason;
    const models = modelsResult.value;
    if (!models.length) throw new Error('接口没有返回模型列表，请手动填写视觉模型 ID');
    state.models = models;
    const returnedImageModels = imageResult.status === 'fulfilled' && Array.isArray(imageResult.value)
      ? imageResult.value
      : [];
    const detectedImageModels = (returnedImageModels.length ? returnedImageModels : models).filter(isLikelyImageModel);
    const imageModels = detectedImageModels.length
      ? detectedImageModels
      : returnedImageModels;
    const manual = normalizeImageModelCandidates(el.imageModelsInput.value, el.imageModelInput.value.trim())
      .filter(item => !models.includes(item) && !returnedImageModels.includes(item));
    state.settings.imageModels = normalizeImageModelCandidates([...imageModels, ...manual].join(','), el.imageModelInput.value.trim());
    el.imageModelsInput.value = state.settings.imageModels.join(', ');
    if (!el.imageModelInput.value.trim() && imageModels.length) el.imageModelInput.value = imageModels[0];
    const active = activeSharedProfile();
    if (active) state.profiles = state.profiles.map(profile => profile.id === active.id ? {
      ...profile,
      models,
      imageEndpoint: settings.imageEndpoint,
      imageApiKey: settings.imageApiKey,
      imageModel: el.imageModelInput.value.trim(),
      imageModels: state.settings.imageModels,
      updatedAt: Date.now()
    } : profile);
    await Promise.all([
      chrome.storage.local.set({ finnModels: models }),
      active ? persistSharedProfiles() : Promise.resolve()
    ]);
    updateModelHelp();
    updateImageModelHelp();
    if (!el.modelInput.value.trim()) {
      el.modelInput.value = models.find(isLikelyVisualModel) || '';
    }
    openModelOptions();
    if (state.settings.imageModels.length) renderImageModelOptions();
    const imageStatus = imageResult.status === 'rejected'
      ? `；生图接口拉取失败：${imageResult.reason?.message || '未知错误'}`
      : `；生图模型 ${state.settings.imageModels.length} 个`;
    showSettingsResult(`反推模型 ${models.length} 个${imageStatus}`, imageResult.status === 'rejected' ? '' : 'success');
  } catch (error) {
    showSettingsResult(error.message || '模型列表拉取失败', 'error');
  }
}

async function testConnection() {
  try {
    const settings = readSettingsForm();
    if (!settings.llmEndpoint || !settings.apiKey || !settings.model) throw new Error('请完整填写 API 地址、Key 和模型 ID');
    showSettingsResult('正在测试模型连接', 'loading');
    const payload = { model: settings.model, messages: [{ role: 'user', content: '请只回复 OK' }], max_tokens: 10, stream: false };
    let response = await runtimeSend({
      type: 'KBASE_FETCH',
      url: `${normalizeLibraryEndpoint(settings.libraryEndpoint)}/api/llm`,
      method: 'POST',
      timeout: 25000,
      body: { endpoint: settings.llmEndpoint, key: settings.apiKey, payload, timeoutMs: 25000 }
    });
    if (Number(response?.status) === 0 && usableClientSecret(settings.apiKey)) {
      response = await runtimeSend({
        type: 'LLM_FETCH',
        url: settings.llmEndpoint,
        method: 'POST',
        timeout: 25000,
        apiKey: settings.apiKey,
        body: payload
      });
    }
    if (!response?.ok) throw makeRequestError(response, false);
    showSettingsResult('连接成功。图片拆解仍需视觉模型支持。', 'success');
  } catch (error) {
    showSettingsResult(error.message || '连接测试失败', 'error');
  }
}

async function runDiagnostics() {
  showSettingsResult('正在检查后端、配置、队列与浏览器存储', 'loading');
  const settings = readSettingsForm();
  const endpoint = normalizeLibraryEndpoint(settings.libraryEndpoint);
  const active = activeSharedProfile();
  const queue = state.history.reduce((summary, task) => {
    const phase = String(task?.phase || task?.status || '').toLowerCase();
    if (['running', 'analyzing', 'generating'].includes(phase)) summary.running += 1;
    else if (['queued', 'waiting', 'pending'].includes(phase)) summary.waiting += 1;
    else if (['error', 'failed'].includes(phase)) summary.failed += 1;
    return summary;
  }, { running: 0, waiting: 0, failed: 0 });

  const [healthResult, storageResult] = await Promise.allSettled([
    runtimeSend({ type: 'KBASE_FETCH', url: `${endpoint}/api/health`, method: 'GET', timeout: 5000 }),
    typeof navigator.storage?.estimate === 'function' ? navigator.storage.estimate() : Promise.resolve(null)
  ]);
  const health = healthResult.status === 'fulfilled' ? healthResult.value : null;
  const backendOnline = Boolean(health?.ok && health.data?.ok);
  const estimate = storageResult.status === 'fulfilled' ? storageResult.value : null;
  const secretState = (isMaskedClientSecret(active?.key) || isMaskedClientSecret(settings.apiKey))
    ? '本机加密档案'
    : usableClientSecret(settings.apiKey)
      ? '等待保存加密'
      : '未配置';
  const manifestVersion = chrome.runtime.getManifest?.().version || '未知';
  const storageText = estimate && Number.isFinite(estimate.usage) && Number.isFinite(estimate.quota)
    ? `${(estimate.usage / 1048576).toFixed(1)} MB / ${(estimate.quota / 1048576).toFixed(0)} MB`
    : '浏览器未提供统计';
  const lines = [
    `扩展 ${manifestVersion}`,
    `后端 ${backendOnline ? '正常' : '未连接'}`,
    `共享档案 ${state.profiles.length} 份，当前 ${active?.name || '未选择'}`,
    `密钥 ${secretState}`,
    `视觉模型 ${settings.model || '未配置'}`,
    `生图模型 ${effectiveImageModel(settings) || '未配置'}`,
    `队列运行 ${queue.running}，等待 ${queue.waiting}，失败 ${queue.failed}`,
    `浏览器存储 ${storageText}`
  ];
  if (!backendOnline) lines.push('建议先启动 F·BASE 后端，再测试模型连接');
  showSettingsResult(lines.join('；'), backendOnline ? 'success' : 'error');
}

function showSettingsResult(message, type) {
  el.settingsResult.textContent = message;
  el.settingsResult.className = message ? `settings-result ${type || ''}`.trim() : 'settings-result hidden';
}

function renderModel() {
  el.modelName.textContent = state.settings.model || '尚未配置';
  el.modelName.title = state.settings.model || '';
}

function hasCompleteSettings(settings = state.settings) {
  return Boolean(settings.libraryEndpoint && settings.llmEndpoint && settings.apiKey && settings.model);
}

let _openLibraryLock = false;
async function openLibrary() {
  if (_openLibraryLock) return;
  _openLibraryLock = true;
  try {
    const endpoint = normalizeLibraryEndpoint(state.settings.libraryEndpoint);
    setStatus('正在打开词库页面…');
    const response = await runtimeSend({ type: 'OPEN_LIBRARY', url: `${endpoint}/knowledge-library.html` });
    if (!response?.ok) throw new Error(response?.error || '词库打开失败');
    if (response.offline) {
      setServiceState('offline', '词库离线');
      setStatus('词库页面已打开，检测到后端尚未启动，请先运行 F·BASE 后端后刷新页面', response.warning ? 'error' : 'warn');
    } else {
      setServiceState('online', '词库在线');
      setStatus(response.started ? '后端已自动启动，词库已打开' : '词库已打开', 'success');
    }
  } catch (error) {
    setServiceState('offline', '词库离线');
    setStatus(error.message || '词库打开失败', 'error');
  } finally {
    setTimeout(() => { _openLibraryLock = false; }, 1500);
  }
}

function normalizeLibraryEndpoint(value) {
  const url = new URL(String(value || DEFAULT_SETTINGS.libraryEndpoint).trim());
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(url.hostname)) {
    throw new Error('词库服务地址需使用本机 http 地址');
  }
  return url.origin;
}

function normalizeLlmEndpoint(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const url = new URL(raw);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('API 地址只支持 http 或 https');
  const host = url.hostname.toLowerCase();
  const pathname = url.pathname.replace(/\/+$/, '');
  if (/\/chat\/completions$/i.test(pathname)) return url.toString();
  if (host === 'api.openai.com' && (!pathname || pathname === '/')) {
    url.pathname = '/v1/chat/completions';
    return url.toString();
  }
  if (host === 'api.deepseek.com' || host.endsWith('.deepseek.com')) {
    url.pathname = '/chat/completions';
    return url.toString();
  }
  if (/\/v1$/i.test(pathname)) url.pathname = pathname + '/chat/completions';
  else url.pathname = (pathname || '') + '/chat/completions';
  return url.toString();
}

function deriveModelsEndpoint(value) {
  const url = new URL(String(value || '').trim());
  const pathname = url.pathname.replace(/\/+$/, '');
  if (/\/models$/i.test(pathname)) url.pathname = pathname;
  else if (/\/(?:chat\/completions|images\/generations|responses)$/i.test(pathname)) {
    url.pathname = pathname.replace(/\/(?:chat\/completions|images\/generations|responses)$/i, '/models');
  } else if (/\/v1$/i.test(pathname)) url.pathname = pathname + '/models';
  else if (/\/v1\//i.test(pathname)) url.pathname = pathname.replace(/\/v1\/.*$/i, '/v1/models');
  else url.pathname = (pathname || '') + '/v1/models';
  url.search = '';
  url.hash = '';
  return url.toString();
}

function makeRequestError(response, usedImage) {
  const status = Number(response?.status || 0);
  let message = response?.data?.error?.message || response?.data?.error || response?.data?.message || response?.error || `Status ${status || '未知'}`;
  if (status === 401 || status === 403) message = 'API Key 无效或当前账号没有模型权限';
  else if (status === 404) message = 'API 地址或模型路径无效，请检查 Endpoint';
  else if (status === 504) message = '视觉模型响应超时，请重试或切换更快的模型';
  else if (status === 502) message = `上游模型连接失败：${message}`;
  else if (usedImage && status === 400) message = `模型拒绝了图片请求，请确认它支持图像输入。${message}`;
  const error = new Error(message);
  error.status = status;
  return error;
}

function setStatus(message, type = '') {
  el.statusBar.className = message ? `status ${type}`.trim() : 'status hidden';
  el.statusText.textContent = message;
}

// 队列「停止」主动中断当前在跑的上游请求（reverse/import/生图），让停止立刻生效
function requestBackendAbort() {
  try { chrome.runtime.sendMessage({ type: 'ABORT_FETCH', fbaseAbortKey: SIDE_PANEL_CLIENT_ID }); } catch (_) { /* 后台不可用则忽略 */ }
}
function isFbaseAbort(error) {
  return Boolean(error && (error.fbaseAborted === true || error.aborted === true));
}
function makeFbaseAbortError() {
  const error = new Error('任务已中止');
  error.fbaseAborted = true;
  error.aborted = true;
  return error;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('图片解码失败'));
    image.src = src;
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });
}

function shortHost(url) {
  try { return new URL(url).hostname; } catch { return ''; }
}
