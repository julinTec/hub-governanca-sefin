import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { WifiOff, ServerCrash } from 'lucide-react';

export default function ConnectionBanner() {
  const status = useOnlineStatus();
  if (status === 'online') return null;

  const isOffline = status === 'offline';
  return (
    <div
      role="status"
      className={`fixed top-0 left-0 right-0 z-[100] px-4 py-2 text-sm text-center font-medium shadow-md ${
        isOffline
          ? 'bg-destructive text-destructive-foreground'
          : 'bg-amber-500 text-white'
      }`}
    >
      <div className="flex items-center justify-center gap-2">
        {isOffline ? <WifiOff className="h-4 w-4" /> : <ServerCrash className="h-4 w-4" />}
        <span>
          {isOffline
            ? 'Sem conexão com a internet. Verifique sua rede.'
            : 'Servidor inacessível. Verifique sua rede, VPN ou firewall corporativo (o domínio pode estar bloqueado).'}
        </span>
      </div>
    </div>
  );
}
