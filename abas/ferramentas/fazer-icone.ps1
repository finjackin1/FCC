# Gera abas\icone.ico: o ✻ terracota (#c96442) do protótipo, em 16/24/32/48/64/256 px (PNG dentro do .ico).
Add-Type -AssemblyName System.Drawing
$saida = Join-Path (Split-Path -Parent $PSScriptRoot) 'icone.ico'
$tamanhos = 16, 24, 32, 48, 64, 256
$pngs = foreach ($t in $tamanhos) {
  $bmp = New-Object Drawing.Bitmap $t, $t; $g = [Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'; $g.TextRenderingHint = 'AntiAliasGridFit'; $g.Clear([Drawing.Color]::Transparent)
  $f = New-Object Drawing.Font 'Segoe UI Symbol', ($t * 1.18), ([Drawing.FontStyle]::Bold), ([Drawing.GraphicsUnit]::Pixel)
  $sf = New-Object Drawing.StringFormat; $sf.Alignment = 'Center'; $sf.LineAlignment = 'Center'
  $g.DrawString([string][char]0x273B, $f, (New-Object Drawing.SolidBrush ([Drawing.Color]::FromArgb(201, 100, 66))), (New-Object Drawing.RectangleF (-$t * 0.25), (-$t * 0.27), ($t * 1.5), ($t * 1.5)), $sf)
  $ms = New-Object IO.MemoryStream; $bmp.Save($ms, [Drawing.Imaging.ImageFormat]::Png); $g.Dispose(); $bmp.Dispose(); , $ms.ToArray()
}
$fs = [IO.File]::Create($saida); $w = New-Object IO.BinaryWriter $fs
$w.Write([uint16]0); $w.Write([uint16]1); $w.Write([uint16]$tamanhos.Count)
$off = 6 + 16 * $tamanhos.Count
for ($i = 0; $i -lt $tamanhos.Count; $i++) {
  $t = $tamanhos[$i]; $b = if ($t -ge 256) { 0 } else { $t }
  $w.Write([byte]$b); $w.Write([byte]$b); $w.Write([byte]0); $w.Write([byte]0); $w.Write([uint16]1); $w.Write([uint16]32)
  $w.Write([uint32]$pngs[$i].Length); $w.Write([uint32]$off); $off += $pngs[$i].Length
}
foreach ($p in $pngs) { $w.Write($p) }
$w.Close(); "ícone: $saida"


