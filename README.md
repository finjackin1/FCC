# FCC

FCC é um programa para Windows que organiza projetos e conversas do Claude Code numa janela só. Cada pasta com um `CLAUDE.md` vira um projeto na lista da esquerda; cada conversa abre numa aba com o Claude Code rodando num terminal de verdade.

O que ele faz:

- lista os projetos e mostra, de cada um, onde o trabalho parou e o que falta testar;
- abre várias conversas do Claude Code em abas e lembra delas quando você fecha e abre de novo;
- mostra quanto da sessão e da semana da sua conta já foi usado e quando o limite volta;
- tem um chat livre, fora de qualquer projeto;
- pode usar uma IA local (Ollama) no lugar do Claude, se você quiser;
- guarda regras, skills e memórias numa pasta `perfil` ao lado do programa. Copiou a pasta, levou tudo junto para outro PC.

## Baixar e usar

1. Baixe o `.zip` mais recente na página **Releases** deste repositório.
2. Extraia numa pasta sua, por exemplo `D:\FCC`. Não precisa instalar nem ser administrador.
3. Abra `FCC.exe`.

Na primeira vez o programa pede o login na sua conta do Claude. Se o Claude Code ainda não estiver no PC, ele oferece instalar usando o instalador oficial da Anthropic.

Tudo que o FCC grava fica dentro da pasta onde ele está:

| Pasta | O que tem |
| --- | --- |
| `conta` | login da conta. Não vai junto quando você copia o perfil. |
| `perfil` | regras, skills, memórias e configurações. |
| `projects` | as pastas dos projetos. |
| `ferramentas`, `temp`, `inventario` | programas portáteis, arquivos temporários e a lista do que foi instalado neste PC. |

Algumas coisas não cabem dentro da pasta, como um programa que o Claude instalou no Windows a seu pedido. O FCC anota cada uma delas na janela **Pasta do FCC**, com o botão para desinstalar.

## Atualização

Uns segundos depois de abrir, o FCC confere se saiu versão nova aqui no GitHub. Se saiu, ele baixa, confere o arquivo e troca o programa na próxima vez que você fechar. As pastas `conta`, `perfil`, `projects` e `ferramentas` ficam como estão. Dá para desligar isso nas configurações.

## Remover

Na janela **Pasta do FCC** há a opção de remover o programa. Antes de apagar, o FCC fecha as conversas abertas e oferece salvar uma cópia do perfil. A pasta vai para a Lixeira, junto com os atalhos e o início automático. O que foi instalado no Windows continua lá e aparece numa lista, para você decidir o que fazer com cada item.

## Requisitos

- Windows 10 ou 11, 64 bits.
- Uma conta do Claude com acesso ao Claude Code.
- Internet para conversar com o Claude. A IA local (opcional) funciona sem internet depois de baixado o modelo.

## Licença

O código do FCC está sob a GNU GPL versão 3. O texto completo está em [LICENSE](LICENSE).

O pacote do programa traz componentes de terceiros, listados em [THIRD-PARTY-NOTICES.txt](THIRD-PARTY-NOTICES.txt). Um deles, a biblioteca Claude Agent SDK, é da Anthropic e não é software livre: o uso dela segue os termos da Anthropic, não a GPL. Para o FCC poder ser distribuído junto com essa biblioteca, a licença ganhou uma permissão extra (seção 7 da GPLv3), escrita em [LICENSE-EXCEPTION.txt](LICENSE-EXCEPTION.txt).

## Compilando do código-fonte

Precisa de Windows 10 ou 11 (64 bits), [Node.js](https://nodejs.org/) e Git.

```
git clone <endereço deste repositório>
cd <pasta do repositório>\abas
npm ci
node ferramentas\empacotar.js
```

O programa pronto sai em `dist\FCC`. O `empacotar.js` também roda o autoteste do `.exe` novo e compara cada tela com o protótipo em `docs\prototipos\v2\ESCOLHIDA`; se alguma tela sair diferente, ele avisa.

## Aviso

FCC é um projeto pessoal e não tem ligação com a Anthropic. Claude e Claude Code são marcas da Anthropic.
