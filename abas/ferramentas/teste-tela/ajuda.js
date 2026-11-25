(() => {
window.ERR = window.ERR || []; window.AVS = window.AVS || [];
if (window.__aj) return 'ja'; window.__aj = 1;
addEventListener('error', e => ERR.push(e.message + ' @' + (e.filename||'').split('/').pop() + ':' + e.lineno));
addEventListener('unhandledrejection', e => ERR.push('promessa: ' + (e.reason && e.reason.stack || e.reason)));
new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.classList && n.classList.contains('aviso')) AVS.push(n.textContent); }).observe(document.body, { childList: true });
window.$q = s => document.querySelector(s); window.$$q = s => [...document.querySelectorAll(s)];
window.espera = ms => new Promise(r => setTimeout(r, ms));
window.vis = e => { if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; };
window.clk = async (s, ms = 350) => { const e = typeof s === 'string' ? ($$q(s).find(vis) || $q(s)) : s; if (!e) return 'NAO ACHEI ' + s; e.click(); await espera(ms); return 'ok'; };
window.ac = (a, ms) => clk('[data-acao="' + a + '"]', ms);
window.menuT = () => $$q('.menu .op').map(o => o.textContent.trim());
window.opc = async (t, ms = 450) => { const o = $$q('.menu .op').find(o => o.textContent.includes(t)); if (!o) return 'NAO ACHEI op ' + t + ' em ' + menuT().join(' | '); o.click(); await espera(ms); return 'ok'; };
window.jan = () => { const t = $q('.tampa'); return t ? t.innerText.replace(/\n+/g, ' / ').slice(0, 900) : '(sem janela)'; };
window.digitar = async (t, ms = 100) => { const x = $q('#txt'); x.focus(); x.value = t; x.selectionStart = x.selectionEnd = t.length; x.dispatchEvent(new Event('input', { bubbles: true })); await espera(ms); };
window.tecla = async (key, o = {}, alvo) => { const e = alvo ? $q(alvo) : (document.activeElement || document.body); e.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...o })); e.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true, ...o })); await espera(250); };
window.fechar = async () => { const t = $q('.tampa'); if (t) { await tecla('Escape'); await espera(250); } };
window.confirm = m => { (window.CF = window.CF || []).push(m); return false; };
return 'ok';
})()
