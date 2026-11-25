// Protótipos do assistente (V1): painel de vozes + estados de demonstração. Comum a A, B e C.
const VOZES = [
  ["pt-BR-FranciscaNeural", "Francisca", "pt-BR, mais clara e firme"],
  ["pt-BR-ThalitaMultilingualNeural", "Thalita", "pt-BR multilíngue, mais natural"],
  ["en-US-AvaMultilingualNeural", "Ava", "multilíngue (sotaque leve)"],
  ["en-US-EmmaMultilingualNeural", "Emma", "multilíngue (sotaque leve)"],
  ["de-DE-SeraphinaMultilingualNeural", "Seraphina", "multilíngue (sotaque)"],
  ["fr-FR-VivienneMultilingualNeural", "Vivienne", "multilíngue (sotaque)"],
];
const PEDIDO = "Ei, Claude, resume essa página pra mim";
const RESPOSTA = "É um artigo sobre o Copilot Voice: você chama pela palavra de ativação, um microfone pequeno aparece embaixo da tela e a conversa acaba quando você fica em silêncio ou toca no X.";
const TEXTOS = { parado: "Diga “Ei, Claude” ou toque no microfone", ouvindo: "", pensando: "", falando: "", texto: "" };

const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const ICO = {
  mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
  play: '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
  pausa: '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  enviar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  tela: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/></svg>',
  abrir: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M14 4h6v6M20 4l-8 8M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
};
$$("[data-ico]").forEach(e => e.innerHTML = ICO[e.dataset.ico]);

// ---------- painel do protótipo ----------
const proto = $(".proto");
proto.insertAdjacentHTML("beforeend", `
  <h2>Estados (clique para ver)</h2>
  <div class="estados">${["parado", "ouvindo", "pensando", "falando", "texto"].map(e => `<button data-e="${e}">${{ parado: "Parado", ouvindo: "Ouvindo", pensando: "Pensando", falando: "Falando", texto: "Por texto" }[e]}</button>`).join("")}
  <button data-e="ciclo">▶ Conversa inteira</button></div>
  <h2>Vozes (clique para ouvir; a marcada é a usada no “Falando”)</h2>
  <div class="vozes">${VOZES.map(([a, n, d], i) => `<div class="voz${i === 1 ? " escolhida" : ""}" data-v="${a}"><button class="play" title="Ouvir ${n}">${ICO.play}</button><div><b>${n}</b><small>${d}</small></div></div>`).join("")}</div>
  <h2>Tema</h2><div class="estados"><button data-t="escuro" class="sel">Escuro</button><button data-t="claro">Claro</button></div>`);

const audio = new Audio();
let vozEscolhida = VOZES[1][0];
function tocar(id) {
  const linha = $(`.voz[data-v="${id}"]`), mesma = linha.classList.contains("tocando");
  audio.pause(); $$(".voz").forEach(v => { v.classList.remove("tocando"); $(".play", v).innerHTML = ICO.play; });
  if (mesma) return;
  audio.src = `vozes/${id}.mp3`; audio.currentTime = 0; audio.play();
  linha.classList.add("tocando"); $(".play", linha).innerHTML = ICO.pausa;
}
audio.onended = () => { $$(".voz").forEach(v => { v.classList.remove("tocando"); $(".play", v).innerHTML = ICO.play; }); if (estado === "falando") mudar("parado"); };
$$(".voz").forEach(v => {
  $(".play", v).onclick = e => { e.stopPropagation(); tocar(v.dataset.v); };
  v.onclick = () => { $$(".voz").forEach(x => x.classList.remove("escolhida")); v.classList.add("escolhida"); vozEscolhida = v.dataset.v; };
});
$$("[data-t]").forEach(b => b.onclick = () => { document.documentElement.dataset.tema = b.dataset.t; $$("[data-t]").forEach(x => x.classList.toggle("sel", x === b)); });

// ---------- assistente ----------
const A = $("#assist");
let estado = "parado", modo = "voz", timers = [];
$$("[data-ondas]").forEach(o => o.innerHTML = "<i></i>".repeat(+o.dataset.ondas || 16));
const fala = $("[data-fala]"), lista = $("[data-lista]");
const limpar = () => { timers.forEach(clearTimeout); timers.forEach(clearInterval); timers = []; };
function digitar(el, texto, ms, fim) {
  let i = 0; el.textContent = ""; el.classList.add("digitando");
  const t = setInterval(() => { el.textContent = texto.slice(0, ++i); if (i >= texto.length) { clearInterval(t); el.classList.remove("digitando"); fim && fim(); } }, ms);
  timers.push(t);
}
function bolha(quem, texto, animar = true) {
  if (!lista) return null;
  const b = document.createElement("div"); b.className = "msg " + quem; b.textContent = texto;
  if (animar) b.style.animation = "sobe .3s ease-out";
  lista.append(b); lista.scrollTop = lista.scrollHeight; return b;
}
// ondas: altura aleatória enquanto ouve/fala
setInterval(() => $$("[data-ondas] i").forEach(i => i.style.height = (estado === "ouvindo" || estado === "falando") ? 4 + Math.random() * 20 + "px" : "4px"), 110);

