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
    PostgrestVersion: "14.1"
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
      documentos: {
        Row: {
          area_relacionada: string | null
          created_at: string
          id: string
          link: string | null
          nome: string
          observacoes: string | null
          tipo: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          area_relacionada?: string | null
          created_at?: string
          id?: string
          link?: string | null
          nome: string
          observacoes?: string | null
          tipo?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          area_relacionada?: string | null
          created_at?: string
          id?: string
          link?: string | null
          nome?: string
          observacoes?: string | null
          tipo?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
