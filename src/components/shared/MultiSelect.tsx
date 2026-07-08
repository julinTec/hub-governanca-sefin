import { useState } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Todos',
  searchPlaceholder = 'Buscar...',
  emptyText = 'Nenhum resultado.',
  className,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);

  const toggle = (v: string) => {
    if (value.includes(v)) onChange(value.filter(x => x !== v));
    else onChange([...value, v]);
  };

  const label =
    value.length === 0 ? placeholder
    : value.length === 1 ? (options.find(o => o.value === value[0])?.label ?? '1 selecionado')
    : `${value.length} selecionados`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={cn('w-full justify-between font-normal h-9', className)}
        >
          <span className="flex items-center gap-2 truncate">
            {value.length > 1 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{value.length}</Badge>
            )}
            <span className={cn('truncate', value.length === 0 && 'text-muted-foreground')}>{label}</span>
          </span>
          <div className="flex items-center gap-1 shrink-0">
            {value.length > 0 && (
              <X
                className="h-3.5 w-3.5 opacity-60 hover:opacity-100"
                onClick={(e) => { e.stopPropagation(); onChange([]); }}
              />
            )}
            <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} className="h-9" />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map(o => {
                const selected = value.includes(o.value);
                return (
                  <CommandItem key={o.value} value={o.label} onSelect={() => toggle(o.value)}>
                    <Check className={cn('mr-2 h-4 w-4', selected ? 'opacity-100' : 'opacity-0')} />
                    <span className="truncate">{o.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
