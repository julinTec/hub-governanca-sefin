-- ============ IMPORTS ============
CREATE TABLE public.status_report_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text NOT NULL,
  file_hash text NOT NULL,
  file_size integer,
  imported_at timestamptz NOT NULL DEFAULT now(),
  imported_by uuid,
  imported_by_email text,
  source_generated_at timestamptz,
  project_key text,
  total_ros integer NOT NULL DEFAULT 0,
  total_oss integer NOT NULL DEFAULT 0,
  total_epics integer NOT NULL DEFAULT 0,
  new_ros integer NOT NULL DEFAULT 0,
  changed_ros integer NOT NULL DEFAULT 0,
  unchanged_ros integer NOT NULL DEFAULT 0,
  missing_ros integer NOT NULL DEFAULT 0,
  returned_ros integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'processing',
  duration_ms integer,
  previous_import_id uuid REFERENCES public.status_report_imports(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX status_report_imports_hash_uniq ON public.status_report_imports(file_hash) WHERE status <> 'failed';
CREATE INDEX status_report_imports_imported_at_idx ON public.status_report_imports(imported_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.status_report_imports TO authenticated;
GRANT ALL ON public.status_report_imports TO service_role;
ALTER TABLE public.status_report_imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sr_imports_select" ON public.status_report_imports FOR SELECT TO authenticated USING (true);
CREATE POLICY "sr_imports_insert" ON public.status_report_imports FOR INSERT TO authenticated WITH CHECK (imported_by = auth.uid());
CREATE POLICY "sr_imports_update" ON public.status_report_imports FOR UPDATE TO authenticated USING (imported_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "sr_imports_delete" ON public.status_report_imports FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============ EPICS ============
CREATE TABLE public.status_report_epics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  external_id text NOT NULL,
  key text,
  titulo text,
  modulo text,
  component text,
  status text,
  numero_os integer,
  raw_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  first_seen_import_id uuid REFERENCES public.status_report_imports(id) ON DELETE SET NULL,
  last_seen_import_id uuid REFERENCES public.status_report_imports(id) ON DELETE SET NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX status_report_epics_uniq ON public.status_report_epics(source, external_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.status_report_epics TO authenticated;
GRANT ALL ON public.status_report_epics TO service_role;
ALTER TABLE public.status_report_epics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sr_epics_select" ON public.status_report_epics FOR SELECT TO authenticated USING (true);
CREATE POLICY "sr_epics_write" ON public.status_report_epics FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "sr_epics_update" ON public.status_report_epics FOR UPDATE TO authenticated USING (true);
CREATE POLICY "sr_epics_delete" ON public.status_report_epics FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============ OSS ============
CREATE TABLE public.status_report_oss (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text NOT NULL,
  numero integer,
  titulo text,
  tipo_os text,
  subprojeto text,
  solicitante text,
  responsavel text,
  status_atual text,
  status_canonico text,
  status_id text,
  status_ordem integer,
  status_contratada text,
  status_desconhecido boolean NOT NULL DEFAULT false,
  quantidade_esforco numeric,
  quantidade_esforco_fmt text,
  valor_esforco_fmt text,
  quantidade_executada numeric,
  quantidade_executada_fmt text,
  valor_executado_fmt text,
  data_prevista_homologacao date,
  data_homologacao date,
  sydle_url text,
  raw_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  first_seen_import_id uuid REFERENCES public.status_report_imports(id) ON DELETE SET NULL,
  last_seen_import_id uuid REFERENCES public.status_report_imports(id) ON DELETE SET NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  is_present_current_import boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX status_report_oss_uniq ON public.status_report_oss(external_id);
CREATE INDEX status_report_oss_numero_idx ON public.status_report_oss(numero);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.status_report_oss TO authenticated;
GRANT ALL ON public.status_report_oss TO service_role;
ALTER TABLE public.status_report_oss ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sr_oss_select" ON public.status_report_oss FOR SELECT TO authenticated USING (true);
CREATE POLICY "sr_oss_insert" ON public.status_report_oss FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "sr_oss_update" ON public.status_report_oss FOR UPDATE TO authenticated USING (true);
CREATE POLICY "sr_oss_delete" ON public.status_report_oss FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============ OS SNAPSHOTS ============
CREATE TABLE public.status_report_os_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id uuid NOT NULL REFERENCES public.status_report_oss(id) ON DELETE CASCADE,
  import_id uuid NOT NULL REFERENCES public.status_report_imports(id) ON DELETE CASCADE,
  status_atual text,
  status_canonico text,
  status_ordem integer,
  responsavel text,
  quantidade_esforco numeric,
  quantidade_executada numeric,
  data_prevista_homologacao date,
  data_homologacao date,
  raw_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  snapshot_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX status_report_os_snapshots_uniq ON public.status_report_os_snapshots(os_id, import_id);
CREATE INDEX status_report_os_snapshots_import_idx ON public.status_report_os_snapshots(import_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.status_report_os_snapshots TO authenticated;
GRANT ALL ON public.status_report_os_snapshots TO service_role;
ALTER TABLE public.status_report_os_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sr_os_snap_select" ON public.status_report_os_snapshots FOR SELECT TO authenticated USING (true);
CREATE POLICY "sr_os_snap_insert" ON public.status_report_os_snapshots FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "sr_os_snap_delete" ON public.status_report_os_snapshots FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============ ROS ============
CREATE TABLE public.status_report_ros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text NOT NULL,
  sydle_id text,
  numero integer,
  titulo text,
  solicitante text,
  subprojeto text,
  epic_id uuid REFERENCES public.status_report_epics(id) ON DELETE SET NULL,
  epic_external_id text,
  epico_nome text,
  status text,
  status_key text,
  status_ordem integer,
  tipo text,
  tipo_key text,
  tipo_validacao text,
  prioridade text,
  prioridade_nota numeric,
  prioritario boolean NOT NULL DEFAULT false,
  urgencia text,
  urgencia_nivel integer,
  impacto text,
  impacto_nivel integer,
  grau numeric,
  esforco numeric,
  tempo_estimado_horas numeric,
  previsao_atendimento date,
  sydle_url text,
  raw_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  first_seen_import_id uuid REFERENCES public.status_report_imports(id) ON DELETE SET NULL,
  last_seen_import_id uuid REFERENCES public.status_report_imports(id) ON DELETE SET NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  is_present_current_import boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX status_report_ros_uniq ON public.status_report_ros(external_id);
CREATE INDEX status_report_ros_status_key_idx ON public.status_report_ros(status_key);
CREATE INDEX status_report_ros_epic_idx ON public.status_report_ros(epic_id);
CREATE INDEX status_report_ros_numero_idx ON public.status_report_ros(numero);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.status_report_ros TO authenticated;
GRANT ALL ON public.status_report_ros TO service_role;
ALTER TABLE public.status_report_ros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sr_ros_select" ON public.status_report_ros FOR SELECT TO authenticated USING (true);
CREATE POLICY "sr_ros_insert" ON public.status_report_ros FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "sr_ros_update" ON public.status_report_ros FOR UPDATE TO authenticated USING (true);
CREATE POLICY "sr_ros_delete" ON public.status_report_ros FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============ RO SNAPSHOTS ============
CREATE TABLE public.status_report_ro_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ro_id uuid NOT NULL REFERENCES public.status_report_ros(id) ON DELETE CASCADE,
  import_id uuid NOT NULL REFERENCES public.status_report_imports(id) ON DELETE CASCADE,
  status text,
  status_key text,
  status_ordem integer,
  prioridade text,
  prioridade_nota numeric,
  prioritario boolean,
  urgencia text,
  impacto text,
  grau numeric,
  esforco numeric,
  tempo_estimado_horas numeric,
  previsao_atendimento date,
  epic_id uuid REFERENCES public.status_report_epics(id) ON DELETE SET NULL,
  epico_nome text,
  tipo text,
  tipo_validacao text,
  is_present boolean NOT NULL DEFAULT true,
  raw_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  snapshot_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX status_report_ro_snapshots_uniq ON public.status_report_ro_snapshots(ro_id, import_id);
CREATE INDEX status_report_ro_snapshots_import_idx ON public.status_report_ro_snapshots(import_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.status_report_ro_snapshots TO authenticated;
GRANT ALL ON public.status_report_ro_snapshots TO service_role;
ALTER TABLE public.status_report_ro_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sr_ro_snap_select" ON public.status_report_ro_snapshots FOR SELECT TO authenticated USING (true);
CREATE POLICY "sr_ro_snap_insert" ON public.status_report_ro_snapshots FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "sr_ro_snap_delete" ON public.status_report_ro_snapshots FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============ RO CHANGES ============
CREATE TABLE public.status_report_ro_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ro_id uuid NOT NULL REFERENCES public.status_report_ros(id) ON DELETE CASCADE,
  import_id uuid NOT NULL REFERENCES public.status_report_imports(id) ON DELETE CASCADE,
  previous_import_id uuid REFERENCES public.status_report_imports(id) ON DELETE SET NULL,
  field_name text,
  old_value text,
  new_value text,
  change_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX status_report_ro_changes_import_idx ON public.status_report_ro_changes(import_id);
CREATE INDEX status_report_ro_changes_ro_idx ON public.status_report_ro_changes(ro_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.status_report_ro_changes TO authenticated;
GRANT ALL ON public.status_report_ro_changes TO service_role;
ALTER TABLE public.status_report_ro_changes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sr_ro_changes_select" ON public.status_report_ro_changes FOR SELECT TO authenticated USING (true);
CREATE POLICY "sr_ro_changes_insert" ON public.status_report_ro_changes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "sr_ro_changes_delete" ON public.status_report_ro_changes FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============ IMPORT LOGS ============
CREATE TABLE public.status_report_import_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id uuid REFERENCES public.status_report_imports(id) ON DELETE CASCADE,
  level text NOT NULL DEFAULT 'info',
  stage text NOT NULL,
  message text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX status_report_import_logs_import_idx ON public.status_report_import_logs(import_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.status_report_import_logs TO authenticated;
GRANT ALL ON public.status_report_import_logs TO service_role;
ALTER TABLE public.status_report_import_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sr_logs_select" ON public.status_report_import_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "sr_logs_insert" ON public.status_report_import_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "sr_logs_delete" ON public.status_report_import_logs FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============ CAPACITY (parâmetro configurável) ============
CREATE TABLE public.status_report_capacity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start date NOT NULL,
  period_end date NOT NULL,
  capacity_points numeric NOT NULL,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX status_report_capacity_period_idx ON public.status_report_capacity(period_start DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.status_report_capacity TO authenticated;
GRANT ALL ON public.status_report_capacity TO service_role;
ALTER TABLE public.status_report_capacity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sr_capacity_select" ON public.status_report_capacity FOR SELECT TO authenticated USING (true);
CREATE POLICY "sr_capacity_admin_insert" ON public.status_report_capacity FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "sr_capacity_admin_update" ON public.status_report_capacity FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "sr_capacity_admin_delete" ON public.status_report_capacity FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- updated_at triggers
CREATE TRIGGER update_sr_imports_updated_at BEFORE UPDATE ON public.status_report_imports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sr_epics_updated_at BEFORE UPDATE ON public.status_report_epics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sr_oss_updated_at BEFORE UPDATE ON public.status_report_oss FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sr_ros_updated_at BEFORE UPDATE ON public.status_report_ros FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sr_capacity_updated_at BEFORE UPDATE ON public.status_report_capacity FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();