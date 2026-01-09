import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalized = status?.toLowerCase() || '';
  
  const getStatusClass = () => {
    if (['verde', 'ativo', 'concluído', 'concluido', 'implementada', 'em dia'].includes(normalized)) {
      return 'status-verde';
    }
    if (['amarelo', 'em andamento', 'pendente', 'em análise', 'em analise'].includes(normalized)) {
      return 'status-amarelo';
    }
    if (['vermelho', 'atrasado', 'crítico', 'critico', 'inativo', 'cancelado'].includes(normalized)) {
      return 'status-vermelho';
    }
    return 'bg-muted text-muted-foreground';
  };

  return (
    <span className={cn('status-badge', getStatusClass(), className)}>
      {status}
    </span>
  );
}
