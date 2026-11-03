// Account/profile split. Claude Code keeps login and data in one config folder, so CLAUDE_CONFIG_DIR = conta\config and its data
// folders are junctions into perfil\claude. Login never lands in perfil\: sending the profile never sends the account.
// Never delete recursively through a junction (it erases the original): always unlink the junction itself.
'use strict';
const fs = require('fs');
const path = require('path');
const C = require('./caminhos');

const JUNCOES = ['projects', 'skills', 'agents', 'plugins', 'commands', 'hooks', 'output-styles', 'file-history', 'todos', 'plans', 'shell-snapshots', 'session-env', 'tasks'];
const SO_CONTA = ['.credentials.json', '.claude.json'];   // may never live in perfil\

const mesmo = (a, b) => path.resolve(a).replace(/[\\/]+$/, '').toLowerCase() === path.resolve(b).replace(/[\\/]+$/, '').toLowerCase();
const lst = (f) => { try { return fs.lstatSync(f); } catch { return null; } };

function livre(destino) {   // name that doesn't exist yet: keeps both files on a collision
  if (!lst(destino)) return destino;
  const { dir, name, ext } = path.parse(destino);
  for (let i = 1; ; i++) { const n = path.join(dir, `${name}.conflito-${i}${ext}`); if (!lst(n)) return n; }
}

// Moves the contents of a REAL folder into destino, never overwriting, and removes it only when empty.
function juntar(origem, destino) {
  fs.mkdirSync(destino, { recursive: true });
  for (const n of fs.readdirSync(origem)) {
    const de = path.join(origem, n), para = path.join(destino, n), ld = lst(de), lp = lst(para);
    if (ld.isDirectory() && !ld.isSymbolicLink() && lp && lp.isDirectory() && !lp.isSymbolicLink()) juntar(de, para);
    else fs.renameSync(de, livre(para));
  }
  fs.rmdirSync(origem);
}

function garantirJuncao(link, alvo) {
  fs.mkdirSync(alvo, { recursive: true });
  const l = lst(link);
  if (l && l.isSymbolicLink()) {
    let certo = false; try { certo = mesmo(fs.readlinkSync(link), alvo); } catch { }
    if (certo) return;
    fs.unlinkSync(link);                 // wrong or broken target: removes the link only
  } else if (l && l.isDirectory()) juntar(link, alvo);
  else if (l) fs.renameSync(link, path.join(alvo, path.basename(link) + '.arquivo'));   // a file where a folder belongs: keep it
  fs.symlinkSync(alvo, link, 'junction');
}

// Anything from the login that ended up in perfil\claude goes back to conta\config.
function limparPerfil() {
  for (const n of SO_CONTA) {
    const f = path.join(C.perfilClaude(), n);
    if (lst(f)) fs.renameSync(f, livre(path.join(C.configClaude(), n)));
  }
}

// Relative import: survives moving FCC and needs no escaping for spaces or accents in the install path.
function garantirClaudeMd() {
  const importa = '@' + path.relative(C.configClaude(), path.join(C.perfilClaude(), 'CLAUDE.md')).replace(/\\/g, '/') + '\n';
  const f = path.join(C.configClaude(), 'CLAUDE.md');
  let atual = null; try { atual = fs.readFileSync(f, 'utf8'); } catch { }
  if (atual === importa) return;
  if (atual !== null && atual.trim()) {  // Claude wrote there: move the text into the profile's file
    const p = path.join(C.perfilClaude(), 'CLAUDE.md');
    fs.appendFileSync(p, (lst(p) ? '\n' : '') + atual);
  }
  fs.writeFileSync(f, importa, 'utf8');
}

function garantirPerfilJson() {
  const f = C.perfilJson();
  if (!lst(f)) fs.writeFileSync(f, JSON.stringify({ versao: 1, origem: C.raiz() }, null, 2), 'utf8');
}

function prepararConfig() {
  for (const d of [C.configClaude(), C.contas(), C.perfilClaude(), C.dados(), C.temp()]) fs.mkdirSync(d, { recursive: true });
  for (const n of JUNCOES) garantirJuncao(path.join(C.configClaude(), n), path.join(C.perfilClaude(), n));
  limparPerfil();
  garantirClaudeMd();
  garantirPerfilJson();
  const settings = path.join(C.perfilClaude(), 'settings.json');
  const tem = !!lst(settings);
  return { env: { CLAUDE_CONFIG_DIR: C.configClaude() }, settingsArg: tem ? ['--settings', settings] : [], settings: tem ? settings : null };
}

module.exports = { prepararConfig, garantirJuncao, juntar, JUNCOES, SO_CONTA };
