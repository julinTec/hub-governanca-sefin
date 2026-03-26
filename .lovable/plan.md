# Página Processos — Substituir por Cards de Acesso

## O que será feito

Reescrever a página `src/pages/Processos.tsx` para remover o botão "Novo Processo", a DataTable e o FormDialog, substituindo tudo por 3 cards clicáveis no estilo da página Sydle/SEI (browser mockup):

1. **Painel Arquitetura de Processos** — abre o Power BI **internamente** via iframe (estado com toggle para expandir/fechar o iframe na própria página)
2. **Gestão de Processos** — abre **externamente** (link para PowerApps em nova aba)
3. **Arquitetura de Processos v 5.0** — abre **externamente** (link para planilha SharePoint em nova aba)

## Design dos cards

Reutilizar o padrão visual já existente em `Consultoria.tsx` (browser chrome bar com dots + gradiente + ícone + footer), com cores distintas para cada card:

- Card 1: gradiente amarelo/indigo (Power BI) - visual moderno
- Card 2: gradiente verde/teal (PowerApps) - visual moderno
- Card 3: gradiente amber/orange (SharePoint/Excel) - visual moderno

## Comportamento

- Card 1 (Painel): ao clicar, exibe um iframe fullwidth abaixo dos cards com o Power BI embed. Um botão permite fechar/abrir.
- Cards 2 e 3: `target="_blank"` — abrem em nova aba.

## Mudanças


| Arquivo                   | Ação                                                                            |
| ------------------------- | ------------------------------------------------------------------------------- |
| `src/pages/Processos.tsx` | Reescrever completamente — remover CRUD, inserir 3 cards + iframe para Power BI |


Não há mudanças no banco de dados.