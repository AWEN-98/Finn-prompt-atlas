(function initializeFBaseFloatingWindow() {
  'use strict';

  const BUILD_VERSION = chrome.runtime.getManifest().version;
  const existingRoot = document.getElementById('fbase-floating-root');
  if (existingRoot) {
    const existingVersion = String(existingRoot.dataset.fbaseBuild || '');
    if (window.__FBASE_FLOATING_WINDOW__ && existingVersion === BUILD_VERSION) return;
    existingRoot.remove();
    document.querySelector('.fbase-page-viewer')?.remove();
    document.documentElement.classList.remove('fbase-viewer-open');
  }
  window.__FBASE_FLOATING_WINDOW__ = true;

  const DEFAULT_SIZE = { width: 410, height: 720 };
  const MIN_SIZE = { width: 280, height: 360 };
  const ASPECT_RATIOS = ['1:1', '2:3', '3:2', '3:4', '4:3', '9:16', '16:9', '4:5', '3:1', '1:3', 'AUTO'];
  const DEFAULT_QUICK_SETTINGS = {
    aspectRatio: 'AUTO', promptDetail: 'standard', outputVariant: true,
    inspectButton: true, colorCardMode: true, referencePalette: false, actionReferenceMode: false
  };
  const SESSION_HIDE_KEY = 'fbaseOrbSessionHidden';
  const state = {
    open: false, moving: false, resizing: false, hoverTarget: null, shellHidden: false,
    settingsReady: false, quickSettings: { ...DEFAULT_QUICK_SETTINGS }
  };

  const root = document.createElement('div');
  root.id = 'fbase-floating-root';
  root.dataset.fbaseBuild = BUILD_VERSION;
  const panelUrl = `${chrome.runtime.getURL('sidepanel.html')}?build=${encodeURIComponent(BUILD_VERSION)}`;
  const SVG = {
    close: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
    pick: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line></svg>',
    paste: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="2" width="8" height="4" rx="1"></rect><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path></svg>',
    upload: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>',
    minus: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
    noorb: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><line x1="10" y1="15" x2="17" y2="8"></line><line x1="7" y1="7" x2="8.2" y2="8.2"></line></svg>',
    spark: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>',
    minimize: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>'
  };
  root.innerHTML = `
    <button class="fbase-orb" type="button" aria-label="打开 F·BASE" title="打开 F·BASE">
      <img src="${chrome.runtime.getURL('f-logo.png')}" alt="">
      <span>F·BASE</span>
    </button>
    <aside class="fbase-quick-menu" aria-label="F·BASE 快捷菜单" hidden>
      <div class="fbase-quick-head"><div class="fbase-quick-brand"><span class="fbase-quick-mark">F</span><div><small>F·BASE CONTROL</small><strong>快捷工作台</strong><em>当前网页的采集与显示控制</em></div></div><button type="button" class="ui-icon-tile tile-ghost" data-quick-close aria-label="关闭快捷菜单">${SVG.close}</button></div>
      <div class="fbase-quick-actions">
        <button type="button" data-quick-action="pick"><span class="ui-icon-tile">${SVG.pick}</span><span>网页点选</span></button>
        <button type="button" data-quick-action="paste"><span class="ui-icon-tile">${SVG.paste}</span><span>粘贴图片</span></button>
        <button type="button" data-quick-action="upload"><span class="ui-icon-tile">${SVG.upload}</span><span>上传图片</span></button>
      </div>
      <div class="fbase-quick-toggles">
        <button type="button" data-quick-toggle="inspectButton" role="switch" aria-checked="true">
          <span class="fbase-quick-toggle-copy"><span>发送到 F·BASE 按钮</span><small>悬停网页图片时显示</small></span>
          <i class="fbase-quick-switch" aria-hidden="true"></i>
        </button>
      </div>
      <div class="fbase-quick-manage">
        <button type="button" data-quick-manage="session-hide"><span class="ui-icon-tile tile-warn">${SVG.minus}</span><span>本次关闭</span><small>刷新前不再显示</small></button>
        <button type="button" data-quick-manage="site-disable"><span class="ui-icon-tile tile-danger">${SVG.noorb}</span><span>在此网站禁用</span><small data-quick-host-label></small></button>
      </div>
      <p class="fbase-quick-foot">运行设置已集成到主窗口 · 点击浏览器工具栏 F·BASE 图标可随时唤回</p>
    </aside>
    <section class="fbase-float-window" aria-label="F·BASE 视觉反推窗口" hidden>
      <div class="fbase-float-rail" data-drag-handle>
        <div class="fbase-float-grip" aria-hidden="true"><i></i><i></i><i></i></div>
        <strong>F·BASE</strong>
        <div class="fbase-float-actions">
          <button type="button" data-fbase-minimize aria-label="收起窗口" title="收起窗口">${SVG.minimize}</button>
          <button type="button" data-fbase-close aria-label="关闭窗口" title="关闭窗口">${SVG.close}</button>
        </div>
      </div>
      <iframe class="fbase-float-frame" title="F·BASE" src="${panelUrl}"></iframe>
      <div class="fbase-resize-handle" data-resize-handle aria-label="调整窗口大小" title="拖动调整窗口大小"><i></i><i></i><i></i></div>
    </section>
    <button class="fbase-hover-pick feature-disabled" type="button" hidden><span class="ui-icon-spark">${SVG.spark}</span> 发送到 F·BASE</button>
  `;
  document.documentElement.append(root);

  const orb = root.querySelector('.fbase-orb');
  const quickMenu = root.querySelector('.fbase-quick-menu');
  const panel = root.querySelector('.fbase-float-window');
  const rail = root.querySelector('[data-drag-handle]');
  const resizeHandle = root.querySelector('[data-resize-handle]');
  const hoverPick = root.querySelector('.fbase-hover-pick');
  const closeButton = root.querySelector('[data-fbase-close]');
  const minimizeButton = root.querySelector('[data-fbase-minimize]');
  const frame = root.querySelector('.fbase-float-frame');

  restoreLayout();
  restoreSharedWindowState();
  restoreQuickSettings();
  checkShellVisibility();

  let orbPointer = null;
  orb.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    orb.setPointerCapture(event.pointerId);
    const rect = orb.getBoundingClientRect();
    orbPointer = { id: event.pointerId, x: event.clientX, y: event.clientY, left: rect.left, top: rect.top, moved: false };
  });
  orb.addEventListener('pointermove', event => {
    if (!orbPointer || orbPointer.id !== event.pointerId) return;
    const dx = event.clientX - orbPointer.x;
    const dy = event.clientY - orbPointer.y;
    if (Math.abs(dx) + Math.abs(dy) > 5) orbPointer.moved = true;
    if (!orbPointer.moved) return;
    const nextLeft = clamp(orbPointer.left + dx, 8, innerWidth - orb.offsetWidth - 8);
    const nextTop = clamp(orbPointer.top + dy, 8, innerHeight - orb.offsetHeight - 8);
    Object.assign(orb.style, { left: `${nextLeft}px`, top: `${nextTop}px`, right: 'auto', bottom: 'auto' });
  });
  orb.addEventListener('pointerup', event => {
    if (!orbPointer || orbPointer.id !== event.pointerId) return;
    const moved = orbPointer.moved;
    orbPointer = null;
    if (moved) saveLayout();
    else toggleWindow();
  });
  orb.addEventListener('contextmenu', event => {
    event.preventDefault();
    event.stopPropagation();
    toggleQuickMenu();
  });

  quickMenu.addEventListener('click', async event => {
    const close = event.target.closest('[data-quick-close]');
    if (close) return closeQuickMenu();
    const toggle = event.target.closest('[data-quick-toggle]');
    if (toggle) return toggleQuickSetting(toggle.dataset.quickToggle);
    const manage = event.target.closest('[data-quick-manage]')?.dataset.quickManage;
    if (manage === 'session-hide') {
      hideShell('session');
      return closeQuickMenu();
    }
    if (manage === 'site-disable') {
      await disableCurrentSite();
      hideShell('site');
      return closeQuickMenu();
    }
    const action = event.target.closest('[data-quick-action]')?.dataset.quickAction;
    if (action) {
      openWindow();
      postQuickAction(action);
      closeQuickMenu();
    }
  });
  document.addEventListener('pointerdown', event => {
    if (!quickMenu.hidden && !quickMenu.contains(event.target) && !orb.contains(event.target)) closeQuickMenu();
  }, true);

  // storage 已加固为仅受信上下文可访问：浮窗位置/开关/禁用站点经 background 白名单中转读写
  function storageGet(keys) {
    return chrome.runtime.sendMessage({ type: 'FBASE_STORAGE_GET', keys })
      .then(response => (response?.ok ? response.data || {} : {}))
      .catch(() => ({}));
  }

  function storageSet(payload) {
    return chrome.runtime.sendMessage({ type: 'FBASE_STORAGE_SET', payload }).catch(() => {});
  }

  let drag = null;
  rail.addEventListener('pointerdown', event => {
    if (event.button !== 0 || event.target.closest('button')) return;
    rail.setPointerCapture(event.pointerId);
    const rect = panel.getBoundingClientRect();
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
    panel.classList.add('is-moving');
  });
  rail.addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId) return;
    const left = clamp(drag.left + event.clientX - drag.x, 8, innerWidth - panel.offsetWidth - 8);
    const top = clamp(drag.top + event.clientY - drag.y, 8, innerHeight - panel.offsetHeight - 8);
    Object.assign(panel.style, { left: `${left}px`, top: `${top}px`, right: 'auto', bottom: 'auto' });
  });
  rail.addEventListener('pointerup', event => {
    if (!drag || drag.id !== event.pointerId) return;
    drag = null;
    panel.classList.remove('is-moving');
    saveLayout();
  });

  let resize = null;
  resizeHandle.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    event.preventDefault();
    resizeHandle.setPointerCapture(event.pointerId);
    const rect = panel.getBoundingClientRect();
    resize = { id: event.pointerId, x: event.clientX, y: event.clientY, width: rect.width, height: rect.height };
    panel.classList.add('is-resizing');
  });
  resizeHandle.addEventListener('pointermove', event => {
    if (!resize || resize.id !== event.pointerId) return;
    const rect = panel.getBoundingClientRect();
    const availableWidth = Math.max(160, innerWidth - rect.left - 8);
    const availableHeight = Math.max(220, innerHeight - rect.top - 8);
    const width = clamp(resize.width + event.clientX - resize.x, Math.min(MIN_SIZE.width, availableWidth), availableWidth);
    const height = clamp(resize.height + event.clientY - resize.y, Math.min(MIN_SIZE.height, availableHeight), availableHeight);
    Object.assign(panel.style, { width: `${width}px`, height: `${height}px` });
  });
  resizeHandle.addEventListener('pointerup', event => {
    if (!resize || resize.id !== event.pointerId) return;
    resize = null;
    panel.classList.remove('is-resizing');
    saveLayout();
  });

  closeButton.addEventListener('click', closeWindow);
  minimizeButton.addEventListener('click', closeWindow);

  document.addEventListener('pointerover', event => {
    // storage 恢复完成前不响应 hover：默认 quickSettings 里 inspectButton 为 true，
    // 否则刷新瞬间鼠标停在图片上会用默认值闪现按钮
    if (!state.settingsReady || !state.quickSettings.inspectButton) return;
    const visual = findVisual(event.target);
    if (!visual || panel.contains(event.target) || orb.contains(event.target)) return;
    state.hoverTarget = visual;
    positionHoverPick(visual.element);
  }, true);
  document.addEventListener('pointerout', event => {
    if (!state.hoverTarget) return;
    if (event.relatedTarget === hoverPick || hoverPick.contains(event.relatedTarget)) return;
    const nextVisual = findVisual(event.relatedTarget);
    if (nextVisual?.element === state.hoverTarget.element) return;
    window.setTimeout(() => {
      if (!hoverPick.matches(':hover')) hideHoverPick();
    }, 90);
  }, true);
  hoverPick.addEventListener('click', async event => {
    event.preventDefault();
    event.stopPropagation();
    const visual = state.hoverTarget;
    if (!visual) return;
    const rect = visual.element.getBoundingClientRect();
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'FINN_CAPTURED_IMAGE',
        payload: {
          srcUrl: visual.srcUrl,
          pageUrl: location.href,
          pageTitle: document.title || '网页参考图',
          alt: visual.alt,
          rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
          viewportWidth: innerWidth,
          viewportHeight: innerHeight,
          devicePixelRatio,
          scrollX,
          scrollY
        }
      });
      if (response?.ok) {
        openWindow();
        hideHoverPick();
      }
    } catch (_) {
      /* sendMessage 失败（service worker 重启、iframe 关闭等）静默忽略，
         picker.js 也会再发一次消息作为兜底 */
    }
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'FBASE_OPEN_WINDOW') {
      unhideShell();
      openWindow();
      sendResponse({ ok: true, open: state.open, visible: state.open && !panel.hidden });
      return false;
    }
    if (message?.type === 'FBASE_TOGGLE_WINDOW') {
      unhideShell();
      toggleWindow();
      sendResponse({ ok: true, open: state.open, visible: state.open && !panel.hidden });
      return false;
    }
    if (message?.type === 'FBASE_CLOSE_WINDOW') {
      closeWindow();
      sendResponse({ ok: true });
      return false;
    }
    if (message?.type === 'FBASE_SHOW_WINDOW') {
      // background 路由：本标签页成为浮窗唯一宿主；用户已禁用浮窗的页面不强行显示
      if (!state.shellHidden) openWindow(false);
      sendResponse({ ok: true, open: state.open, visible: state.open && !panel.hidden });
      return false;
    }
    if (message?.type === 'FBASE_HIDE_WINDOW') {
      closeWindow(false);
      sendResponse({ ok: true });
      return false;
    }
    if (message?.type === 'FBASE_STORAGE_SYNC') {
      // background 广播：任意窗口拖动浮窗/改开关后实时对齐，位置全局一致
      if (message.layout) applyLayout(message.layout);
      if (message.quickSettings) {
        state.quickSettings = normalizeQuickSettings(message.quickSettings);
        renderQuickMenu();
      }
      return false;
    }
    return false;
  });

  window.addEventListener('message', event => {
    if (event.source !== frame?.contentWindow) return;
    if (event.data?.source !== 'FBASE_SIDEPANEL') return;
    if (event.data?.type === 'FBASE_OPEN_IMAGE_VIEWER') {
      openPageImageViewer(event.data.payload || {});
    }
  });

  window.addEventListener('resize', keepInsideViewport);

  function openWindow(broadcast = true) {
    closeQuickMenu();
    panel.hidden = false;
    panel.classList.add('is-open');
    orb.classList.add('is-panel-open');
    state.open = true;
    keepInsideViewport();
    if (broadcast) publishWindowState(true);
  }

  function closeWindow(broadcast = true) {
    panel.classList.remove('is-open');
    orb.classList.remove('is-panel-open');
    state.open = false;
    window.setTimeout(() => { if (!state.open) panel.hidden = true; }, 180);
    if (broadcast) publishWindowState(false);
  }

  function toggleQuickMenu() {
    if (quickMenu.hidden) openQuickMenu();
    else closeQuickMenu();
  }

  function openQuickMenu() {
    renderQuickMenu();
    const rect = orb.getBoundingClientRect();
    const width = Math.min(282, innerWidth - 16);
    const estimatedHeight = Math.min(500, innerHeight - 16);
    const left = clamp(rect.right - width, 8, Math.max(8, innerWidth - width - 8));
    const top = clamp(rect.bottom - estimatedHeight, 8, Math.max(8, innerHeight - estimatedHeight - 8));
    Object.assign(quickMenu.style, { width: `${width}px`, left: `${left}px`, top: `${top}px`, right: 'auto', bottom: 'auto' });
    quickMenu.hidden = false;
    quickMenu.classList.add('is-open');
  }

  function closeQuickMenu() {
    quickMenu.classList.remove('is-open');
    quickMenu.hidden = true;
  }

  function postQuickAction(action, value = '') {
    frame?.contentWindow?.postMessage({ source: 'FBASE_HOST', type: 'FBASE_QUICK_ACTION', action, value }, '*');
  }

  const pageViewer = {
    root: null,
    view: 'result',
    active: 'generated',
    dragging: false,
    dragStart: { x: 0, y: 0 },
    images: {
      generated: { scale: 1, x: 0, y: 0 },
      original: { scale: 1, x: 0, y: 0 }
    }
  };

  function safeImageUrl(value) {
    const url = String(value || '').trim();
    return /^(data:image\/|blob:|https?:\/\/|chrome-extension:\/\/)/i.test(url) ? url : '';
  }

  function ensurePageImageViewer() {
    if (pageViewer.root?.isConnected) return pageViewer.root;
    const viewer = document.createElement('section');
    viewer.className = 'fbase-page-viewer';
    viewer.hidden = true;
    viewer.setAttribute('role', 'dialog');
    viewer.setAttribute('aria-modal', 'true');
    viewer.setAttribute('aria-label', 'F·BASE 全屏图片查看器');
    viewer.innerHTML = `
      <div class="fbase-page-viewer-backdrop" data-viewer-close></div>
      <header class="fbase-page-viewer-toolbar">
        <div class="fbase-page-viewer-brand"><span>F</span><strong>图片查看</strong></div>
        <nav class="fbase-page-viewer-tabs" aria-label="图片视图">
          <button type="button" data-viewer-view="result">结果图</button>
          <button type="button" data-viewer-view="original">原图</button>
          <button type="button" data-viewer-view="compare">对比</button>
        </nav>
        <div class="fbase-page-viewer-tools">
          <button type="button" data-viewer-zoom="out" aria-label="缩小">−</button>
          <button type="button" data-viewer-zoom="reset" class="viewer-zoom-value">100%</button>
          <button type="button" data-viewer-zoom="in" aria-label="放大">+</button>
          <button type="button" data-viewer-close class="viewer-close" aria-label="关闭">×</button>
        </div>
      </header>
      <main class="fbase-page-viewer-stage" data-viewer-stage>
        <figure class="fbase-page-viewer-pane" data-image-key="generated"><figcaption>结果图</figcaption><img alt="生成结果大图"></figure>
        <figure class="fbase-page-viewer-pane" data-image-key="original"><figcaption>原图</figcaption><img alt="参考原图大图"></figure>
      </main>
      <p class="fbase-page-viewer-hint">滚轮缩放 · 拖动查看 · 双击复位 · Esc 关闭</p>
    `;
    document.documentElement.append(viewer);
    pageViewer.root = viewer;

    viewer.addEventListener('click', event => {
      if (event.target.closest('[data-viewer-close]')) return closePageImageViewer();
      const viewButton = event.target.closest('[data-viewer-view]');
      if (viewButton && !viewButton.disabled) return setPageViewerView(viewButton.dataset.viewerView);
      const zoomButton = event.target.closest('[data-viewer-zoom]');
      if (zoomButton) {
        const action = zoomButton.dataset.viewerZoom;
        if (action === 'reset') resetPageViewerImage();
        else zoomPageViewerImage(action === 'in' ? 1.2 : 0.83);
      }
      const pane = event.target.closest('[data-image-key]');
      if (pane) {
        pageViewer.active = pane.dataset.imageKey;
        applyPageViewerTransform();
      }
    });
    viewer.addEventListener('wheel', event => {
      const pane = event.target.closest('[data-image-key]');
      if (!pane) return;
      event.preventDefault();
      pageViewer.active = pane.dataset.imageKey;
      zoomPageViewerImage(event.deltaY < 0 ? 1.12 : 0.89);
    }, { passive: false });
    viewer.addEventListener('pointerdown', event => {
      const pane = event.target.closest('[data-image-key]');
      if (!pane || event.button !== 0) return;
      pageViewer.active = pane.dataset.imageKey;
      const imageState = pageViewer.images[pageViewer.active];
      pageViewer.dragging = true;
      pageViewer.dragStart = { x: event.clientX - imageState.x, y: event.clientY - imageState.y };
      pane.setPointerCapture(event.pointerId);
      pane.classList.add('is-dragging');
      applyPageViewerTransform();
    });
    viewer.addEventListener('pointermove', event => {
      if (!pageViewer.dragging) return;
      const imageState = pageViewer.images[pageViewer.active];
      imageState.x = event.clientX - pageViewer.dragStart.x;
      imageState.y = event.clientY - pageViewer.dragStart.y;
      applyPageViewerTransform();
    });
    const finishDrag = () => {
      pageViewer.dragging = false;
      viewer.querySelectorAll('.is-dragging').forEach(node => node.classList.remove('is-dragging'));
    };
    viewer.addEventListener('pointerup', finishDrag);
    viewer.addEventListener('pointercancel', finishDrag);
    viewer.addEventListener('dblclick', event => {
      const pane = event.target.closest('[data-image-key]');
      if (!pane) return;
      pageViewer.active = pane.dataset.imageKey;
      resetPageViewerImage();
    });
    return viewer;
  }

  function openPageImageViewer(payload) {
    const generatedUrl = safeImageUrl(payload.generatedUrl);
    const originalUrl = safeImageUrl(payload.originalUrl);
    if (!generatedUrl && !originalUrl) return;
    const viewer = ensurePageImageViewer();
    const generatedImage = viewer.querySelector('[data-image-key="generated"] img');
    const originalImage = viewer.querySelector('[data-image-key="original"] img');
    generatedImage.src = generatedUrl;
    originalImage.src = originalUrl;
    viewer.querySelector('[data-viewer-view="result"]').disabled = !generatedUrl;
    viewer.querySelector('[data-viewer-view="original"]').disabled = !originalUrl;
    viewer.querySelector('[data-viewer-view="compare"]').disabled = !generatedUrl || !originalUrl;
    resetAllPageViewerImages();
    setPageViewerView(payload.view === 'original' && originalUrl ? 'original' : payload.view === 'compare' && generatedUrl && originalUrl ? 'compare' : generatedUrl ? 'result' : 'original');
    viewer.hidden = false;
    document.documentElement.classList.add('fbase-viewer-open');
  }

  function closePageImageViewer() {
    if (pageViewer.root) pageViewer.root.hidden = true;
    pageViewer.dragging = false;
    document.documentElement.classList.remove('fbase-viewer-open');
  }

  function setPageViewerView(view) {
    if (!pageViewer.root) return;
    pageViewer.view = view;
    pageViewer.active = view === 'original' ? 'original' : 'generated';
    pageViewer.root.dataset.view = view;
    pageViewer.root.querySelectorAll('[data-viewer-view]').forEach(button => button.classList.toggle('active', button.dataset.viewerView === view));
    applyPageViewerTransform();
  }

  function resetAllPageViewerImages() {
    Object.values(pageViewer.images).forEach(item => Object.assign(item, { scale: 1, x: 0, y: 0 }));
    applyPageViewerTransform();
  }

  function resetPageViewerImage() {
    Object.assign(pageViewer.images[pageViewer.active], { scale: 1, x: 0, y: 0 });
    applyPageViewerTransform();
  }

  function zoomPageViewerImage(factor) {
    const imageState = pageViewer.images[pageViewer.active];
    imageState.scale = clamp(imageState.scale * factor, 0.2, 10);
    applyPageViewerTransform();
  }

  function applyPageViewerTransform() {
    if (!pageViewer.root) return;
    pageViewer.root.querySelectorAll('[data-image-key]').forEach(pane => {
      const key = pane.dataset.imageKey;
      const imageState = pageViewer.images[key];
      pane.classList.toggle('is-active', key === pageViewer.active);
      pane.querySelector('img').style.transform = `translate3d(${imageState.x}px, ${imageState.y}px, 0) scale(${imageState.scale})`;
    });
    const zoomValue = pageViewer.root.querySelector('.viewer-zoom-value');
    if (zoomValue) zoomValue.textContent = `${Math.round(pageViewer.images[pageViewer.active].scale * 100)}%`;
  }

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && pageViewer.root && !pageViewer.root.hidden) {
      event.preventDefault();
      closePageImageViewer();
    }
  }, true);

  function normalizeQuickSettings(value) {
    const input = value && typeof value === 'object' ? value : {};
    const aspectRatio = ASPECT_RATIOS.includes(input.aspectRatio) ? input.aspectRatio : 'AUTO';
    const promptDetail = ['concise', 'standard', 'precise'].includes(input.promptDetail) ? input.promptDetail : 'standard';
    return {
      aspectRatio, promptDetail,
      outputVariant: input.outputVariant !== false,
      inspectButton: input.inspectButton !== false,
      colorCardMode: input.colorCardMode !== false,
      referencePalette: !!input.referencePalette,
      actionReferenceMode: !!input.actionReferenceMode
    };
  }

  async function restoreQuickSettings() {
    const stored = await storageGet(['fbaseQuickSettings']);
    state.quickSettings = normalizeQuickSettings(stored.fbaseQuickSettings);
    renderQuickMenu();
    // 读取失败（如扩展上下文失效）也标记 ready，按默认值兜底
    state.settingsReady = true;
  }

  async function toggleQuickSetting(key) {
    if (!(key in DEFAULT_QUICK_SETTINGS)) return;
    // 基于 storage 最新值翻转，避免本实例 stale state 覆盖其它窗口改过的开关
    let latest = state.quickSettings;
    const stored = await storageGet(['fbaseQuickSettings']);
    if (stored.fbaseQuickSettings) latest = normalizeQuickSettings(stored.fbaseQuickSettings);
    state.quickSettings = normalizeQuickSettings({ ...latest, [key]: !latest[key] });
    renderQuickMenu();
    await storageSet({ fbaseQuickSettings: state.quickSettings });
  }

  function renderQuickMenu() {
    const hostLabel = quickMenu.querySelector('[data-quick-host-label]');
    if (hostLabel) hostLabel.textContent = location.hostname || '当前网站';
    quickMenu.querySelectorAll('[data-quick-toggle]').forEach(button => {
      const active = !!state.quickSettings[button.dataset.quickToggle];
      button.classList.toggle('active', active);
      button.setAttribute('aria-checked', String(active));
    });
    hoverPick.classList.toggle('feature-disabled', !state.quickSettings.inspectButton);
    if (!state.quickSettings.inspectButton) hideHoverPick();
  }

  async function checkShellVisibility() {
    try {
      if (sessionStorage.getItem(SESSION_HIDE_KEY)) {
        hideShell('session', false);
        return;
      }
    } catch {}
    const stored = await storageGet(['fbaseDisabledHosts']);
    const hosts = Array.isArray(stored.fbaseDisabledHosts) ? stored.fbaseDisabledHosts.map(String) : [];
    if (location.hostname && hosts.includes(location.hostname)) hideShell('site', false);
  }

  function hideShell(reason, notify = true) {
    state.shellHidden = true;
    root.setAttribute('data-shell-hidden', reason || 'session');
    closeQuickMenu();
    // 仅用户显式关闭时广播（初始化恢复隐藏状态用 notify=false，避免误杀其它标签页的浮窗）
    closeWindow(notify);
    hideHoverPick();
    if (!notify) return;
    if (reason === 'session') {
      try { sessionStorage.setItem(SESSION_HIDE_KEY, '1'); } catch {}
    }
  }

  async function unhideShell() {
    if (!state.shellHidden) return;
    state.shellHidden = false;
    root.removeAttribute('data-shell-hidden');
    try { sessionStorage.removeItem(SESSION_HIDE_KEY); } catch {}
    const stored = await storageGet(['fbaseDisabledHosts']);
    const hosts = Array.isArray(stored.fbaseDisabledHosts) ? stored.fbaseDisabledHosts.map(String) : [];
    const next = hosts.filter(host => host !== location.hostname);
    if (next.length !== hosts.length) await storageSet({ fbaseDisabledHosts: next });
  }

  async function disableCurrentSite() {
    const host = location.hostname;
    if (!host) return;
    const stored = await storageGet(['fbaseDisabledHosts']);
    const hosts = Array.isArray(stored.fbaseDisabledHosts) ? stored.fbaseDisabledHosts.map(String) : [];
    if (!hosts.includes(host)) await storageSet({ fbaseDisabledHosts: [...hosts, host] });
  }

  function toggleWindow() {
    if (state.open) closeWindow();
    else openWindow();
  }

  function findVisual(start) {
    let element = start instanceof Element ? start : null;
    while (element && element !== document.documentElement) {
      const rect = element.getBoundingClientRect();
      if (rect.width >= 100 && rect.height >= 100) {
        if (element instanceof HTMLImageElement) return { element, srcUrl: element.currentSrc || element.src || '', alt: element.alt || '' };
        if (element instanceof HTMLVideoElement || element instanceof HTMLCanvasElement) return { element, srcUrl: '', alt: element.getAttribute('aria-label') || '' };
        const match = /url\(["']?(.*?)["']?\)/.exec(getComputedStyle(element).backgroundImage || '');
        if (match?.[1]) return { element, srcUrl: match[1], alt: element.getAttribute('aria-label') || '' };
      }
      element = element.parentElement;
    }
    return null;
  }

  function positionHoverPick(element) {
    const rect = element.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > innerHeight || rect.right < 0 || rect.left > innerWidth) return hideHoverPick();
    const left = clamp(rect.right - 132, 8, innerWidth - 140);
    const top = clamp(rect.top + 10, 8, innerHeight - 40);
    Object.assign(hoverPick.style, { left: `${left}px`, top: `${top}px` });
    hoverPick.hidden = false;
  }

  function hideHoverPick() {
    hoverPick.hidden = true;
    state.hoverTarget = null;
  }

  function keepInsideViewport() {
    if (!state.open) return;
    const rect = panel.getBoundingClientRect();
    const width = Math.min(rect.width, innerWidth - 16);
    const height = Math.min(rect.height, innerHeight - 16);
    const left = clamp(rect.left, 8, innerWidth - width - 8);
    const top = clamp(rect.top, 8, innerHeight - height - 8);
    Object.assign(panel.style, { width: `${width}px`, height: `${height}px`, left: `${left}px`, top: `${top}px`, right: 'auto', bottom: 'auto' });
  }

  async function restoreLayout() {
    const stored = await storageGet(['fbaseFloatingLayout']);
    applyLayout(stored.fbaseFloatingLayout || {});
  }

  function applyLayout(layout = {}) {
    const availableWidth = Math.max(160, innerWidth - 16);
    const availableHeight = Math.max(220, innerHeight - 16);
    const width = Math.min(availableWidth, Math.max(MIN_SIZE.width, Number(layout.width) || DEFAULT_SIZE.width));
    const height = Math.min(availableHeight, Math.max(MIN_SIZE.height, Number(layout.height) || DEFAULT_SIZE.height));
    const left = Number.isFinite(layout.left) ? clamp(layout.left, 8, Math.max(8, innerWidth - width - 8)) : null;
    const top = Number.isFinite(layout.top) ? clamp(layout.top, 8, Math.max(8, innerHeight - height - 8)) : null;
    Object.assign(panel.style, { width: `${width}px`, height: `${height}px` });
    if (left !== null && top !== null) Object.assign(panel.style, { left: `${left}px`, top: `${top}px`, right: 'auto', bottom: 'auto' });
    if (Number.isFinite(layout.orbLeft) && Number.isFinite(layout.orbTop)) {
      Object.assign(orb.style, {
        left: `${clamp(layout.orbLeft, 8, Math.max(8, innerWidth - orb.offsetWidth - 8))}px`,
        top: `${clamp(layout.orbTop, 8, Math.max(8, innerHeight - orb.offsetHeight - 8))}px`,
        right: 'auto', bottom: 'auto'
      });
    }
  }

  async function restoreSharedWindowState() {
    // 向 background 查询本标签页是否为浮窗宿主（全局任意时刻只允许一个浮窗）
    try {
      const response = await chrome.runtime.sendMessage({ type: 'FBASE_QUERY_WINDOW' });
      if (response?.open && response?.visible) openWindow(false);
    } catch {}
  }

  function publishWindowState(open) {
    // content script 无 session storage 写权限，统一交由 background 记录并路由到唯一宿主
    try {
      chrome.runtime.sendMessage({ type: 'FBASE_SET_WINDOW', open: Boolean(open) }).catch(() => {});
    } catch {}
  }

  function saveLayout() {
    const panelRect = panel.getBoundingClientRect();
    const orbRect = orb.getBoundingClientRect();
    storageSet({
      fbaseFloatingLayout: {
        left: Math.round(panelRect.left), top: Math.round(panelRect.top),
        width: Math.round(panelRect.width), height: Math.round(panelRect.height),
        orbLeft: Math.round(orbRect.left), orbTop: Math.round(orbRect.top)
      }
    });
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }
})();
