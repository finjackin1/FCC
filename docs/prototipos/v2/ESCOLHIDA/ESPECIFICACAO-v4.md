# v4 B "Painéis" — contract (chosen 31/10/2026)
Layer over ESCOLHIDA: `v4.js` + `v4.css` (copied to abas\tela\v2 by copiar-prototipo.ps1). Source proposals: docs\prototipos\v4\ (proposta-B.html = this, 0 px diff 31/10).
Change order: prototype first (this folder), then copiar-prototipo.ps1, then code. Program data only through `M.V4D` (abas\tela\app.js, block "v4 B").

## Elements (id = CSS class)
| id | where | what | data in program |
|---|---|---|---|
| v4-topo | top of .esq, 44 px, border-bottom | project color dot + title, tag cópia isolada, Resumido/Detalhado, Pergunta de lado, Lado a lado | t.titulo, t.p |
| v4-chip | message row, left of spacer | permission mode (Ctrl+Shift+M cycles) | t.modo4 → api.chatModo (SDK setPermissionMode): perguntar=default, editar=acceptEdits, planejar=plan, auto=auto |
| v4-ctx | message row, replaces "N tokens" | context ring + % | api.chatCtx (SDK getContextUsage) after each reply and on open |
| v4-pop.modo / .ctx | above message box | mode list / context breakdown + Resumir (sends /compact) | same |
| v4-tabs | right panel top | Projeto · Mudanças (count) · Terminal · Arquivos · hide (Ctrl+B) | |
| v4-res | Projeto tab | context ring 28 px + total +/− of changes | |
| v4-iso | Projeto tab | Cópia isolada switch | stage 2 (toast "ainda não está ligada") |
| v4-arqs / v4-diff | Mudanças tab (Ctrl+Shift+D) | files changed in THIS conversation (Edit/MultiEdit/Write, failed tools dropped) + unified diff; "+" on hover = line comment; Mandar (Ctrl+Enter) sends all comments as one message (queued if busy) | api.chatMud (abas\mudancas.js) |
| v4-fs | Arquivos tab | project root folders/files; click opens | api.arquivos, 10 s cache |
| v4-lado | above message box (Ctrl+;) | side question: separate forked query, not saved, no tools | api.chatLado |

## States / scenes (#cena=)
v4, v4modo, v4ctx, v4lado, v4diff, v4trab: checked in program (empacotar → conferir, 100%).
v4term: NOT in program — Terminal tab opens the conversation's real terminal (Ctrl+`), not a panel shell. Accepted difference.
v4split (2 conversations side by side): stage 2, not in program yet.
Keys: Ctrl+Shift+M mode · Ctrl+Shift+D Mudanças · Ctrl+O Resumido/Detalhado · Ctrl+; side question · Enter in side question asks · Esc closes pop/side/comment.
