// Every path FCC reads or writes comes from here. Nothing else may use os.homedir(), os.tmpdir(), LOCALAPPDATA or a fixed drive
// for FCC's own data. Install root = FCC_RAIZ (tests) or the folder of FCC.exe. Layout:
//   conta\config (CLAUDE_CONFIG_DIR), conta\contas        login, never copied with the profile
//   perfil\claude, regras, casa, dados, perfil.json       everything personal except login; copy = take it along
//   projects\                                             project folders
//   ferramentas\, temp\, inventario\                      portable programs, temporary files, what was installed on this PC
'use strict';
const path = require('path');

function raiz() {
  if (process.env.FCC_RAIZ) return path.resolve(process.env.FCC_RAIZ);
  // Packaged: FCC.exe sits at the root. Running from source without FCC_RAIZ: a throwaway root beside the source, never a real one.
  if (process.versions.electron && !process.defaultApp) return path.dirname(process.execPath);
  return path.resolve(__dirname, '..', 'testes', 'raiz-dev');
}
const sob = (...p) => path.join(raiz(), ...p);

const perfil = () => sob('perfil');
const conta = () => sob('conta');
const configClaude = () => sob('conta', 'config');
const contas = () => sob('conta', 'contas');
const perfilClaude = () => sob('perfil', 'claude');
const regras = () => sob('perfil', 'regras');
const casa = () => sob('perfil', 'casa');
const dados = (nome) => (nome ? sob('perfil', 'dados', nome) : sob('perfil', 'dados'));
const perfilJson = () => sob('perfil', 'perfil.json');
const projetos = () => sob('projects');
const ferramentas = (...p) => sob('ferramentas', ...p);
const temp = (...p) => sob('temp', ...p);
const inventario = (...p) => sob('inventario', ...p);

// Same rule Claude Code uses for the folder name under projects\.
const chaveProjeto = (dir) => String(dir).replace(/[^a-zA-Z0-9]/g, '-');

module.exports = { raiz, perfil, conta, configClaude, contas, perfilClaude, regras, casa, dados, perfilJson, projetos, ferramentas, temp, inventario, chaveProjeto };
