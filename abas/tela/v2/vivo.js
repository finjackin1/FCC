// v3 "vivo": each project has fixed color (from name, same everywhere). Shared by proposals A, B and C.
(function () {
  const CORES = ['#ff7849', '#f59e0b', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#ec4899', '#ef4444'];
  M.corDe = (n) => { let h = 0; for (const c of String(n)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return CORES[h % CORES.length]; };
  const pintar = (h) => h.replace(/data-arr="([^"]+)"/g, (m, n) => `${m} style="--cor:${M.corDe(n)}"`);
  const tr = M.trilhoHTML; M.trilhoHTML = () => pintar(tr());
    // sheet animates only when shown project CHANGES (for 0.5 s; then same HTML without class)
  let fUlt = null, fT = 0;
  const fi = M.fichaHTML; M.fichaHTML = (q) => { if (!q) return fi(q); if (q.n !== fUlt) { fUlt = q.n; fT = Date.now(); } const ent = Date.now() - fT < 500 ? ' f-entra' : '';
    return fi(q).replace('<div class="ficha">', `<div class="ficha${ent}" style="--cor:${M.corDe(q.n)}">`); };
  // pulses and spins on clock beat: rebuilt element continues from same point (doesn't restart = no flicker)
  const SINC = new Set(['pulso', 'pulso-p', 'pulso-b', 'pisca', 'anel', 'anel-c', 'gira', 'gira-ast', 'pulsa', 'lj-pul']); let pend = false;
  const sinc = () => { pend = false; if (document.getAnimations) for (const a of document.getAnimations()) if (SINC.has(a.animationName) && a.startTime !== 0) a.startTime = 0; };
  new MutationObserver(() => { if (!pend) { pend = true; requestAnimationFrame(sinc); } }).observe(document.documentElement, { childList: true, subtree: true });
})();
