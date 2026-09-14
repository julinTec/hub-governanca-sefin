# SEFIN Hub

PROMPT MESTRE — HUB DE GOVERNANÇA SEFIN

Crie um aplicativo web corporativo chamado Hub de Governança SEFIN, voltado para a coordenação de governança institucional de um órgão público.

O app deve ter:

🎯 Estrutura Geral

Após login, o usuário deve visualizar uma tela inicial (Dashboard Home) com 10 ícones grandes em formato de cards, organizados em grid, cada um levando a um módulo diferente:

🎯 OKRs

🧩 Processos

📑 Contratos

📊 Indicadores

📆 Agenda

👥 Pessoas

🤝 Consultoria

📝 Reuniões

📂 Documentos

🧠 Decisões

O layout deve ser limpo, institucional, profissional, com aparência de sistema corporativo.

🔹 MÓDULOS
🎯 Módulo OKRs

Campos:

Objetivo

Ciclo (2026.1, 2026.2 etc)

Responsável

Status

Observações

Subtabela de KRs com:

KR

Meta

Valor atual

Percentual automático

Responsável

Status automático (verde, amarelo, vermelho)

Funções:

Histórico por ciclo

Campo de observação da reunião

Geração automática de resumo com IA

🧩 Módulo Processos

Campos:

Nome do processo

Área

Dono do processo

Status

Última revisão

Próxima revisão

Link do fluxograma

Observações

Campo: “Impactado pela consultoria? (Sim/Não)”

📑 Módulo Contratos

Campos:

Número do contrato

Objeto

Empresa

Fiscal

Status

Último atesto

Próximo atesto

Observações

Botão:

“Gerar texto para SEGOV/CONJUR” com IA

📊 Módulo Indicadores

Campos:

Nome do indicador

Tipo (estratégico, operacional)

Fonte

Responsável

Última atualização

Status

Observações

📆 Módulo Agenda

Campos:

Tipo (semanal, mensal, semestral, anual)

Atividade

Data

Responsável

Status

Observações

👥 Módulo Pessoas

Campos:

Nome

Cargo

Área

Última validação de ponto

Status do plano de trabalho

Observações

🤝 Módulo Consultoria

Campos:

Fluxo em análise

Documentos enviados

Pendências

Próxima reunião

Observações estratégicas

📝 Módulo Reuniões

Campos:

Data

Tema

Participantes

Decisões

Responsáveis

Prazo

Status

Função:

Geração automática de ata com IA

📂 Módulo Documentos

Campos:

Nome do documento

Tipo

Área relacionada

Link

Observações

🧠 Módulo Decisões

Campos:

Data

Tema

Decisão

Justificativa

Responsável

Impacto

Status

🤖 FUNÇÕES DE IA

O sistema deve possuir botões de IA para:

Gerar atas de reunião

Resumir status de OKRs

Gerar relatórios semestrais de governança

Gerar textos para PAC, GAM, BRISK e SGR

🎨 VISUAL

Estilo institucional

Layout limpo

Tipografia profissional

Ícones claros

Navegação intuitiva

🔐 PERFIL

Permitir futuramente diferenciar acesso por perfil.

🎯 OBJETIVO DO APP

O app deve funcionar como:

Sistema central de governança, organização, memória institucional e apoio à tomada de decisão da SEFIN.

🏁 RESULTADO ESPERADO

O app deve ser totalmente funcional, organizado, navegável, e pronto para uso real no ambiente de governança pública.

🚀 FINAL DO PROMPT

Gere toda a estrutura do aplicativo conforme descrito acima, já com todas as telas, campos e navegação prontos para uso.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://hub-governanca-sefin.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/19032ea2-8324-4901-9501-4c85c15620cc).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
