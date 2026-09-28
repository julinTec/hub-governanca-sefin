export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agenda: {
        Row: {
          atividade: string
          created_at: string
          data: string | null
          id: string
          observacoes: string | null
          responsavel: string | null
          status: string | null
          tipo: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          atividade: string
          created_at?: string
          data?: string | null
          id?: string
          observacoes?: string | null
          responsavel?: string | null
          status?: string | null
          tipo?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          atividade?: string
          created_at?: string
          data?: string | null
          id?: string
          observacoes?: string | null
          responsavel?: string | null
          status?: string | null
          tipo?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      consultoria: {
        Row: {
          created_at: string
          documentos_enviados: string | null
          fluxo_analise: string
          id: string
          observacoes_estrategicas: string | null
          pendencias: string | null
          proxima_reuniao: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          documentos_enviados?: string | null
          fluxo_analise: string
          id?: string
          observacoes_estrategicas?: string | null
          pendencias?: string | null
          proxima_reuniao?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          documentos_enviados?: string | null
          fluxo_analise?: string
          id?: string
          observacoes_estrategicas?: string | null
          pendencias?: string | null
          proxima_reuniao?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contratos: {
        Row: {
          created_at: string
          empresa: string | null
          fiscal: string | null
          id: string
          numero_contrato: string
          objeto: string | null
          observacoes: string | null
          proximo_atesto: string | null
          status: string | null
          ultimo_atesto: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          empresa?: string | null
          fiscal?: string | null
          id?: string
          numero_contrato: string
          objeto?: string | null
          observacoes?: string | null
          proximo_atesto?: string | null
          status?: string | null
          ultimo_atesto?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          empresa?: string | null
          fiscal?: string | null
          id?: string
          numero_contrato?: string
          objeto?: string | null
          observacoes?: string | null
          proximo_atesto?: string | null
          status?: string | null
          ultimo_atesto?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      decisoes: {
        Row: {
          created_at: string
          data: string | null
          decisao: string | null
          id: string
          impacto: string | null
          justificativa: string | null
          responsavel: string | null
          status: string | null
          tema: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: string | null
          decisao?: string | null
          id?: string
          impacto?: string | null
          justificativa?: string | null
          responsavel?: string | null
          status?: string | null
          tema: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: string | null
          decisao?: string | null
          id?: string
          impacto?: string | null
          justificativa?: string | null
          responsavel?: string | null
          status?: string | null
          tema?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      documento_pastas: {
        Row: {
          created_at: string
          id: string
          nome: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          user_id?: string
        }
        Relationships: []
      }
      documentos: {
        Row: {
          area_relacionada: string | null
          arquivo_nome: string | null
          arquivo_url: string | null
          categoria: string
          created_at: string
          id: string
          link: string | null
          nome: string
          observacoes: string | null
          pasta_id: string | null
          tipo: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          area_relacionada?: string | null
          arquivo_nome?: string | null
          arquivo_url?: string | null
          categoria?: string
          created_at?: string
          id?: string
          link?: string | null
          nome: string
          observacoes?: string | null
          pasta_id?: string | null
          tipo?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          area_relacionada?: string | null
          arquivo_nome?: string | null
          arquivo_url?: string | null
          categoria?: string
          created_at?: string
          id?: string
          link?: string | null
          nome?: string
          observacoes?: string | null
          pasta_id?: string | null
          tipo?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentos_pasta_id_fkey"
            columns: ["pasta_id"]
            isOneToOne: false
            referencedRelation: "documento_pastas"
            referencedColumns: ["id"]
          },
        ]
      }
      indicadores: {
        Row: {
          created_at: string
          fonte: string | null
          id: string
          nome: string
          observacoes: string | null
          responsavel: string | null
          status: string | null
          tipo: string | null
          ultima_atualizacao: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          fonte?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          responsavel?: string | null
          status?: string | null
          tipo?: string | null
          ultima_atualizacao?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          fonte?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          responsavel?: string | null
          status?: string | null
          tipo?: string | null
          ultima_atualizacao?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      module_visibility: {
        Row: {
          module_path: string
          updated_at: string
          visible: boolean
        }
        Insert: {
          module_path: string
          updated_at?: string
          visible?: boolean
        }
        Update: {
          module_path?: string
          updated_at?: string
          visible?: boolean
        }
        Relationships: []
      }
      okr_acoes: {
        Row: {
          acao: string
          created_at: string
          id: string
          key_result_id: string
          numero: number | null
          prazo: string | null
          responsavel: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          acao: string
          created_at?: string
          id?: string
          key_result_id: string
          numero?: number | null
          prazo?: string | null
          responsavel?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          acao?: string
          created_at?: string
          id?: string
          key_result_id?: string
          numero?: number | null
          prazo?: string | null
          responsavel?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "okr_acoes_key_result_id_fkey"
            columns: ["key_result_id"]
            isOneToOne: false
            referencedRelation: "okr_key_results"
            referencedColumns: ["id"]
          },
        ]
      }
      okr_key_results: {
        Row: {
          baseline: string | null
          codigo: string | null
          created_at: string
          datas_revisao: string | null
          entregas_esperadas: string | null
          equipe: string | null
          fonte_dados: string | null
          id: string
          kr: string
          lider: string | null
          meta: number | null
          objetivo_id: string
          percentual: number | null
          periodicidade: string | null
          responsavel: string | null
          status: string | null
          tipo: string | null
          valor_atual: number | null
        }
        Insert: {
          baseline?: string | null
          codigo?: string | null
          created_at?: string
          datas_revisao?: string | null
          entregas_esperadas?: string | null
          equipe?: string | null
          fonte_dados?: string | null
          id?: string
          kr: string
          lider?: string | null
          meta?: number | null
          objetivo_id: string
          percentual?: number | null
          periodicidade?: string | null
          responsavel?: string | null
          status?: string | null
          tipo?: string | null
          valor_atual?: number | null
        }
        Update: {
          baseline?: string | null
          codigo?: string | null
          created_at?: string
          datas_revisao?: string | null
          entregas_esperadas?: string | null
          equipe?: string | null
          fonte_dados?: string | null
          id?: string
          kr?: string
          lider?: string | null
          meta?: number | null
          objetivo_id?: string
          percentual?: number | null
          periodicidade?: string | null
          responsavel?: string | null
          status?: string | null
          tipo?: string | null
          valor_atual?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "okr_key_results_objetivo_id_fkey"
            columns: ["objetivo_id"]
            isOneToOne: false
            referencedRelation: "okr_objetivos"
            referencedColumns: ["id"]
          },
        ]
      }
      okr_objetivos: {
        Row: {
          ciclo: string
          created_at: string
          id: string
          objetivo: string
          observacao_reuniao: string | null
          observacoes: string | null
          responsavel: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ciclo: string
          created_at?: string
          id?: string
          objetivo: string
          observacao_reuniao?: string | null
          observacoes?: string | null
          responsavel?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ciclo?: string
          created_at?: string
          id?: string
          objetivo?: string
          observacao_reuniao?: string | null
          observacoes?: string | null
          responsavel?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pessoas: {
        Row: {
          area: string | null
          cargo: string | null
          created_at: string
          id: string
          nome: string
          observacoes: string | null
          status_plano_trabalho: string | null
          ultima_validacao_ponto: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          area?: string | null
          cargo?: string | null
          created_at?: string
          id?: string
          nome: string
          observacoes?: string | null
          status_plano_trabalho?: string | null
          ultima_validacao_ponto?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          area?: string | null
          cargo?: string | null
          created_at?: string
          id?: string
          nome?: string
          observacoes?: string | null
          status_plano_trabalho?: string | null
          ultima_validacao_ponto?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      previsao_execucoes: {
        Row: {
          alvo: string
          concluido_em: string | null
          created_at: string
          erro: string | null
          github_run_id: string | null
          horizonte_meses: number
          id: string
          mape: number | null
          meses_teste: number
          previsao: Json | null
          real_periodo_teste: Json | null
          solicitado_por: string
          status: string
          variaveis_exogenas: string[]
        }
        Insert: {
          alvo: string
          concluido_em?: string | null
          created_at?: string
          erro?: string | null
          github_run_id?: string | null
          horizonte_meses?: number
          id?: string
          mape?: number | null
          meses_teste?: number
          previsao?: Json | null
          real_periodo_teste?: Json | null
          solicitado_por: string
          status?: string
          variaveis_exogenas?: string[]
        }
        Update: {
          alvo?: string
          concluido_em?: string | null
          created_at?: string
          erro?: string | null
          github_run_id?: string | null
          horizonte_meses?: number
          id?: string
          mape?: number | null
          meses_teste?: number
          previsao?: Json | null
          real_periodo_teste?: Json | null
          solicitado_por?: string
          status?: string
          variaveis_exogenas?: string[]
        }
        Relationships: []
      }
      previsao_serie_historica: {
        Row: {
          arrecadado: number | null
          casos_baixados: number | null
          casos_julgados: number | null
          casos_novos: number | null
          created_at: string
          criado_por: string | null
          data: string
          desembargadores: number | null
          desemprego: number | null
          disponibilidade_fermoju: number | null
          fonte: string
          ibcr_ce: number | null
          id: string
          igpm: number | null
          imoveis_registros: number | null
          inpc: number | null
          ipca: number | null
          magistrados: number | null
          observacoes: string | null
          pib: number | null
          precatorio: number | null
          qtde_atos: number | null
          saldos: number | null
          selic: number | null
          servidores: number | null
          terceirizados: number | null
          tipo_extra_judicial: number | null
          tipo_judicial: number | null
          tipo_rendimento: number | null
          updated_at: string
          valor_documento_atos: number | null
          valor_emolumento_atos: number | null
          valor_fermoju_atos: number | null
          valor_selo_atos: number | null
        }
        Insert: {
          arrecadado?: number | null
          casos_baixados?: number | null
          casos_julgados?: number | null
          casos_novos?: number | null
          created_at?: string
          criado_por?: string | null
          data: string
          desembargadores?: number | null
          desemprego?: number | null
          disponibilidade_fermoju?: number | null
          fonte?: string
          ibcr_ce?: number | null
          id?: string
          igpm?: number | null
          imoveis_registros?: number | null
          inpc?: number | null
          ipca?: number | null
          magistrados?: number | null
          observacoes?: string | null
          pib?: number | null
          precatorio?: number | null
          qtde_atos?: number | null
          saldos?: number | null
          selic?: number | null
          servidores?: number | null
          terceirizados?: number | null
          tipo_extra_judicial?: number | null
          tipo_judicial?: number | null
          tipo_rendimento?: number | null
          updated_at?: string
          valor_documento_atos?: number | null
          valor_emolumento_atos?: number | null
          valor_fermoju_atos?: number | null
          valor_selo_atos?: number | null
        }
        Update: {
          arrecadado?: number | null
          casos_baixados?: number | null
          casos_julgados?: number | null
          casos_novos?: number | null
          created_at?: string
          criado_por?: string | null
          data?: string
          desembargadores?: number | null
          desemprego?: number | null
          disponibilidade_fermoju?: number | null
          fonte?: string
          ibcr_ce?: number | null
          id?: string
          igpm?: number | null
          imoveis_registros?: number | null
          inpc?: number | null
          ipca?: number | null
          magistrados?: number | null
          observacoes?: string | null
          pib?: number | null
          precatorio?: number | null
          qtde_atos?: number | null
          saldos?: number | null
          selic?: number | null
          servidores?: number | null
          terceirizados?: number | null
          tipo_extra_judicial?: number | null
          tipo_judicial?: number | null
          tipo_rendimento?: number | null
          updated_at?: string
          valor_documento_atos?: number | null
          valor_emolumento_atos?: number | null
          valor_fermoju_atos?: number | null
          valor_selo_atos?: number | null
        }
        Relationships: []
      }
      previsao_variaveis_futuras: {
        Row: {
          created_at: string
          criado_por: string | null
          data: string
          id: string
          observacoes: string | null
          origem: string
          valor: number
          variavel: string
        }
        Insert: {
          created_at?: string
          criado_por?: string | null
          data: string
          id?: string
          observacoes?: string | null
          origem?: string
          valor: number
          variavel: string
        }
        Update: {
          created_at?: string
          criado_por?: string | null
          data?: string
          id?: string
          observacoes?: string | null
          origem?: string
          valor?: number
          variavel?: string
        }
        Relationships: []
      }
      processos: {
        Row: {
          area: string | null
          created_at: string
          dono_processo: string | null
          id: string
          impactado_consultoria: boolean | null
          link_fluxograma: string | null
          nome: string
          observacoes: string | null
          proxima_revisao: string | null
          status: string | null
          ultima_revisao: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          area?: string | null
          created_at?: string
          dono_processo?: string | null
          id?: string
          impactado_consultoria?: boolean | null
          link_fluxograma?: string | null
          nome: string
          observacoes?: string | null
          proxima_revisao?: string | null
          status?: string | null
          ultima_revisao?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          area?: string | null
          created_at?: string
          dono_processo?: string | null
          id?: string
          impactado_consultoria?: boolean | null
          link_fluxograma?: string | null
          nome?: string
          observacoes?: string | null
          proxima_revisao?: string | null
          status?: string | null
          ultima_revisao?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          area: string | null
          cargo: string | null
          created_at: string
          id: string
          nome: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          area?: string | null
          cargo?: string | null
          created_at?: string
          id?: string
          nome?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          area?: string | null
          cargo?: string | null
          created_at?: string
          id?: string
          nome?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reunioes: {
        Row: {
          ata_gerada: string | null
          created_at: string
          data: string | null
          decisoes: string | null
          id: string
          participantes: string | null
          prazo: string | null
          responsaveis: string | null
          status: string | null
          tema: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ata_gerada?: string | null
          created_at?: string
          data?: string | null
          decisoes?: string | null
          id?: string
          participantes?: string | null
          prazo?: string | null
          responsaveis?: string | null
          status?: string | null
          tema: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ata_gerada?: string | null
          created_at?: string
          data?: string | null
          decisoes?: string | null
          id?: string
          participantes?: string | null
          prazo?: string | null
          responsaveis?: string | null
          status?: string | null
          tema?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      status_report_capacity: {
        Row: {
          capacity_points: number
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          period_end: string
          period_start: string
          updated_at: string
        }
        Insert: {
          capacity_points: number
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          period_end: string
          period_start: string
          updated_at?: string
        }
        Update: {
          capacity_points?: number
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          period_end?: string
          period_start?: string
          updated_at?: string
        }
        Relationships: []
      }
      status_report_epics: {
        Row: {
          component: string | null
          created_at: string
          external_id: string
          first_seen_at: string
          first_seen_import_id: string | null
          id: string
          key: string | null
          last_seen_at: string
          last_seen_import_id: string | null
          modulo: string | null
          numero_os: number | null
          raw_data: Json
          source: string
          status: string | null
          titulo: string | null
          updated_at: string
        }
        Insert: {
          component?: string | null
          created_at?: string
          external_id: string
          first_seen_at?: string
          first_seen_import_id?: string | null
          id?: string
          key?: string | null
          last_seen_at?: string
          last_seen_import_id?: string | null
          modulo?: string | null
          numero_os?: number | null
          raw_data?: Json
          source: string
          status?: string | null
          titulo?: string | null
          updated_at?: string
        }
        Update: {
          component?: string | null
          created_at?: string
          external_id?: string
          first_seen_at?: string
          first_seen_import_id?: string | null
          id?: string
          key?: string | null
          last_seen_at?: string
          last_seen_import_id?: string | null
          modulo?: string | null
          numero_os?: number | null
          raw_data?: Json
          source?: string
          status?: string | null
          titulo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "status_report_epics_first_seen_import_id_fkey"
            columns: ["first_seen_import_id"]
            isOneToOne: false
            referencedRelation: "status_report_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "status_report_epics_last_seen_import_id_fkey"
            columns: ["last_seen_import_id"]
            isOneToOne: false
            referencedRelation: "status_report_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      status_report_import_logs: {
        Row: {
          created_at: string
          details: Json
          id: string
          import_id: string | null
          level: string
          message: string
          stage: string
        }
        Insert: {
          created_at?: string
          details?: Json
          id?: string
          import_id?: string | null
          level?: string
          message: string
          stage: string
        }
        Update: {
          created_at?: string
          details?: Json
          id?: string
          import_id?: string | null
          level?: string
          message?: string
          stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "status_report_import_logs_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "status_report_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      status_report_imports: {
        Row: {
          changed_ros: number
          created_at: string
          duration_ms: number | null
          file_hash: string
          file_size: number | null
          filename: string
          id: string
          imported_at: string
          imported_by: string | null
          imported_by_email: string | null
          metadata: Json
          missing_ros: number
          new_ros: number
          previous_import_id: string | null
          project_key: string | null
          returned_ros: number
          source_generated_at: string | null
          status: string
          total_epics: number
          total_oss: number
          total_ros: number
          unchanged_ros: number
          updated_at: string
        }
        Insert: {
          changed_ros?: number
          created_at?: string
          duration_ms?: number | null
          file_hash: string
          file_size?: number | null
          filename: string
          id?: string
          imported_at?: string
          imported_by?: string | null
          imported_by_email?: string | null
          metadata?: Json
          missing_ros?: number
          new_ros?: number
          previous_import_id?: string | null
          project_key?: string | null
          returned_ros?: number
          source_generated_at?: string | null
          status?: string
          total_epics?: number
          total_oss?: number
          total_ros?: number
          unchanged_ros?: number
          updated_at?: string
        }
        Update: {
          changed_ros?: number
          created_at?: string
          duration_ms?: number | null
          file_hash?: string
          file_size?: number | null
          filename?: string
          id?: string
          imported_at?: string
          imported_by?: string | null
          imported_by_email?: string | null
          metadata?: Json
          missing_ros?: number
          new_ros?: number
          previous_import_id?: string | null
          project_key?: string | null
          returned_ros?: number
          source_generated_at?: string | null
          status?: string
          total_epics?: number
          total_oss?: number
          total_ros?: number
          unchanged_ros?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "status_report_imports_previous_import_id_fkey"
            columns: ["previous_import_id"]
            isOneToOne: false
            referencedRelation: "status_report_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      status_report_os_snapshots: {
        Row: {
          data_homologacao: string | null
          data_prevista_homologacao: string | null
          id: string
          import_id: string
          os_id: string
          quantidade_esforco: number | null
          quantidade_executada: number | null
          raw_data: Json
          responsavel: string | null
          snapshot_at: string
          status_atual: string | null
          status_canonico: string | null
          status_ordem: number | null
        }
        Insert: {
          data_homologacao?: string | null
          data_prevista_homologacao?: string | null
          id?: string
          import_id: string
          os_id: string
          quantidade_esforco?: number | null
          quantidade_executada?: number | null
          raw_data?: Json
          responsavel?: string | null
          snapshot_at?: string
          status_atual?: string | null
          status_canonico?: string | null
          status_ordem?: number | null
        }
        Update: {
          data_homologacao?: string | null
          data_prevista_homologacao?: string | null
          id?: string
          import_id?: string
          os_id?: string
          quantidade_esforco?: number | null
          quantidade_executada?: number | null
          raw_data?: Json
          responsavel?: string | null
          snapshot_at?: string
          status_atual?: string | null
          status_canonico?: string | null
          status_ordem?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "status_report_os_snapshots_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "status_report_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "status_report_os_snapshots_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "status_report_oss"
            referencedColumns: ["id"]
          },
        ]
      }
      status_report_oss: {
        Row: {
          created_at: string
          data_homologacao: string | null
          data_prevista_homologacao: string | null
          external_id: string
          first_seen_at: string
          first_seen_import_id: string | null
          id: string
          is_present_current_import: boolean
          last_seen_at: string
          last_seen_import_id: string | null
          numero: number | null
          quantidade_esforco: number | null
          quantidade_esforco_fmt: string | null
          quantidade_executada: number | null
          quantidade_executada_fmt: string | null
          raw_data: Json
          responsavel: string | null
          solicitante: string | null
          status_atual: string | null
          status_canonico: string | null
          status_contratada: string | null
          status_desconhecido: boolean
          status_id: string | null
          status_ordem: number | null
          subprojeto: string | null
          sydle_url: string | null
          tipo_os: string | null
          titulo: string | null
          updated_at: string
          valor_esforco_fmt: string | null
          valor_executado_fmt: string | null
        }
        Insert: {
          created_at?: string
          data_homologacao?: string | null
          data_prevista_homologacao?: string | null
          external_id: string
          first_seen_at?: string
          first_seen_import_id?: string | null
          id?: string
          is_present_current_import?: boolean
          last_seen_at?: string
          last_seen_import_id?: string | null
          numero?: number | null
          quantidade_esforco?: number | null
          quantidade_esforco_fmt?: string | null
          quantidade_executada?: number | null
          quantidade_executada_fmt?: string | null
          raw_data?: Json
          responsavel?: string | null
          solicitante?: string | null
          status_atual?: string | null
          status_canonico?: string | null
          status_contratada?: string | null
          status_desconhecido?: boolean
          status_id?: string | null
          status_ordem?: number | null
          subprojeto?: string | null
          sydle_url?: string | null
          tipo_os?: string | null
          titulo?: string | null
          updated_at?: string
          valor_esforco_fmt?: string | null
          valor_executado_fmt?: string | null
        }
        Update: {
          created_at?: string
          data_homologacao?: string | null
          data_prevista_homologacao?: string | null
          external_id?: string
          first_seen_at?: string
          first_seen_import_id?: string | null
          id?: string
          is_present_current_import?: boolean
          last_seen_at?: string
          last_seen_import_id?: string | null
          numero?: number | null
          quantidade_esforco?: number | null
          quantidade_esforco_fmt?: string | null
          quantidade_executada?: number | null
          quantidade_executada_fmt?: string | null
          raw_data?: Json
          responsavel?: string | null
          solicitante?: string | null
          status_atual?: string | null
          status_canonico?: string | null
          status_contratada?: string | null
          status_desconhecido?: boolean
          status_id?: string | null
          status_ordem?: number | null
          subprojeto?: string | null
          sydle_url?: string | null
          tipo_os?: string | null
          titulo?: string | null
          updated_at?: string
          valor_esforco_fmt?: string | null
          valor_executado_fmt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "status_report_oss_first_seen_import_id_fkey"
            columns: ["first_seen_import_id"]
            isOneToOne: false
            referencedRelation: "status_report_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "status_report_oss_last_seen_import_id_fkey"
            columns: ["last_seen_import_id"]
            isOneToOne: false
            referencedRelation: "status_report_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      status_report_ro_changes: {
        Row: {
          change_type: string
          created_at: string
          field_name: string | null
          id: string
          import_id: string
          new_value: string | null
          old_value: string | null
          previous_import_id: string | null
          ro_id: string
        }
        Insert: {
          change_type: string
          created_at?: string
          field_name?: string | null
          id?: string
          import_id: string
          new_value?: string | null
          old_value?: string | null
          previous_import_id?: string | null
          ro_id: string
        }
        Update: {
          change_type?: string
          created_at?: string
          field_name?: string | null
          id?: string
          import_id?: string
          new_value?: string | null
          old_value?: string | null
          previous_import_id?: string | null
          ro_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "status_report_ro_changes_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "status_report_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "status_report_ro_changes_previous_import_id_fkey"
            columns: ["previous_import_id"]
            isOneToOne: false
            referencedRelation: "status_report_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "status_report_ro_changes_ro_id_fkey"
            columns: ["ro_id"]
            isOneToOne: false
            referencedRelation: "status_report_ros"
            referencedColumns: ["id"]
          },
        ]
      }
      status_report_ro_snapshots: {
        Row: {
          epic_id: string | null
          epico_nome: string | null
          esforco: number | null
          grau: number | null
          id: string
          impacto: string | null
          import_id: string
          is_present: boolean
          previsao_atendimento: string | null
          prioridade: string | null
          prioridade_nota: number | null
          prioritario: boolean | null
          raw_data: Json
          ro_id: string
          snapshot_at: string
          status: string | null
          status_key: string | null
          status_ordem: number | null
          tempo_estimado_horas: number | null
          tipo: string | null
          tipo_validacao: string | null
          urgencia: string | null
        }
        Insert: {
          epic_id?: string | null
          epico_nome?: string | null
          esforco?: number | null
          grau?: number | null
          id?: string
          impacto?: string | null
          import_id: string
          is_present?: boolean
          previsao_atendimento?: string | null
          prioridade?: string | null
          prioridade_nota?: number | null
          prioritario?: boolean | null
          raw_data?: Json
          ro_id: string
          snapshot_at?: string
          status?: string | null
          status_key?: string | null
          status_ordem?: number | null
          tempo_estimado_horas?: number | null
          tipo?: string | null
          tipo_validacao?: string | null
          urgencia?: string | null
        }
        Update: {
          epic_id?: string | null
          epico_nome?: string | null
          esforco?: number | null
          grau?: number | null
          id?: string
          impacto?: string | null
          import_id?: string
          is_present?: boolean
          previsao_atendimento?: string | null
          prioridade?: string | null
          prioridade_nota?: number | null
          prioritario?: boolean | null
          raw_data?: Json
          ro_id?: string
          snapshot_at?: string
          status?: string | null
          status_key?: string | null
          status_ordem?: number | null
          tempo_estimado_horas?: number | null
          tipo?: string | null
          tipo_validacao?: string | null
          urgencia?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "status_report_ro_snapshots_epic_id_fkey"
            columns: ["epic_id"]
            isOneToOne: false
            referencedRelation: "status_report_epics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "status_report_ro_snapshots_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "status_report_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "status_report_ro_snapshots_ro_id_fkey"
            columns: ["ro_id"]
            isOneToOne: false
            referencedRelation: "status_report_ros"
            referencedColumns: ["id"]
          },
        ]
      }
      status_report_ros: {
        Row: {
          created_at: string
          epic_external_id: string | null
          epic_id: string | null
          epico_nome: string | null
          esforco: number | null
          external_id: string
          first_seen_at: string
          first_seen_import_id: string | null
          grau: number | null
          id: string
          impacto: string | null
          impacto_nivel: number | null
          is_present_current_import: boolean
          last_seen_at: string
          last_seen_import_id: string | null
          numero: number | null
          previsao_atendimento: string | null
          prioridade: string | null
          prioridade_nota: number | null
          prioritario: boolean
          raw_data: Json
          solicitante: string | null
          status: string | null
          status_key: string | null
          status_ordem: number | null
          subprojeto: string | null
          sydle_id: string | null
          sydle_url: string | null
          tempo_estimado_horas: number | null
          tipo: string | null
          tipo_key: string | null
          tipo_validacao: string | null
          titulo: string | null
          updated_at: string
          urgencia: string | null
          urgencia_nivel: number | null
        }
        Insert: {
          created_at?: string
          epic_external_id?: string | null
          epic_id?: string | null
          epico_nome?: string | null
          esforco?: number | null
          external_id: string
          first_seen_at?: string
          first_seen_import_id?: string | null
          grau?: number | null
          id?: string
          impacto?: string | null
          impacto_nivel?: number | null
          is_present_current_import?: boolean
          last_seen_at?: string
          last_seen_import_id?: string | null
          numero?: number | null
          previsao_atendimento?: string | null
          prioridade?: string | null
          prioridade_nota?: number | null
          prioritario?: boolean
          raw_data?: Json
          solicitante?: string | null
          status?: string | null
          status_key?: string | null
          status_ordem?: number | null
          subprojeto?: string | null
          sydle_id?: string | null
          sydle_url?: string | null
          tempo_estimado_horas?: number | null
          tipo?: string | null
          tipo_key?: string | null
          tipo_validacao?: string | null
          titulo?: string | null
          updated_at?: string
          urgencia?: string | null
          urgencia_nivel?: number | null
        }
        Update: {
          created_at?: string
          epic_external_id?: string | null
          epic_id?: string | null
          epico_nome?: string | null
          esforco?: number | null
          external_id?: string
          first_seen_at?: string
          first_seen_import_id?: string | null
          grau?: number | null
          id?: string
          impacto?: string | null
          impacto_nivel?: number | null
          is_present_current_import?: boolean
          last_seen_at?: string
          last_seen_import_id?: string | null
          numero?: number | null
          previsao_atendimento?: string | null
          prioridade?: string | null
          prioridade_nota?: number | null
          prioritario?: boolean
          raw_data?: Json
          solicitante?: string | null
          status?: string | null
          status_key?: string | null
          status_ordem?: number | null
          subprojeto?: string | null
          sydle_id?: string | null
          sydle_url?: string | null
          tempo_estimado_horas?: number | null
          tipo?: string | null
          tipo_key?: string | null
          tipo_validacao?: string | null
          titulo?: string | null
          updated_at?: string
          urgencia?: string | null
          urgencia_nivel?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "status_report_ros_epic_id_fkey"
            columns: ["epic_id"]
            isOneToOne: false
            referencedRelation: "status_report_epics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "status_report_ros_first_seen_import_id_fkey"
            columns: ["first_seen_import_id"]
            isOneToOne: false
            referencedRelation: "status_report_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "status_report_ros_last_seen_import_id_fkey"
            columns: ["last_seen_import_id"]
            isOneToOne: false
            referencedRelation: "status_report_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
