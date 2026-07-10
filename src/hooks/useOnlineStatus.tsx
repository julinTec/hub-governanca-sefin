import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Monitors browser connectivity + Supabase reachability.
 * Returns: 'online' | 'offline' | 'backend-unreachable'
 */
export type ConnectionStatus = 'online' | 'offline' | 'backend-unreachable';

export function useOnlineStatus(): ConnectionStatus {
  const [status, setStatus] = useState<ConnectionStatus>(
    typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'online',
  );

  useEffect(() => {
    const handleOnline = () => setStatus('online');
    const handleOffline = () => setStatus('offline');
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic lightweight ping to the backend
    let cancelled = false;
    const check = async () => {
      if (!navigator.onLine) {
        if (!cancelled) setStatus('offline');
        return;
      }
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 8000);
        // Cheap read against a table that always exists
        const { error } = await supabase
          .from('module_visibility')
          .select('module_key', { head: true, count: 'exact' })
          .limit(1)
          .abortSignal(ctrl.signal);
        clearTimeout(timer);
        if (cancelled) return;
        if (error && /fetch|network|abort|timeout/i.test(error.message)) {
          setStatus('backend-unreachable');
        } else {
          setStatus('online');
        }
      } catch {
        if (!cancelled) setStatus('backend-unreachable');
      }
    };

    check();
    const interval = setInterval(check, 45000);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return status;
}
