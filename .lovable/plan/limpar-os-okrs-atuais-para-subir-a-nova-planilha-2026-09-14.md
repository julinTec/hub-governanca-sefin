# Limpar os OKRs atuais para subir a nova planilha

## Situação atual

Hoje o sistema tem 6 objetivos, 16 key results e 78 ações cadastradas. A nova planilha (Ficha_KRs_2026.2-SEFIN) traz 13 fichas de KR (KR 1.1 a KR 6.1), além das abas Calendário, Ficha do KR e Planilha1, que são ignoradas na importação.

## O que será feito

1. Antes de apagar, gerar um arquivo Excel de backup com todos os OKRs atuais (mesmo formato da planilha), para você guardar.
2. Apagar todas as ações, todos os key results e todos os objetivos do sistema, deixando o módulo de OKRs vazio.
3. Você então usa o botão "Importar Planilha" na página de OKRs e sobe a nova planilha; como o sistema estará vazio, não haverá duplicidade.

## Detalhes técnicos

- Backup: reaproveitar `exportOkrWorkbook` (`src/lib/okrExport.ts`) — exportar antes da limpeza usando o botão "Exportar Planilha" já existente na página de OKRs.
- Limpeza via `run_sql`, na ordem `okr_acoes` → `okr_key_results` → `okr_objetivos` (a exclusão exige confirmação sua no momento da execução).
- Nenhuma mudança de esquema; nenhuma alteração no código de importação é necessária (as abas com espaço no nome, como "KR 3.1 ", já são tratadas).
