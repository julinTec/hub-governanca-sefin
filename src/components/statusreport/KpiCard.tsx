import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface KpiCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  delta?: number | null;
  /** true = aumentar é positivo */
  higherIsBetter?: boolean;
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'primary';
  icon?: ReactNode;
  className?: string;
}

const toneRing: Record<string, string> = {
  default: 'border-border',
  primary: 'border-primary/30',
  success: 'border-[hsl(var(--status-success))]/30',
  warning: 'border-[hsl(var(--status-warning))]/40',
  danger: 'border-destructive/30',
};

const toneText: Record<string, string> = {
  default: 'text-foreground',
  primary: 'text-primary',
  success: 'text-[hsl(var(--status-success))]',
  warning: 'text-[hsl(var(--status-warning))]',
  danger: 'text-destructive',
};

export default function KpiCard({
  label,
  value,
  hint,
  delta,
  higherIsBetter = true,
  tone = 'default',
  icon,
  className,
}: KpiCardProps) {
  const hasDelta = delta !== null && delta !== undefined && Number.isFinite(delta);
  const positive = hasDelta && ((delta as number) > 0 ? higherIsBetter : (delta as number) < 0 ? !higherIsBetter : true);

  const body = (
    <Card className={cn('border', toneRing[tone], className)}>
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground leading-tight">{label}</p>
          {icon && <span className="text-muted-foreground shrink-0">{icon}</span>}
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className={cn('text-2xl font-semibold tabular-nums', toneText[tone])}>{value}</span>
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
        {hint && <p className="mt-0.5 text-[11px] text-muted-foreground truncate">{hint}</p>}
      </CardContent>
    </Card>
  );

  if (!hint) return body;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div>{body}</div>
      </TooltipTrigger>
      <TooltipContent>{hint}</TooltipContent>
    </Tooltip>
  );
}
