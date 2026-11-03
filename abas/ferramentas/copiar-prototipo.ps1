# Leva a interface ESCOLHIDA (docs\prototipos\v2\ESCOLHIDA) para o programa SEM CONVERTER NADA (23/10/2026, pedido dele: "copiar o
# código do protótipo e só ligar as funções"). O protótipo e o programa usam o MESMO código de tela:
#   ESCOLHIDA -> abas\tela\v2\ : base.js, trilho.js, janelas.js, comum.css, conversa.css, trilho.css, janelas.css,
#                               moldura.css + moldura.js (o <style> e o último <script> de proposta.html)
#   abas\tela\chat.js -> ESCOLHIDA\chat.js : a conversa é do programa (motor rápido); o protótipo a desenha com o mesmo arquivo.
# Mudou a tela? Primeiro muda o protótipo, roda isto, e o programa já fica igual. Uso: powershell -File ferramentas\copiar-prototipo.ps1
$abas = Split-Path -Parent $PSScriptRoot
$esc = Join-Path (Split-Path -Parent $abas) 'docs\prototipos\v2\ESCOLHIDA'
$v2 = Join-Path $abas 'tela\v2'; New-Item -ItemType Directory -Force $v2 | Out-Null
$utf8 = New-Object Text.UTF8Encoding $false
foreach ($a in 'base.js', 'dados-demo.js', 'trilho.js', 'janelas.js', 'comum.css', 'conversa.css', 'trilho.css', 'janelas.css', 'loja.js', 'loja.css', 'compacto.css', 'vivo.css', 'vivo.js', 'B.css', 'B.js', 'escolha.css', 'escolha.js', 'fluxo.css', 'fluxo.js', 'painel.css', 'painel.js', 'v4.css', 'v4.js', 'mapa.js', 'mapa.css') { Copy-Item (Join-Path $esc $a) (Join-Path $v2 $a) -Force }
$p = [IO.File]::ReadAllText((Join-Path $esc 'proposta.html'))
[IO.File]::WriteAllText((Join-Path $v2 'moldura.css'), '/* GERADO de ESCOLHIDA\proposta.html (moldura A "Por cima"); não editar aqui */' + "`n" + [regex]::Match($p, '(?s)<style>(.*?)</style>').Groups[1].Value.Trim() + "`n", $utf8)
$js = [regex]::Matches($p, '(?s)<script>(.*?)</script>'); $js = $js[$js.Count - 1].Groups[1].Value.Trim()
[IO.File]::WriteAllText((Join-Path $v2 'moldura.js'), '// GERADO de ESCOLHIDA\proposta.html (moldura A "Por cima"); não editar aqui' + "`n" + $js + "`n", $utf8)
Copy-Item (Join-Path $abas 'tela\chat.js') (Join-Path $esc 'chat.js') -Force
"ok: tela\v2 atualizada a partir de ESCOLHIDA; chat.js levado para ESCOLHIDA"