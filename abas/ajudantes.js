// Helpers (01/11/2026, user request): orq.py workers write what they do now to casa\orquestra\vivo\*.json; here that reaches the conversation,
// and helpers die with the program. Quit walks the tree under each Claude Code process, but only console tools: a program Claude opened (FAH, game) stays open.
const fs = require('fs'), path = require('path'), cp = require('child_process');
const FERRAMENTAS = ['claude.exe', 'node.exe', 'python.exe', 'python3.exe', 'pythonw.exe', 'py.exe', 'bash.exe', 'sh.exe', 'cmd.exe', 'powershell.exe', 'pwsh.exe', 'conhost.exe', 'git.exe', 'rg.exe', 'grep.exe', 'msbuild.exe', 'dotnet.exe', 'timeout.exe', 'sleep.exe', 'ping.exe'];

function vivo(pid) { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } }

function ler(pasta, dono = process.pid) {
  let nomes = []; try { nomes = fs.readdirSync(pasta).filter(n => n.endsWith('.json')); } catch { return []; }
  const L = [];
  for (const n of nomes) {
    const f = path.join(pasta, n); let j;
    try { j = JSON.parse(fs.readFileSync(f, 'utf8')); } catch { continue; }   // mid-write: next pass reads it
    if (!j.pid || !vivo(j.pid)) { try { fs.unlinkSync(f); } catch { } continue; }   // killed without cleaning up
    if (Number(j.fcc) === dono) L.push(j);
  }
  return L;
}

// script for one quit; pure so the test can read it. Stops at any process that isn't a console tool, so its children stay too.
function scriptParar(raiz, cli, extras) {
  const nome = String(cli || 'claude.exe').replace(/[^\w.-]/g, ''), ex = (extras || []).map(Number).filter(n => n > 0).join(',');
  return `$ok=@(${FERRAMENTAS.map(x => `'${x}'`).join(',')});$todos=@(Get-CimInstance Win32_Process -Property ProcessId,ParentProcessId,Name,CommandLine);$f=@{};` +
    `foreach($p in $todos){$k=[int]$p.ParentProcessId;if(-not $f.ContainsKey($k)){$f[$k]=@()};$f[$k]+=$p};$q=New-Object Collections.Queue;` +
    `if($f.ContainsKey(${Number(raiz)})){foreach($p in $f[${Number(raiz)}]){if($p.Name -ieq '${nome}'){$q.Enqueue($p)}}};$x=@(${ex});foreach($p in $todos){if($x -contains [int]$p.ProcessId){$q.Enqueue($p)}};` +
    `$m=@{};while($q.Count){$p=$q.Dequeue();$i=[int]$p.ProcessId;if($m.ContainsKey($i) -or $i -eq $PID){continue};if($ok -notcontains $p.Name.ToLower()){continue};if($p.CommandLine -match 'atualizar\\.js'){continue};$m[$i]=1;if($f.ContainsKey($i)){foreach($c in $f[$i]){$q.Enqueue($c)}}};` +
    `foreach($i in $m.Keys){Stop-Process -Id $i -Force -ErrorAction SilentlyContinue};[Console]::Out.Write($m.Count)`;
}

module.exports = (pasta, enviar, logApp, dono = process.pid) => {
  let ult = new Map();
  return {
    ler: () => ler(pasta, dono),
    // conversation hears only when something changed; an empty list clears its line
    passo() {
      const por = new Map();
      for (const w of ler(pasta, dono)) if (w.aba) { if (!por.has(w.aba)) por.set(w.aba, []); por.get(w.aba).push({ id: w.id, ult: w.ult || '', n: w.n || 0, t: w.t || 0, outra: !!w.outra }); }
      const novo = new Map();
      for (const [aba, lista] of por) { const s = JSON.stringify(lista); novo.set(aba, s); if (ult.get(aba) !== s) enviar('chat:msg', aba, { type: 'system', subtype: 'orq_vivo', lista }); }
      for (const aba of ult.keys()) if (!novo.has(aba)) enviar('chat:msg', aba, { type: 'system', subtype: 'orq_vivo', lista: [] });
      ult = novo;
    },
    pararDaAba(aba) { for (const w of ler(pasta, dono)) if (String(w.aba) === String(aba)) cp.execFile('taskkill', ['/T', '/F', '/PID', String(w.pid)], { windowsHide: true }, () => { }); },
    // quit: synchronous, runs while the Claude Code processes still exist (their tree is found through them)
    pararTudo(cli) {
      const extras = ler(pasta, dono).map(w => w.pid), r = cp.spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', scriptParar(dono, cli, extras)], { encoding: 'utf8', windowsHide: true, timeout: 8000 });
      logApp(`ajudantes ao fechar: ${r.error ? 'falhou: ' + r.error.message : String(r.stdout || '').trim() + ' processo(s) parado(s)'}`);
    },
  };
};
module.exports.scriptParar = scriptParar;
