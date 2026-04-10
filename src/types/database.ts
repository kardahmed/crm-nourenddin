export type Database = {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string
          name: string
          logo_url: string | null
          phone: string | null
          email: string | null
          address: string | null
          website: string | null
          wilaya: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          logo_url?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          website?: string | null
          wilaya?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          logo_url?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          website?: string | null
          wilaya?: string | null
          created_at?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          id: string
          tenant_id: string | null
          first_name: string
          last_name: string
          email: string
          phone: string | null
          role: UserRole
          status: UserStatus
          last_activity: string | null
          created_at: string
        }
        Insert: {
          id: string
          tenant_id?: string | null
          first_name: string
          last_name: string
          email: string
          phone?: string | null
          role?: UserRole
          status?: UserStatus
          last_activity?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string | null
          first_name?: string
          last_name?: string
          email?: string
          phone?: string | null
          role?: UserRole
          status?: UserStatus
          last_activity?: string | null
          created_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          id: string
          tenant_id: string
          code: string
          name: string
          description: string | null
          location: string | null
          delivery_date: string | null
          avg_price_per_unit: number | null
          cover_url: string | null
          gallery_urls: string[] | null
          status: ProjectStatus
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          code: string
          name: string
          description?: string | null
          location?: string | null
          delivery_date?: string | null
          avg_price_per_unit?: number | null
          cover_url?: string | null
          gallery_urls?: string[] | null
          status?: ProjectStatus
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          code?: string
          name?: string
          description?: string | null
          location?: string | null
          delivery_date?: string | null
          avg_price_per_unit?: number | null
          cover_url?: string | null
          gallery_urls?: string[] | null
          status?: ProjectStatus
          created_at?: string
        }
        Relationships: []
      }
      units: {
        Row: {
          id: string
          tenant_id: string
          project_id: string
          code: string
          type: UnitType
          subtype: UnitSubtype | null
          building: string | null
          floor: number | null
          surface: number | null
          price: number | null
          delivery_date: string | null
          plan_2d_url: string | null
          status: UnitStatus
          agent_id: string | null
          client_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          project_id: string
          code: string
          type?: UnitType
          subtype?: UnitSubtype | null
          building?: string | null
          floor?: number | null
          surface?: number | null
          price?: number | null
          delivery_date?: string | null
          plan_2d_url?: string | null
          status?: UnitStatus
          agent_id?: string | null
          client_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          project_id?: string
          code?: string
          type?: UnitType
          subtype?: UnitSubtype | null
          building?: string | null
          floor?: number | null
          surface?: number | null
          price?: number | null
          delivery_date?: string | null
          plan_2d_url?: string | null
          status?: UnitStatus
          agent_id?: string | null
          client_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          id: string
          tenant_id: string
          agent_id: string | null
          full_name: string
          phone: string
          email: string | null
          nin_cin: string | null
          cin_verified: boolean
          cin_doc_url: string | null
          client_type: ClientType
          birth_date: string | null
          nationality: string
          profession: string | null
          address: string | null
          pipeline_stage: PipelineStage
          source: ClientSource
          desired_unit_types: string[] | null
          interested_projects: string[] | null
          confirmed_budget: number | null
          interest_level: InterestLevel
          visit_note: number | null
          visit_feedback: string | null
          payment_method: PaymentMethod | null
          notes: string | null
          is_priority: boolean
          last_contact_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          agent_id?: string | null
          full_name: string
          phone: string
          email?: string | null
          nin_cin?: string | null
          cin_verified?: boolean
          cin_doc_url?: string | null
          client_type?: ClientType
          birth_date?: string | null
          nationality?: string
          profession?: string | null
          address?: string | null
          pipeline_stage?: PipelineStage
          source: ClientSource
          desired_unit_types?: string[] | null
          interested_projects?: string[] | null
          confirmed_budget?: number | null
          interest_level?: InterestLevel
          visit_note?: number | null
          visit_feedback?: string | null
          payment_method?: PaymentMethod | null
          notes?: string | null
          is_priority?: boolean
          last_contact_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          agent_id?: string | null
          full_name?: string
          phone?: string
          email?: string | null
          nin_cin?: string | null
          cin_verified?: boolean
          cin_doc_url?: string | null
          client_type?: ClientType
          birth_date?: string | null
          nationality?: string
          profession?: string | null
          address?: string | null
          pipeline_stage?: PipelineStage
          source?: ClientSource
          desired_unit_types?: string[] | null
          interested_projects?: string[] | null
          confirmed_budget?: number | null
          interest_level?: InterestLevel
          visit_note?: number | null
          visit_feedback?: string | null
          payment_method?: PaymentMethod | null
          notes?: string | null
          is_priority?: boolean
          last_contact_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      visits: {
        Row: {
          id: string
          tenant_id: string
          client_id: string
          agent_id: string
          project_id: string | null
          scheduled_at: string
          visit_type: VisitType
          status: VisitStatus
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          client_id: string
          agent_id: string
          project_id?: string | null
          scheduled_at: string
          visit_type?: VisitType
          status?: VisitStatus
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          client_id?: string
          agent_id?: string
          project_id?: string | null
          scheduled_at?: string
          visit_type?: VisitType
          status?: VisitStatus
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      reservations: {
        Row: {
          id: string
          tenant_id: string
          client_id: string
          agent_id: string
          project_id: string
          unit_id: string
          nin_cin: string
          duration_days: number
          expires_at: string
          deposit_amount: number
          deposit_method: DepositMethod | null
          deposit_reference: string | null
          status: ReservationStatus
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          client_id: string
          agent_id: string
          project_id: string
          unit_id: string
          nin_cin: string
          duration_days?: number
          expires_at: string
          deposit_amount?: number
          deposit_method?: DepositMethod | null
          deposit_reference?: string | null
          status?: ReservationStatus
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          client_id?: string
          agent_id?: string
          project_id?: string
          unit_id?: string
          nin_cin?: string
          duration_days?: number
          expires_at?: string
          deposit_amount?: number
          deposit_method?: DepositMethod | null
          deposit_reference?: string | null
          status?: ReservationStatus
          created_at?: string
        }
        Relationships: []
      }
      sales: {
        Row: {
          id: string
          tenant_id: string
          client_id: string
          agent_id: string
          project_id: string
          unit_id: string
          reservation_id: string | null
          total_price: number
          discount_type: DiscountType | null
          discount_value: number
          final_price: number
          financing_mode: FinancingMode
          delivery_date: string | null
          internal_notes: string | null
          status: SaleStatus
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          client_id: string
          agent_id: string
          project_id: string
          unit_id: string
          reservation_id?: string | null
          total_price: number
          discount_type?: DiscountType | null
          discount_value?: number
          final_price: number
          financing_mode?: FinancingMode
          delivery_date?: string | null
          internal_notes?: string | null
          status?: SaleStatus
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          client_id?: string
          agent_id?: string
          project_id?: string
          unit_id?: string
          reservation_id?: string | null
          total_price?: number
          discount_type?: DiscountType | null
          discount_value?: number
          final_price?: number
          financing_mode?: FinancingMode
          delivery_date?: string | null
          internal_notes?: string | null
          status?: SaleStatus
          created_at?: string
        }
        Relationships: []
      }
      payment_schedules: {
        Row: {
          id: string
          tenant_id: string
          sale_id: string
          installment_number: number
          due_date: string
          amount: number
          description: string | null
          status: PaymentStatus
          paid_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          sale_id: string
          installment_number: number
          due_date: string
          amount: number
          description?: string | null
          status?: PaymentStatus
          paid_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          sale_id?: string
          installment_number?: number
          due_date?: string
          amount?: number
          description?: string | null
          status?: PaymentStatus
          paid_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      charges: {
        Row: {
          id: string
          tenant_id: string
          client_id: string
          sale_id: string | null
          label: string
          type: ChargeType
          amount: number
          charge_date: string | null
          status: PaymentStatus
          doc_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          client_id: string
          sale_id?: string | null
          label: string
          type?: ChargeType
          amount: number
          charge_date?: string | null
          status?: PaymentStatus
          doc_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          client_id?: string
          sale_id?: string | null
          label?: string
          type?: ChargeType
          amount?: number
          charge_date?: string | null
          status?: PaymentStatus
          doc_url?: string | null
          created_at?: string
        }
        Relationships: []
      }
      sale_amenities: {
        Row: {
          id: string
          tenant_id: string
          sale_id: string
          description: string
          price: number
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          sale_id: string
          description: string
          price?: number
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          sale_id?: string
          description?: string
          price?: number
          created_at?: string
        }
        Relationships: []
      }
      history: {
        Row: {
          id: string
          tenant_id: string
          client_id: string
          agent_id: string | null
          type: HistoryType
          title: string
          description: string | null
          metadata: Record<string, unknown>
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          client_id: string
          agent_id?: string | null
          type: HistoryType
          title: string
          description?: string | null
          metadata?: Record<string, unknown>
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          client_id?: string
          agent_id?: string | null
          type?: HistoryType
          title?: string
          description?: string | null
          metadata?: Record<string, unknown>
          created_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          id: string
          tenant_id: string
          client_id: string
          agent_id: string | null
          title: string
          type: TaskType
          status: TaskStatus
          due_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          client_id: string
          agent_id?: string | null
          title: string
          type?: TaskType
          status?: TaskStatus
          due_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          client_id?: string
          agent_id?: string | null
          title?: string
          type?: TaskType
          status?: TaskStatus
          due_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          id: string
          tenant_id: string
          client_id: string
          sale_id: string | null
          type: DocType
          name: string
          url: string
          generated_at: string
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          client_id: string
          sale_id?: string | null
          type?: DocType
          name: string
          url: string
          generated_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          client_id?: string
          sale_id?: string | null
          type?: DocType
          name?: string
          url?: string
          generated_at?: string
          created_at?: string
        }
        Relationships: []
      }
      agent_goals: {
        Row: {
          id: string
          tenant_id: string
          agent_id: string
          metric: GoalMetric
          period: GoalPeriod
          target_value: number
          current_value: number
          status: GoalStatus
          started_at: string
          ended_at: string
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          agent_id: string
          metric: GoalMetric
          period?: GoalPeriod
          target_value: number
          current_value?: number
          status?: GoalStatus
          started_at: string
          ended_at: string
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          agent_id?: string
          metric?: GoalMetric
          period?: GoalPeriod
          target_value?: number
          current_value?: number
          status?: GoalStatus
          started_at?: string
          ended_at?: string
          created_at?: string
        }
        Relationships: []
      }
      tenant_settings: {
        Row: {
          id: string
          tenant_id: string
          urgent_alert_days: number
          relaunch_alert_days: number
          reservation_duration_days: number
          min_deposit_amount: number
          language: string
          notif_agent_inactive: boolean
          notif_payment_late: boolean
          notif_reservation_expired: boolean
          notif_new_client: boolean
          notif_new_sale: boolean
          notif_goal_achieved: boolean
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          urgent_alert_days?: number
          relaunch_alert_days?: number
          reservation_duration_days?: number
          min_deposit_amount?: number
          language?: string
          notif_agent_inactive?: boolean
          notif_payment_late?: boolean
          notif_reservation_expired?: boolean
          notif_new_client?: boolean
          notif_new_sale?: boolean
          notif_goal_achieved?: boolean
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          urgent_alert_days?: number
          relaunch_alert_days?: number
          reservation_duration_days?: number
          min_deposit_amount?: number
          language?: string
          notif_agent_inactive?: boolean
          notif_payment_late?: boolean
          notif_reservation_expired?: boolean
          notif_new_client?: boolean
          notif_new_sale?: boolean
          notif_goal_achieved?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      document_templates: {
        Row: {
          id: string
          tenant_id: string
          type: DocType
          content: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          type: DocType
          content?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          type?: DocType
          content?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    CompositeTypes: Record<string, never>
    Enums: {
      user_role: UserRole
      user_status: UserStatus
      project_status: ProjectStatus
      unit_type: UnitType
      unit_subtype: UnitSubtype
      unit_status: UnitStatus
      pipeline_stage: PipelineStage
      client_source: ClientSource
      client_type: ClientType
      interest_level: InterestLevel
      payment_method: PaymentMethod
      visit_type: VisitType
      visit_status: VisitStatus
      deposit_method: DepositMethod
      reservation_status: ReservationStatus
      financing_mode: FinancingMode
      discount_type: DiscountType
      sale_status: SaleStatus
      payment_status: PaymentStatus
      charge_type: ChargeType
      history_type: HistoryType
      task_type: TaskType
      task_status: TaskStatus
      doc_type: DocType
      goal_metric: GoalMetric
      goal_period: GoalPeriod
      goal_status: GoalStatus
    }
  }
}

// Enums
export type UserRole = 'super_admin' | 'admin' | 'agent'
export type UserStatus = 'active' | 'inactive'
export type ProjectStatus = 'active' | 'inactive' | 'archived'
export type UnitType = 'apartment' | 'local' | 'villa' | 'parking'
export type UnitSubtype = 'F2' | 'F3' | 'F4' | 'F5' | 'F6'
export type UnitStatus = 'available' | 'reserved' | 'sold' | 'blocked'
export type PipelineStage = 'accueil' | 'visite_a_gerer' | 'visite_confirmee' | 'visite_terminee' | 'negociation' | 'reservation' | 'vente' | 'relancement' | 'perdue'
export type ClientSource = 'facebook_ads' | 'google_ads' | 'instagram_ads' | 'appel_entrant' | 'reception' | 'bouche_a_oreille' | 'reference_client' | 'site_web' | 'portail_immobilier' | 'autre'
export type ClientType = 'individual' | 'company'
export type InterestLevel = 'low' | 'medium' | 'high'
export type PaymentMethod = 'comptant' | 'credit' | 'lpp' | 'aadl' | 'mixte'
export type VisitType = 'on_site' | 'office' | 'virtual'
export type VisitStatus = 'planned' | 'confirmed' | 'completed' | 'cancelled' | 'rescheduled'
export type DepositMethod = 'cash' | 'bank_transfer' | 'cheque'
export type ReservationStatus = 'active' | 'expired' | 'cancelled' | 'converted'
export type FinancingMode = 'comptant' | 'credit' | 'mixte'
export type DiscountType = 'percentage' | 'fixed'
export type SaleStatus = 'active' | 'cancelled'
export type PaymentStatus = 'pending' | 'paid' | 'late'
export type ChargeType = 'notaire' | 'agence' | 'promotion' | 'enregistrement' | 'autre'
export type HistoryType = 'stage_change' | 'visit_planned' | 'visit_confirmed' | 'visit_completed' | 'call' | 'whatsapp_call' | 'whatsapp_message' | 'sms' | 'email' | 'reservation' | 'sale' | 'payment' | 'document' | 'note' | 'ai_task'
export type TaskType = 'ai_generated' | 'manual'
export type TaskStatus = 'pending' | 'done' | 'ignored'
export type DocType = 'contrat_vente' | 'echeancier' | 'bon_reservation' | 'cin' | 'autre'
export type GoalMetric = 'sales_count' | 'reservations_count' | 'visits_count' | 'revenue' | 'new_clients' | 'conversion_rate'
export type GoalPeriod = 'monthly' | 'quarterly' | 'yearly'
export type GoalStatus = 'in_progress' | 'achieved' | 'exceeded' | 'not_achieved'

// Raccourcis Row
export type Tenant = Database['public']['Tables']['tenants']['Row']
export type User = Database['public']['Tables']['users']['Row']
export type Project = Database['public']['Tables']['projects']['Row']
export type Unit = Database['public']['Tables']['units']['Row']
export type Client = Database['public']['Tables']['clients']['Row']
export type Visit = Database['public']['Tables']['visits']['Row']
export type Reservation = Database['public']['Tables']['reservations']['Row']
export type Sale = Database['public']['Tables']['sales']['Row']
export type PaymentSchedule = Database['public']['Tables']['payment_schedules']['Row']
export type Charge = Database['public']['Tables']['charges']['Row']
export type SaleAmenity = Database['public']['Tables']['sale_amenities']['Row']
export type History = Database['public']['Tables']['history']['Row']
export type Task = Database['public']['Tables']['tasks']['Row']
export type Document = Database['public']['Tables']['documents']['Row']
export type AgentGoal = Database['public']['Tables']['agent_goals']['Row']
export type TenantSettings = Database['public']['Tables']['tenant_settings']['Row']
export type DocumentTemplate = Database['public']['Tables']['document_templates']['Row']
