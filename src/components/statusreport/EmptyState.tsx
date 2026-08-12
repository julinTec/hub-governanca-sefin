import { SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function EmptyState({
  title,
  description,
  onClear,
}: {
  title: string;
  description?: string;
  onClear?: () => void;
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-2 py-14 text-center">
        <SearchX className="h-8 w-8 text-muted-foreground/60" />
        <p className="font-medium">{title}</p>
        <p className="max-w-md text-sm text-muted-foreground">
          {description ?? 'Os filtros atuais não retornaram resultados.'}
        </p>
        {onClear && (
          <Button variant="outline" size="sm" className="mt-2" onClick={onClear}>
            Limpar filtros
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
