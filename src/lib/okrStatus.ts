/**
 * KR cancelado (19/11/2026): em vez de excluir, o KR fica com status
 * 'Cancelado' + data/autor/motivo. Continua visivel como registro, mas sai
 * dos indicadores (Dashboard Gerencial) e das Ações por Data.
 */
export const krCancelado = (kr: { status?: string | null; cancelado_em?: string | null }) =>
  !!kr.cancelado_em || (kr.status || '').trim().toLowerCase() === 'cancelado';
