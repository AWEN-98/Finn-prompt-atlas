'use strict';

if (globalThis.__fbasePickerController?.stop) {
  try { globalThis.__fbasePickerController.stop(); } catch {}
}
{
  let active = false;
  let current = null;
  let outline = null;
  let hint = null;

  function start() {
    stop();
    active = true;
    outline = document.createElement('div');
    outline.style.cssText = 'position:fixed;z-index:2147483646;pointer-events:none;border:3px solid #ef5b2a;background:rgba(239,91,42,.12);border-radius:10px;box-shadow:0 0 0 1px rgba(255,255,255,.85),0 8px 30px rgba(0,0,0,.22);display:none;';
    hint = document.createElement('div');
    hint.textContent = '点击选择图片，按 Esc 取消';
    hint.style.cssText = 'position:fixed;z-index:2147483647;left:50%;top:20px;transform:translateX(-50%);pointer-events:none;padding:10px 16px;border-radius:999px;background:#171717;color:#fff;font:600 13px/1.2 system-ui,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.25);';
    document.documentElement.append(outline, hint);
    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKey, true);
  }

  function stop() {
    active = false;
    current = null;
    document.removeEventListener('mousemove', onMove, true);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('keydown', onKey, true);
    outline?.remove();
    hint?.remove();
    outline = null;
    hint = null;
  }

  function onMove(event) {
    if (!active) return;
    current = findVisual(event.target);
    if (!current || !outline) {
      if (outline) outline.style.display = 'none';
      return;
    }
    const rect = current.element.getBoundingClientRect();
    Object.assign(outline.style, {
      display: 'block', left: `${Math.max(0, rect.left)}px`, top: `${Math.max(0, rect.top)}px`,
      width: `${Math.max(0, Math.min(innerWidth, rect.right) - Math.max(0, rect.left))}px`,
      height: `${Math.max(0, Math.min(innerHeight, rect.bottom) - Math.max(0, rect.top))}px`
    });
  }

  function onClick(event) {
    if (!active) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!current) return;
    const rect = current.element.getBoundingClientRect();
    const payload = {
      srcUrl: current.srcUrl, pageUrl: location.href, pageTitle: document.title || '网页参考图', alt: current.alt,
      rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      viewportWidth: innerWidth, viewportHeight: innerHeight, devicePixelRatio, scrollX, scrollY
    };
    stop();
    chrome.runtime.sendMessage({ type: 'FINN_CAPTURED_IMAGE', payload }).catch(() => {});
  }

  function onKey(event) {
    if (event.key === 'Escape') stop();
  }

  function findVisual(start) {
    let element = start instanceof Element ? start : null;
    while (element && element !== document.documentElement) {
      if (element instanceof HTMLImageElement) return { element, srcUrl: element.currentSrc || element.src || '', alt: element.alt || '' };
      if (element instanceof HTMLVideoElement || element instanceof HTMLCanvasElement) return { element, srcUrl: '', alt: element.getAttribute('aria-label') || '' };
      const background = getComputedStyle(element).backgroundImage;
      const match = /url\(["']?(.*?)["']?\)/.exec(background || '');
      if (match?.[1] && element.getBoundingClientRect().width >= 80 && element.getBoundingClientRect().height >= 80) {
        return { element, srcUrl: match[1], alt: element.getAttribute('aria-label') || '' };
      }
      element = element.parentElement;
    }
    return null;
  }

  globalThis.__fbasePickerController = { start, stop };
  start();
}
