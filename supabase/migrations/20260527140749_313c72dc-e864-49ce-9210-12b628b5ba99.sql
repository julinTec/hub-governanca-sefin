CREATE TABLE public.module_visibility (
  module_path TEXT PRIMARY KEY,
  visible BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT ON public.module_visibility TO authenticated;
GRANT ALL ON public.module_visibility TO service_role;
ALTER TABLE public.module_visibility ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view module_visibility" ON public.module_visibility FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert module_visibility" ON public.module_visibility FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update module_visibility" ON public.module_visibility FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete module_visibility" ON public.module_visibility FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
GRANT INSERT, UPDATE, DELETE ON public.module_visibility TO authenticated;

INSERT INTO public.module_visibility (module_path, visible) VALUES
  ('/okrs', true),
  ('/processos', true),
  ('/contratos', true),
  ('/indicadores', true),
  ('/agenda', true),
  ('/pessoas', true),
  ('/consultoria', true),
  ('/reunioes', true),
  ('/documentos', true),
  ('/decisoes', true)
ON CONFLICT (module_path) DO NOTHING;

ALTER PUBLICATION supabase_realtime ADD TABLE public.module_visibility;