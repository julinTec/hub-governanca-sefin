

# Cards Sydle / SEI — Visual aprimorado

## O que será feito
Redesenhar os cards da página Sydle / SEI para parecerem uma "mini-prévia" de cada sistema, com visual mais rico e imersivo.

## Design proposto

Cada card terá:
- **Header colorido** simulando a barra superior do sistema (gradiente azul para Sydle, verde para SEI)
- **Área de "preview"** com uma simulação minimalista da interface — ícone grande centralizado, nome do sistema em destaque, e elementos visuais decorativos (linhas, dots) que remetem a uma tela de login
- **Barra de URL falsa** no topo do card com o domínio do site (ex: `sydle.tjce.jus.br`) para dar a sensação de janela de navegador
- **Footer** com botão "Acessar" estilizado
- Efeito hover com sombra elevada e leve scale

## Mudanças
- **`src/pages/Consultoria.tsx`** — Redesenhar completamente os cards com o novo layout "browser window mockup"

