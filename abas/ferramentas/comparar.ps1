# Compara as capturas do programa com as do protótipo escolhido, pixel a pixel.
# Uso: powershell -File ferramentas\comparar.ps1 -App <pasta do autoteste> -Proto <pasta das capturas do protótipo> [-Saida <pasta>]
# Para cada cena: % de pixels diferentes (tolerância -Tol por canal, padrão 0) e uma imagem "dif-<cena>.png" (protótipo apagado + diferenças em vermelho).
param([Parameter(Mandatory)][string]$App, [Parameter(Mandatory)][string]$Proto, [string]$Saida = $App, [int]$Tol = 0)   # 25/10: tolerância 0 (era 24): mesmo motor, pixel igual
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System; using System.Drawing; using System.Drawing.Imaging; using System.Runtime.InteropServices;
public static class Dif {
  public static long Px; public static int Tol;
  public static double Comparar(string a, string b, string saida) {
    using (var A = new Bitmap(a)) using (var B = new Bitmap(b)) {
      int w = Math.Min(A.Width, B.Width), h = Math.Min(A.Height, B.Height); var D = new Bitmap(w, h);
      var r = new Rectangle(0, 0, w, h);
      var da = A.LockBits(r, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb); var db = B.LockBits(r, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb); var dd = D.LockBits(r, ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
      int n = da.Stride * h; var pa = new byte[n]; var pb = new byte[n]; var pd = new byte[n];
      Marshal.Copy(da.Scan0, pa, 0, n); Marshal.Copy(db.Scan0, pb, 0, n); long dif = 0;
      for (int y = 0; y < h; y++) for (int x = 0; x < w; x++) { int i = y * da.Stride + x * 4;
        bool d = Math.Abs(pa[i] - pb[i]) > Tol || Math.Abs(pa[i + 1] - pb[i + 1]) > Tol || Math.Abs(pa[i + 2] - pb[i + 2]) > Tol;
        if (d) { dif++; pd[i] = 0; pd[i + 1] = 0; pd[i + 2] = 255; } else { byte g = (byte)(200 + (pb[i] + pb[i + 1] + pb[i + 2]) / 3 * 55 / 255); pd[i] = g; pd[i + 1] = g; pd[i + 2] = g; }
        pd[i + 3] = 255; }
      Marshal.Copy(pd, 0, dd.Scan0, n); A.UnlockBits(da); B.UnlockBits(db); D.UnlockBits(dd); D.Save(saida, ImageFormat.Png); D.Dispose();
      Px = dif; return 100.0 * dif / (w * (double)h);
    }
  }
}
'@
[Dif]::Tol = $Tol
New-Item -ItemType Directory -Force $Saida | Out-Null
foreach ($f in Get-ChildItem $App -Filter *.png | Where-Object { $_.Name -notlike 'dif-*' }) {
  $p = Join-Path $Proto $f.Name
  if (-not (Test-Path $p)) { "{0,-14} sem captura do protótipo" -f $f.BaseName; continue }
  $pct = [Dif]::Comparar($f.FullName, $p, (Join-Path $Saida "dif-$($f.Name)"))
  "{0,-14} {1,6:N4}% diferente {2} px" -f $f.BaseName, $pct, [Dif]::Px
}
