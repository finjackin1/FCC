# Conferência da aparência (regra dele, 21/10/2026): cada tela do programa tem de ser IGUAL ao PROTÓTIPO escolhido (25/10: 100%, 0 pixel diferente).
# Sempre contra o protótipo (docs\prototipos\chat\ESCOLHIDA), nunca contra uma foto antiga do programa.
# As fotos do protótipo MOSTRAM barras de rolagem (o programa também mostra): conteúdo que passa da altura aparece nos dois.
# Uso: powershell -File ferramentas\conferir.ps1 [-Exe]   (sem -Exe roda pelo código; tema claro num .ini temporário)
param([switch]$Exe, [string]$ExeArq = '')   # -ExeArq: .exe novo ainda fora de dist\ (o build testa antes de aplicar)
$abas = Split-Path -Parent $PSScriptRoot
$cct = Split-Path -Parent $abas
$w = Join-Path $cct ('temp\fcc-conferir-' + (Get-Date -Format 'HHmmss'))
$app = "$w\app"; $pr = "$w\proto"; New-Item -ItemType Directory -Force $app, $pr | Out-Null
$ini = "$w\claro.ini"; (Get-Content "$cct\fcc.ini" -Encoding UTF8 -ErrorAction SilentlyContinue) -replace '^tema=.*', 'tema=claro' | Set-Content $ini -Encoding UTF8
$env:CCT_TESTE_INI = $ini
if ($Exe -and -not $ExeArq) { $ExeArq = "$cct\dist\FCC\FCC.exe" }
if ($ExeArq) { $p = Start-Process $ExeArq -ArgumentList '--autoteste', $app -PassThru }
else { $p = Start-Process "$abas\node_modules\electron\dist\electron.exe" -ArgumentList $abas, '--autoteste', $app -PassThru }
$p | Wait-Process -Timeout 180 -ErrorAction SilentlyContinue; if (-not $p.HasExited) { Stop-Process -Id $p.Id -Force; 'O AUTOTESTE TRAVOU'; exit 1 }
Get-Content "$app\resultado.txt"
# interface 2 (23/10/2026): toda cena do programa tem a de mesmo nome no protótipo ESCOLHIDO (B Trilho + janelas A), em 1440x810
$d = (Join-Path $cct 'docs\prototipos\v2\ESCOLHIDA') -replace '\\', '/'
# 25/10: o protótipo é fotografado no MESMO Electron do programa (o Chrome suavizava bordas de outro jeito: 0,01–0,2% em toda tela)
$cenas = (Get-ChildItem $app -Filter *.png | ForEach-Object { $_.BaseName }) -join ','
& "$abas\node_modules\electron\dist\electron.exe" "$PSScriptRoot\fotografar-prototipo.js" "$d/proposta.html" $pr $cenas 2>$null | Out-Null
$linhas = & powershell -NoProfile -File "$PSScriptRoot\comparar.ps1" -App $app -Proto $pr -Saida "$w\dif"
$ruins = 0
foreach ($l in $linhas) {
  if ($l -match '^(\S+)\s+([\d,]+)% diferente (\d+) px') { $sem = 100 - [double]($matches[2] -replace ',', '.'); $px = $matches[3]; $ok = $px -eq '0'; if (-not $ok) { $ruins++ }
    '{0,-14} {1,7:N2}% igual  {2}' -f $matches[1], $sem, $(if ($ok) { 'ok' } else { "REPROVADA ($px px diferentes)" }) }
  else { $l; $ruins++ }
}
"pasta: $w"
if ($ruins) { "REPROVADO: $ruins tela(s)"; exit 1 } else { 'APROVADO: todas 100% iguais' }
