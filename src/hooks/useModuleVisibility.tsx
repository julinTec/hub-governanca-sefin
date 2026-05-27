import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type VisibilityMap = Record<string, boolean>;

export function useModuleVisibility() {
  const [visibility, setVisibility] = useState<VisibilityMap>({});
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    const { data } = await supabase.from('module_visibility').select('module_path, visible');
    const map: VisibilityMap = {};
    (data || []).forEach((r: any) => { map[r.module_path] = r.visible; });
    setVisibility(map);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    const channel = supabase
      .channel('module_visibility_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'module_visibility' }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const isVisible = (path: string) => visibility[path] !== false;

  const setModuleVisible = async (path: string, visible: boolean) => {
    setVisibility((prev) => ({ ...prev, [path]: visible }));
    await supabase.from('module_visibility').upsert({ module_path: path, visible, updated_at: new Date().toISOString() });
  };

  return { visibility, loading, isVisible, setModuleVisible, refresh: fetchAll };
}
