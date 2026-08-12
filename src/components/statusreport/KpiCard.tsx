import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface KpiCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  /** Texto auxiliar sempre visível (universo, contexto, etc.) */
  sub?: ReactNode;
  delta?: number | null;
  /** true = aumentar é positivo */
  higherIsBetter?: boolean;
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'primary';
  icon?: ReactNode;
  /** Torna o card um filtro clicável */
  onClick?: () => void;
  active?: boolean;
  className?: string;
}

const toneRing: Record<string, string> = {
  default: 'border-border',
  primary: 'border-primary/25',
  success: 'border-[hsl(var(--status-success))]/25',
  warning: 'border-[hsl(var(--status-warning))]/35',
  danger: 'border-destructive/25',
};

const toneText: Record<string, string> = {
  default: 'text-foreground',
  primary: 'text-primary',
  success: 'text-[hsl(var(--status-success))]',
  warning: 'text-[hsl(var(--status-warning))]',
  danger: 'text-destructive',
};

const toneBar: Record<string, string> = {
  default: 'bg-muted-foreground/40',
  primary: 'bg-primary',
  success: 'bg-[hsl(var(--status-success))]',
  warning: 'bg-[hsl(var(--status-warning))]',
  danger: 'bg-destructive',
};

export default function KpiCard({
  label,
  value,
  hint,
  sub,
  delta,
  higherIsBetter = true,
  tone = 'default',
  icon,
  onClick,
  active = false,
  className,
}: KpiCardProps) {
  const hasDelta = delta !== null && delta !== undefined && Number.isFinite(delta);
  const positive =
    hasDelta && ((delta as number) > 0 ? higherIsBetter : (delta as number) < 0 ? !higherIsBetter : true);
  const clickable = !!onClick;

  const body = (
    <Card
      className={cn(
        'relative overflow-hidden border transition-all duration-150',
        toneRing[tone],
        clickable && 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md hover:border-primary/50',
        active && 'ring-2 ring-primary/60 border-primary/60 bg-primary/[0.04] shadow-sm',
        className,
      )}
    >
      <span className={cn('absolute inset-x-0 top-0 h-[3px]', active ? 'bg-primary' : toneBar[tone], !active && tone === 'default' && 'opacity-40')} />
      <CardContent className="p-3 pt-3.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground leading-tight">
            {label}
          </p>
          {icon && <span className={cn('shrink-0', active ? 'text-primary' : 'text-muted-foreground')}>{icon}</span>}
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className={cn('text-2xl font-semibold tabular-nums leading-none', toneText[tone])}>{value}</span>
          {hasDelta && (delta as number) !== 0 && (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 text-xs font-medium',
                positive ? 'text-[hsl(var(--status-success))]' : 'text-destructive',
              )}
            >
              {(delta as number) > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
              {Math.abs(delta as number)}
            </span>
          )}
          {hasDelta && (delta as number) === 0 && (
            <span className="inline-flex items-center text-xs text-muted-foreground">
              <Minus className="h-3 w-3" />
            </span>
          )}
        </div>
        {sub && <p className="mt-1 text-[10.5px] leading-tight text-muted-foreground">{sub}</p>}
        {active && (
          <span className="mt-1.5 inline-block rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
            Filtro ativo
          </span>
        )}
      </CardContent>
    </Card>
  );

  const shell = clickable ? (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={`${label}: ${typeof value === 'number' || typeof value === 'string' ? value : ''}`}
      className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
    >
      {body}
    </button>
  ) : (
    body
  );

  if (!hint) return shell;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div>{shell}</div>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-xs leading-snug">{hint}</TooltipContent>
    </Tooltip>
  );
}
