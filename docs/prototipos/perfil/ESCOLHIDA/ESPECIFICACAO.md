# Perfil/Instalado/Enviar/Remover: contract (B "Mapa da pasta", chosen 2026-11-02)
Code: proposta.html + comum.css + comum.js. Screen is copied into program, bridge supplies data; change here first, then code.
Tokens: comum.css :root (vivo.css palette, dark). 4 px grid. Folder colors: --c-perfil orange, --c-proj blue, --c-conta violet, --c-ferr green, --c-sis gray.
Layout: window with `.mapa` 320 px (title + total, proportion bar 12 px, one `.bloco` min 56 px per folder: Perfil, Projetos, Conta, Ferramentas; "Fora do FCC" dashed No sistema; actions at bottom: Enviar a um amigo, Remover o FCC) + `.detalhe` (top 52 px with title and main button; scrolling `.corpo` padding 20).
States (hash `#tela.estado`): perfil, perfil.novo, perfil.outro, projects, conta, ferramentas, sistema, sistema.vazio, enviar, enviar.gerando, enviar.pronto, remover, remover.andamento. Each needs a scene in the appearance check.
Behavior: click block = detail; Enviar dims other blocks to .3; memory switch; "Salvar perfil" checkbox on by default; Remover needs hold of button (fill bar). Tooltips via data-dica after 600 ms. Entry animation `.entra` only on navigation; `:root.cena` disables animation for photos.
Keys: all controls are real buttons (Tab/Enter/Space), :focus-visible accent outline; Esc closes window (add in port). 
Known fix at port: hold is 1200 ms in comum.js, tooltip says 1 s: make both 1 s (house standard). "Veja em Instalado" text in remover: says "No sistema" in B.
Check: not yet swept with real clicks/keyboard; do at task 7 (playwright every state at real size).