function mudar(e, auto) {
  limpar(); if (e !== "falando") { audio.pause(); $$(".voz").forEach(v => { v.classList.remove("tocando"); $(".play", v).innerHTML = ICO.play; }); }
  estado = e; A.dataset.estado = e === "texto" ? "parado" : e;
  if (e === "texto") definirModo("texto"); else if (e !== "parado" && !auto) definirModo("voz");
  $$(".estados [data-e]").forEach(b => b.classList.toggle("sel", b.dataset.e === e));
  if (fala) { fala.classList.remove("digitando"); fala.dataset.quem = ""; }
  if (e === "parado" && fala) fala.textContent = modo === "texto" ? "Escreva o que precisa" : TEXTOS.parado;
  if (e === "ouvindo") { if (fala) { fala.dataset.quem = "voce"; digitar(fala, PEDIDO, 45); } }
  if (e === "pensando") { if (fala) fala.innerHTML = '<span class="pontos"><i></i><i></i><i></i></span>'; if (lista && !lista.querySelector(".msg.voce")) bolha("voce", PEDIDO); }
  if (e === "falando") {
    if (lista) { if (!lista.querySelector(".msg.voce")) bolha("voce", PEDIDO); digitar(bolha("ia", ""), RESPOSTA, 28); }
    if (fala) { fala.dataset.quem = "ia"; digitar(fala, RESPOSTA, 28); }
    audio.src = `vozes/${vozEscolhida}.mp3`; audio.play();
  }
  if (e === "texto" && lista && !lista.querySelector(".msg")) { bolha("voce", "resume essa página pra mim"); bolha("ia", RESPOSTA); }
  if (e === "texto" && fala) fala.textContent = RESPOSTA;
  window.aoMudar && window.aoMudar(e);
}
function definirModo(m) {
  modo = m; A.dataset.modo = m;
  $$("[data-modo] button").forEach(b => b.classList.toggle("sel", b.dataset.m === m));
  if (m === "texto") setTimeout(() => $("[data-form] input")?.focus(), 50);
}
$$("[data-modo] button").forEach(b => b.onclick = () => { definirModo(b.dataset.m); mudar(b.dataset.m === "texto" ? "texto" : "parado", true); });
$$(".estados [data-e]").forEach(b => b.onclick = () => {
  if (b.dataset.e !== "ciclo") return mudar(b.dataset.e);
  if (lista) lista.innerHTML = "";
  mudar("parado"); timers.push(setTimeout(() => { mudar("ouvindo"); timers.push(setTimeout(() => { mudar("pensando"); timers.push(setTimeout(() => mudar("falando"), 1400)); }, 2600)); }, 900));
});
$$("[data-mic]").forEach(b => b.onclick = () => mudar(estado === "ouvindo" ? "pensando" : "ouvindo"));
$("[data-form]")?.addEventListener("submit", ev => {
  ev.preventDefault(); const i = $("input", ev.target); if (!i.value.trim()) return;
  const t = i.value; i.value = ""; bolha("voce", t);
  if (fala) fala.innerHTML = '<span class="pontos"><i></i><i></i><i></i></span>';
  timers.push(setTimeout(() => { if (lista) digitar(bolha("ia", ""), RESPOSTA, 20); if (fala) digitar(fala, RESPOSTA, 20); }, 900));
});
$$("[data-fechar]").forEach(b => b.onclick = () => { A.classList.add("saindo"); setTimeout(() => { A.classList.remove("saindo"); mudar("parado"); }, 600); });
// dica ao passar o mouse em tudo que tem title
let dica;
document.addEventListener("mouseover", e => {
  const t = e.target.closest("[title]"); dica?.remove(); dica = null; if (!t) return;
  t.dataset.tit = t.title; t.removeAttribute("title");
});
document.addEventListener("mouseover", e => {
  const t = e.target.closest("[data-tit]"); dica?.remove(); dica = null; if (!t) return;
  dica = document.createElement("div"); dica.className = "dica"; dica.textContent = t.dataset.tit; document.body.append(dica);
  const r = t.getBoundingClientRect(), d = dica.getBoundingClientRect();
  dica.style.left = Math.max(4, Math.min(innerWidth - d.width - 4, r.left + r.width / 2 - d.width / 2)) + "px";
  dica.style.top = (r.top - d.height - 6 < 4 ? r.bottom + 6 : r.top - d.height - 6) + "px";
});
mudar("parado"); if (location.hash) mudar(location.hash.slice(1));
