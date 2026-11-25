(async () => { const R = {};
  await ac('nova', 600); R.nova = (document.querySelector('#cab')?.innerText || '').replace(/\n+/g, ' / ').slice(0, 120);
  await ac('modelo', 400); R.modelo = menuT().join(' | '); await tecla('Escape');
  await ac('modo', 400); R.modo = menuT().join(' | '); await tecla('Escape');
  await ac('escolherPasta', 400); R.pasta = menuT().join(' | '); await opc('Alfa', 600); R.pastaSel = ($q('[data-acao="escolherPasta"]')?.innerText || '').trim();
  await digitar('/', 300); R.slash = ($q('#pop')?.innerText || '(sem pop)').replace(/\n+/g, ' / ').slice(0, 160); await tecla('Escape', {}, '#txt');
  await digitar('@', 300); R.arroba = ($q('#pop')?.innerText || '(sem pop)').replace(/\n+/g, ' / ').slice(0, 160); await tecla('Escape', {}, '#txt'); await digitar('', 100);
  await ac('ditar', 600); R.ditar = AVS.splice(0).join('|') || 'sem aviso'; 
  for (const p of ['Passos', 'Mudanças', 'Prévia', 'Terminal', 'Arquivos']) { const b = $q('#cab [data-pn="' + p + '"]'); if (!b) { R['pn' + p] = 'SEM BOTAO'; continue; } b.click(); await espera(700); R['pn' + p] = ($q('.pn.aberto')?.innerText || '(fechado)').replace(/\n+/g, ' / ').slice(0, 100); b.click(); await espera(300); }
  // enviar sem conversa real: só digitar e conferir fila
  await digitar('teste de fila', 100); R.txt = $q('#txt').value; await digitar('', 50);
  // menu do projeto (botão direito)
  const pj = $$q('#lado .proj, #lado [data-acao="grupo"]'); R.nproj = pj.length;
  const alvo = $$q('#lado .item').find(x => /Alfa/.test(x.innerText)); if (alvo) { alvo.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 100, clientY: 150 })); await espera(400); R.ctx = menuT().join(' | '); await tecla('Escape'); }
  // novo rascunho
  await ac('novaNota', 700); R.nota = jan().slice(0, 150) || ($q('#n-salvo') ? 'nota aberta' : '(nada)'); 
  R.ERR = ERR; return JSON.stringify(R, null, 1); })()
