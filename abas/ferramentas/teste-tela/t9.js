(async () => { const R = {}; const pn = $q('.pn');
  R.estr = [...pn.children].map(c => c.tagName + '.' + c.className + '(' + c.innerText.length + ')').join(' ; ');
  for (const p of ['Passos', 'Mudanças', 'Prévia', 'Terminal', 'Arquivos']) { const b = $$q('[data-pn="' + p + '"]').find(vis); b.click(); await espera(1100);
    const on = $$q('.pn [data-pn].on, [data-pn].on').map(x => x.dataset.pn).join('/'); const pag = [...pn.querySelectorAll('.pag,.pagina,[class*=pag]')].filter(vis).map(x => x.className + ':' + x.innerText.replace(/\n+/g, ' / ').slice(0, 60)).join(' ## ');
    R[p] = on + ' => ' + pag; }
  R.ERR = ERR; return JSON.stringify(R, null, 1); })()
