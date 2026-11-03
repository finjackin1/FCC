// GERADO de ESCOLHIDA\proposta.html (moldura A "Por cima"); não editar aqui
const cab = (n, j) => `<div class="j-cab"><span class="j-ic">${M.ico(j.ico)}</span><b>${j.tit}</b>${j.tecla ? `<kbd>${j.tecla}</kbd>` : ""}<button class="ib" data-act="fecha" title="Fechar (Esc)">${M.ico("x")}</button></div>`;
window.MOLDURA = (n, j, corpo) => `<div class="veu2" data-act="fecha-fora"><div class="jan ${n} ${M.janNova ? 'nova' : ''}">${cab(n, j)}${corpo}</div></div>`;
