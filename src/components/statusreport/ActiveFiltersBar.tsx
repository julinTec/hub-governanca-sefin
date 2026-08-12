import { Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface FilterChip {
  id: string;
  group: string;
  value: string;
  onRemove: () => void;
}

export default function ActiveFiltersBar({
  chips,
  onClearAll,
  summary,
}: {
  chips: FilterChip[];
  onClearAll: () => void;
  summary?: string;
}) {
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/25 bg-primary/[0.04] px-3 py-2">
      <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
        <Filter className="h-3.5 w-3.5" /> Filtros ativos
      </span>
      {chips.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={c.onRemove}
          aria-label={`Remover filtro ${c.group}: ${c.value}`}
          className="group inline-flex max-w-[280px] items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-xs transition-colors hover:border-destructive/50 hover:text-destructive"
        >
          <span className="text-muted-foreground">{c.group}:</span>
          <span className="truncate font-medium">{c.value}</span>
          <X className="h-3 w-3 shrink-0 opacity-50 group-hover:opacity-100" />
        </button>
      ))}
      {summary && <span className="text-xs text-muted-foreground">· {summary}</span>}
      <Button variant="ghost" size="sm" className="ml-auto h-7 text-xs" onClick={onClearAll}>
        Limpar todos
      </Button>
    </div>
  );
}
