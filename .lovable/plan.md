
## Ajuste pontual — Ordenação dos KRs + novo quadro em Sydle / SEI

### O que será feito

#### 1. Corrigir a ordem de exibição dos KRs na página OKRs
Hoje os KRs são carregados por `created_at`, então podem aparecer fora da sequência visual esperada, como `KR2.2` antes de `KR2.1`.

Será ajustado em `src/pages/OKRs.tsx` para ordenar os KRs por código antes de renderizar:
- priorizar o campo `codigo`
- interpretar códigos no formato `KRx.y`
- comparar numericamente as partes do código, para garantir ordem correta:
  - `KR2.1` antes de `KR2.2`
  - `KR10.1` depois de `KR2.9`
- manter fallback seguro para KRs sem código ou com formato diferente, sem quebrar a listagem

Exemplo da lógica:
```text
KR1.1
KR1.2
KR1.10
KR2.1
KR2.2
```

#### 2. Adicionar mais um quadro na página Sydle / SEI
Em `src/pages/Consultoria.tsx`, será incluído um terceiro card seguindo exatamente o padrão visual já existente dos demais:
- título: `Ambiente de Homologação - Sydle`
- link: `https://tjce-hom.sydle.one`
- abertura em nova aba
- mesmo estilo de card com mockup de navegador
- domínio exibido na barra superior do card

Também será ajustada a grade para acomodar melhor 3 quadros, mantendo boa organização em desktop e mobile.

### Arquivos

| Arquivo | Ação |
|---------|------|
| `src/pages/OKRs.tsx` | Ordenar os KRs visualmente pelo campo `codigo`, com comparação numérica do padrão KRx.y |
| `src/pages/Consultoria.tsx` | Adicionar novo quadro “Ambiente de Homologação - Sydle” e ajustar layout da grade |

### Detalhes técnicos
- A ordenação será aplicada no frontend, sem necessidade de alteração no banco.
- O comportamento de expansão/redução dos objetivos e KRs permanecerá igual.
- O novo quadro da página Sydle / SEI seguirá o mesmo padrão visual institucional já usado no módulo.

Sem mudanças no banco de dados.
