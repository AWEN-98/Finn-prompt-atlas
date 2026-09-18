
/* 仅管理界面语义和焦点，不访问业务数据。 */
(() => {
  const interactive='[onclick]:not(button):not(a):not(input):not(select):not(textarea)';
  const focusable='button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),select:not(:disabled),[tabindex]:not([tabindex="-1"])';
  const openers=new WeakMap();
  function enhance(root=document){
    root.querySelectorAll('button.modal-close').forEach(el=>el.setAttribute('aria-label','关闭对话框'));
    root.querySelectorAll('label:not([for])').forEach(label=>{
      const field=label.nextElementSibling;
      if(field?.matches('input,select,textarea')&&field.id)label.htmlFor=field.id;
    });
    root.querySelectorAll(interactive).forEach(el=>{
      if(/^(?:event\.)?stopPropagation\(\);?$/.test((el.getAttribute('onclick')||'').trim())||el.classList.contains('tc-actions'))return;
      if(!el.hasAttribute('role'))el.setAttribute('role','button');
      if(!el.hasAttribute('tabindex'))el.tabIndex=0;
      if(el.matches('.filter-chip,.subject-link,.lib-tab,.nav-switch-item'))el.setAttribute('aria-pressed',String(el.classList.contains('active')));
    });
    document.querySelectorAll('.nav-switch-item,.lib-tab').forEach(el=>el.setAttribute('aria-pressed',String(el.classList.contains('active'))));
    document.querySelectorAll('.modal-overlay').forEach(el=>{
      el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');
      if(!el.hasAttribute('aria-label')&&!el.hasAttribute('aria-labelledby')){
        const title=el.querySelector('h2,h3,.modal-title');el.setAttribute('aria-label',title?.textContent.trim()||'编辑与详情');
      }
      const opened=el.classList.contains('open');
      if(opened&&!openers.has(el)){
        openers.set(el,document.activeElement);
        el.tabIndex=-1;
        (Array.from(el.querySelectorAll(focusable)).find(n=>n.getClientRects().length)||el).focus({preventScroll:true});
      }else if(!opened&&openers.has(el)){
        const previous=openers.get(el);openers.delete(el);
        if(previous?.isConnected)previous.focus({preventScroll:true});
      }
    });
  }
  document.addEventListener('keydown',e=>{
    const dialogs=Array.from(document.querySelectorAll('.modal-overlay.open'));
    const dialog=dialogs[dialogs.length-1];
    if(dialog&&e.key==='Escape'){e.preventDefault();e.stopPropagation();dialog.classList.remove('open');return;}
    if(dialog&&e.key==='Tab'){
      const items=Array.from(dialog.querySelectorAll(focusable)).filter(n=>n.getClientRects().length);
      const first=items[0],last=items[items.length-1];
      if(!first){e.preventDefault();dialog.focus();return;}
      if(e.shiftKey&&(document.activeElement===first||!dialog.contains(document.activeElement))){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&(document.activeElement===last||!dialog.contains(document.activeElement))){e.preventDefault();first.focus();}
    }
    if((e.key==='Enter'||e.key===' ')&&e.target.matches(interactive+'[role="button"]')){e.preventDefault();e.target.click();}
  },true);
  let pending=false;
  const observer=new MutationObserver(()=>{if(pending)return;pending=true;queueMicrotask(()=>{pending=false;enhance();});});
  enhance();observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
})();

