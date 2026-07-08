import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

const BI_URL =
  'https://app.powerbi.com/view?r=eyJrIjoiYTBjOGJjZWQtMjkzNi00OTQxLTkwMDUtMjBlODQzYTMyZjg0IiwidCI6IjA4ZmIyNmFjLWJkMWQtNGQyMC1iMzIwLWE4NmEwYTM1Y2UzMCJ9';

export default function OKRPainelBI({ open, onClose }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <div className="flex items-center justify-between px-4 h-14 border-b border-border">
        <h2 className="font-semibold text-foreground">Painel BI — OKRs</h2>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar">
          <X className="h-5 w-5" />
        </Button>
      </div>
      <iframe
        title="Painel BI"
        src={BI_URL}
        className="flex-1 w-full border-0"
        allowFullScreen
      />
    </div>
  );
}
