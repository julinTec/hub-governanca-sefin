import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Sparkles } from 'lucide-react';

interface ModuleHeaderProps {
  title: string;
  description: string;
  onAdd?: () => void;
  addLabel?: string;
  onAI?: () => void;
  aiLabel?: string;
  aiLoading?: boolean;
  children?: ReactNode;
}

export default function ModuleHeader({
  title,
  description,
  onAdd,
  addLabel = 'Adicionar',
  onAI,
  aiLabel,
  aiLoading,
  children,
}: ModuleHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {children}
        {onAI && aiLabel && (
          <Button onClick={onAI} variant="outline" disabled={aiLoading}>
            <Sparkles className="h-4 w-4 mr-2" />
            {aiLabel}
          </Button>
        )}
        {onAdd && (
          <Button onClick={onAdd}>
            <Plus className="h-4 w-4 mr-2" />
            {addLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
