
-- Create documento_pastas table
CREATE TABLE public.documento_pastas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nome text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.documento_pastas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view documento_pastas" ON public.documento_pastas
  FOR SELECT TO public USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert documento_pastas" ON public.documento_pastas
  FOR INSERT TO public WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update documento_pastas" ON public.documento_pastas
  FOR UPDATE TO public USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can delete documento_pastas" ON public.documento_pastas
  FOR DELETE TO public USING (auth.uid() = user_id);

-- Alter documentos table
ALTER TABLE public.documentos
  ADD COLUMN pasta_id uuid REFERENCES public.documento_pastas(id) ON DELETE SET NULL,
  ADD COLUMN categoria text NOT NULL DEFAULT 'link',
  ADD COLUMN arquivo_url text,
  ADD COLUMN arquivo_nome text;

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('documentos', 'documentos', true);

-- Storage RLS policies
CREATE POLICY "Authenticated users can upload documentos" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documentos');

CREATE POLICY "Anyone can view documentos files" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'documentos');

CREATE POLICY "Authenticated users can delete documentos files" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'documentos');
