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
      agent_goals: {
        Row: {
          agent_id: string
          created_at: string
          current_value: number
          ended_at: string
          id: string
          metric: Database["public"]["Enums"]["goal_metric"]
          period: Database["public"]["Enums"]["goal_period"]
          started_at: string
          status: Database["public"]["Enums"]["goal_status"]
          target_value: number
          tenant_id: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          current_value?: number
          ended_at: string
          id?: string
          metric: Database["public"]["Enums"]["goal_metric"]
          period?: Database["public"]["Enums"]["goal_period"]
          started_at: string
          status?: Database["public"]["Enums"]["goal_status"]
          target_value: number
          tenant_id: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          current_value?: number
          ended_at?: string
          id?: string
          metric?: Database["public"]["Enums"]["goal_metric"]
          period?: Database["public"]["Enums"]["goal_period"]
          started_at?: string
          status?: Database["public"]["Enums"]["goal_status"]
          target_value?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_goals_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_goals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      app_secrets: {
        Row: {
          anthropic_api_key: string | null
          id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          anthropic_api_key?: string | null
          id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          anthropic_api_key?: string | null
          id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_secrets_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          company_address: string | null
          company_email: string | null
          company_name: string | null
          company_phone: string | null
          company_website: string | null
          company_wilaya: string | null
          custom_app_name: string | null
          custom_logo_url: string | null
          custom_primary_color: string | null
          feature_ai_scripts: boolean
          feature_auto_tasks: boolean
          feature_charges: boolean
          feature_documents: boolean
          feature_goals: boolean
          feature_landing_pages: boolean
          feature_payment_tracking: boolean
          feature_whatsapp: boolean
          id: string
          language: string
          min_deposit_amount: number
          notif_agent_inactive: boolean
          notif_goal_achieved: boolean
          notif_new_client: boolean
          notif_new_sale: boolean
          notif_payment_late: boolean
          notif_reservation_expired: boolean
          reception_assignment_mode: string
          reception_max_leads_per_day: number
          reception_override_requires_reason: boolean
          relaunch_alert_days: number
          reservation_duration_days: number
          updated_at: string
          urgent_alert_days: number
        }
        Insert: {
          company_address?: string | null
          company_email?: string | null
          company_name?: string | null
          company_phone?: string | null
          company_website?: string | null
          company_wilaya?: string | null
          custom_app_name?: string | null
          custom_logo_url?: string | null
          custom_primary_color?: string | null
          feature_ai_scripts?: boolean
          feature_auto_tasks?: boolean
          feature_charges?: boolean
          feature_documents?: boolean
          feature_goals?: boolean
          feature_landing_pages?: boolean
          feature_payment_tracking?: boolean
          feature_whatsapp?: boolean
          id?: string
          language?: string
          min_deposit_amount?: number
          notif_agent_inactive?: boolean
          notif_goal_achieved?: boolean
          notif_new_client?: boolean
          notif_new_sale?: boolean
          notif_payment_late?: boolean
          notif_reservation_expired?: boolean
          reception_assignment_mode?: string
          reception_max_leads_per_day?: number
          reception_override_requires_reason?: boolean
          relaunch_alert_days?: number
          reservation_duration_days?: number
          updated_at?: string
          urgent_alert_days?: number
        }
        Update: {
          company_address?: string | null
          company_email?: string | null
          company_name?: string | null
          company_phone?: string | null
          company_website?: string | null
          company_wilaya?: string | null
          custom_app_name?: string | null
          custom_logo_url?: string | null
          custom_primary_color?: string | null
          feature_ai_scripts?: boolean
          feature_auto_tasks?: boolean
          feature_charges?: boolean
          feature_documents?: boolean
          feature_goals?: boolean
          feature_landing_pages?: boolean
          feature_payment_tracking?: boolean
          feature_whatsapp?: boolean
          id?: string
          language?: string
          min_deposit_amount?: number
          notif_agent_inactive?: boolean
          notif_goal_achieved?: boolean
          notif_new_client?: boolean
          notif_new_sale?: boolean
          notif_payment_late?: boolean
          notif_reservation_expired?: boolean
          reception_assignment_mode?: string
          reception_max_leads_per_day?: number
          reception_override_requires_reason?: boolean
          relaunch_alert_days?: number
          reservation_duration_days?: number
          updated_at?: string
          urgent_alert_days?: number
        }
        Relationships: []
      }
      audit_trail: {
        Row: {
          action: string
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          table_name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_trail_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      call_responses: {
        Row: {
          agent_id: string
          ai_suggestion: string | null
          ai_summary: string | null
          client_id: string
          created_at: string
          duration_seconds: number | null
          id: string
          responses: Json | null
          result: string | null
          script_id: string | null
        }
        Insert: {
          agent_id: string
          ai_suggestion?: string | null
          ai_summary?: string | null
          client_id: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          responses?: Json | null
          result?: string | null
          script_id?: string | null
        }
        Update: {
          agent_id?: string
          ai_suggestion?: string | null
          ai_summary?: string | null
          client_id?: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          responses?: Json | null
          result?: string | null
          script_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_responses_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_responses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_responses_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "call_scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      call_scripts: {
        Row: {
          created_at: string
          id: string
          intro_text: string | null
          is_active: boolean | null
          outro_text: string | null
          pipeline_stage: string
          questions: Json | null
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          intro_text?: string | null
          is_active?: boolean | null
          outro_text?: string | null
          pipeline_stage: string
          questions?: Json | null
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          intro_text?: string | null
          is_active?: boolean | null
          outro_text?: string | null
          pipeline_stage?: string
          questions?: Json | null
          title?: string
        }
        Relationships: []
      }
      charges: {
        Row: {
          amount: number
          charge_date: string | null
          client_id: string
          created_at: string
          doc_url: string | null
          id: string
          label: string
          sale_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          tenant_id: string
          type: Database["public"]["Enums"]["charge_type"]
        }
        Insert: {
          amount: number
          charge_date?: string | null
          client_id: string
          created_at?: string
          doc_url?: string | null
          id?: string
          label: string
          sale_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          tenant_id: string
          type?: Database["public"]["Enums"]["charge_type"]
        }
        Update: {
          amount?: number
          charge_date?: string | null
          client_id?: string
          created_at?: string
          doc_url?: string | null
          id?: string
          label?: string
          sale_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          tenant_id?: string
          type?: Database["public"]["Enums"]["charge_type"]
        }
        Relationships: [
          {
            foreignKeyName: "charges_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charges_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charges_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      client_tasks: {
        Row: {
          agent_id: string | null
          auto_cancelled: boolean | null
          bundle_id: string | null
          channel: string | null
          channel_used: string | null
          client_id: string
          client_response: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          executed_at: string | null
          id: string
          is_recurring: boolean | null
          message_sent: string | null
          priority: string | null
          recurrence_days: number | null
          reminder_at: string | null
          response: string | null
          scheduled_at: string | null
          stage: string | null
          status: string | null
          template_id: string | null
          tenant_id: string
          title: string
        }
        Insert: {
          agent_id?: string | null
          auto_cancelled?: boolean | null
          bundle_id?: string | null
          channel?: string | null
          channel_used?: string | null
          client_id: string
          client_response?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          executed_at?: string | null
          id?: string
          is_recurring?: boolean | null
          message_sent?: string | null
          priority?: string | null
          recurrence_days?: number | null
          reminder_at?: string | null
          response?: string | null
          scheduled_at?: string | null
          stage?: string | null
          status?: string | null
          template_id?: string | null
          tenant_id: string
          title: string
        }
        Update: {
          agent_id?: string | null
          auto_cancelled?: boolean | null
          bundle_id?: string | null
          channel?: string | null
          channel_used?: string | null
          client_id?: string
          client_response?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          executed_at?: string | null
          id?: string
          is_recurring?: boolean | null
          message_sent?: string | null
          priority?: string | null
          recurrence_days?: number | null
          reminder_at?: string | null
          response?: string | null
          scheduled_at?: string | null
          stage?: string | null
          status?: string | null
          template_id?: string | null
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_tasks_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_tasks_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "task_bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_tasks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          agent_id: string | null
          birth_date: string | null
          cin_doc_url: string | null
          cin_verified: boolean
          client_type: Database["public"]["Enums"]["client_type"]
          confirmed_budget: number | null
          created_at: string
          desired_unit_types: string[] | null
          email: string | null
          full_name: string
          id: string
          interest_level: Database["public"]["Enums"]["interest_level"]
          interested_projects: string[] | null
          is_priority: boolean
          last_contact_at: string | null
          nationality: string
          nin_cin: string | null
          notes: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          phone: string
          phone_normalized: string | null
          pipeline_stage: Database["public"]["Enums"]["pipeline_stage"]
          profession: string | null
          source: Database["public"]["Enums"]["client_source"]
          tenant_id: string | null
          visit_feedback: string | null
          visit_note: number | null
        }
        Insert: {
          address?: string | null
          agent_id?: string | null
          birth_date?: string | null
          cin_doc_url?: string | null
          cin_verified?: boolean
          client_type?: Database["public"]["Enums"]["client_type"]
          confirmed_budget?: number | null
          created_at?: string
          desired_unit_types?: string[] | null
          email?: string | null
          full_name: string
          id?: string
          interest_level?: Database["public"]["Enums"]["interest_level"]
          interested_projects?: string[] | null
          is_priority?: boolean
          last_contact_at?: string | null
          nationality?: string
          nin_cin?: string | null
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          phone: string
          phone_normalized?: string | null
          pipeline_stage?: Database["public"]["Enums"]["pipeline_stage"]
          profession?: string | null
          source: Database["public"]["Enums"]["client_source"]
          tenant_id?: string | null
          visit_feedback?: string | null
          visit_note?: number | null
        }
        Update: {
          address?: string | null
          agent_id?: string | null
          birth_date?: string | null
          cin_doc_url?: string | null
          cin_verified?: boolean
          client_type?: Database["public"]["Enums"]["client_type"]
          confirmed_budget?: number | null
          created_at?: string
          desired_unit_types?: string[] | null
          email?: string | null
          full_name?: string
          id?: string
          interest_level?: Database["public"]["Enums"]["interest_level"]
          interested_projects?: string[] | null
          is_priority?: boolean
          last_contact_at?: string | null
          nationality?: string
          nin_cin?: string | null
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          phone?: string
          phone_normalized?: string | null
          pipeline_stage?: Database["public"]["Enums"]["pipeline_stage"]
          profession?: string | null
          source?: Database["public"]["Enums"]["client_source"]
          tenant_id?: string | null
          visit_feedback?: string | null
          visit_note?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      document_templates: {
        Row: {
          content: string
          id: string
          tenant_id: string
          type: Database["public"]["Enums"]["doc_type"]
          updated_at: string
        }
        Insert: {
          content?: string
          id?: string
          tenant_id: string
          type: Database["public"]["Enums"]["doc_type"]
          updated_at?: string
        }
        Update: {
          content?: string
          id?: string
          tenant_id?: string
          type?: Database["public"]["Enums"]["doc_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          client_id: string
          created_at: string
          generated_at: string
          id: string
          name: string
          sale_id: string | null
          tenant_id: string | null
          type: Database["public"]["Enums"]["doc_type"]
          url: string
        }
        Insert: {
          client_id: string
          created_at?: string
          generated_at?: string
          id?: string
          name: string
          sale_id?: string | null
          tenant_id?: string | null
          type?: Database["public"]["Enums"]["doc_type"]
          url: string
        }
        Update: {
          client_id?: string
          created_at?: string
          generated_at?: string
          id?: string
          name?: string
          sale_id?: string | null
          tenant_id?: string | null
          type?: Database["public"]["Enums"]["doc_type"]
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      email_campaign_recipients: {
        Row: {
          campaign_id: string
          clicked_at: string | null
          client_id: string | null
          email: string
          full_name: string | null
          id: string
          opened_at: string | null
          sent_at: string | null
          status: string
        }
        Insert: {
          campaign_id: string
          clicked_at?: string | null
          client_id?: string | null
          email: string
          full_name?: string | null
          id?: string
          opened_at?: string | null
          sent_at?: string | null
          status?: string
        }
        Update: {
          campaign_id?: string
          clicked_at?: string | null
          client_id?: string | null
          email?: string
          full_name?: string | null
          id?: string
          opened_at?: string | null
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_campaign_recipients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      email_campaigns: {
        Row: {
          created_at: string
          id: string
          name: string
          scheduled_at: string | null
          segment_rules: Json
          sent_at: string | null
          status: string
          subject: string
          template_id: string | null
          total_clicked: number
          total_opened: number
          total_recipients: number
          total_sent: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          scheduled_at?: string | null
          segment_rules?: Json
          sent_at?: string | null
          status?: string
          subject: string
          template_id?: string | null
          total_clicked?: number
          total_opened?: number
          total_recipients?: number
          total_sent?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          scheduled_at?: string | null
          segment_rules?: Json
          sent_at?: string | null
          status?: string
          subject?: string
          template_id?: string | null
          total_clicked?: number
          total_opened?: number
          total_recipients?: number
          total_sent?: number
        }
        Relationships: [
          {
            foreignKeyName: "email_campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_events: {
        Row: {
          campaign_id: string | null
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          recipient_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          recipient_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          recipient_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_events_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "email_campaign_recipients"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          provider: string | null
          recipient: string
          status: string
          subject: string
          template: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          provider?: string | null
          recipient: string
          status?: string
          subject: string
          template?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          provider?: string | null
          recipient?: string
          status?: string
          subject?: string
          template?: string | null
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          blocks: Json
          created_at: string
          html_cache: string | null
          id: string
          name: string
          subject: string
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          blocks?: Json
          created_at?: string
          html_cache?: string | null
          id?: string
          name: string
          subject?: string
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          blocks?: Json
          created_at?: string
          html_cache?: string | null
          id?: string
          name?: string
          subject?: string
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      history: {
        Row: {
          agent_id: string | null
          client_id: string
          created_at: string
          description: string | null
          id: string
          metadata: Json
          tenant_id: string | null
          title: string
          type: Database["public"]["Enums"]["history_type"]
        }
        Insert: {
          agent_id?: string | null
          client_id: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          tenant_id?: string | null
          title: string
          type: Database["public"]["Enums"]["history_type"]
        }
        Update: {
          agent_id?: string | null
          client_id?: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          tenant_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["history_type"]
        }
        Relationships: [
          {
            foreignKeyName: "history_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "history_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_campaigns: {
        Row: {
          budget: number
          channel: string
          created_at: string
          end_date: string | null
          id: string
          name: string
          notes: string | null
          project_id: string | null
          start_date: string | null
          status: string
          tenant_id: string
          updated_at: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          budget?: number
          channel: string
          created_at?: string
          end_date?: string | null
          id?: string
          name: string
          notes?: string | null
          project_id?: string | null
          start_date?: string | null
          status?: string
          tenant_id: string
          updated_at?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          budget?: number
          channel?: string
          created_at?: string
          end_date?: string | null
          id?: string
          name?: string
          notes?: string | null
          project_id?: string | null
          start_date?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_campaigns_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_expenses: {
        Row: {
          amount: number
          campaign_id: string | null
          channel: string | null
          created_at: string
          expense_date: string
          id: string
          invoice_url: string | null
          label: string
          notes: string | null
          project_id: string | null
          tenant_id: string
        }
        Insert: {
          amount: number
          campaign_id?: string | null
          channel?: string | null
          created_at?: string
          expense_date?: string
          id?: string
          invoice_url?: string | null
          label: string
          notes?: string | null
          project_id?: string | null
          tenant_id: string
        }
        Update: {
          amount?: number
          campaign_id?: string | null
          channel?: string | null
          created_at?: string
          expense_date?: string
          id?: string
          invoice_url?: string | null
          label?: string
          notes?: string | null
          project_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_expenses_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_expenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_expenses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          ai_prompt: string | null
          attached_file_types: string[] | null
          body: string
          channel: string | null
          created_at: string
          id: string
          is_active: boolean | null
          mode: string | null
          project_id: string | null
          sort_order: number | null
          stage: string
          subject: string | null
          tenant_id: string
          trigger_type: string
          updated_at: string | null
          variables_used: string[] | null
        }
        Insert: {
          ai_prompt?: string | null
          attached_file_types?: string[] | null
          body: string
          channel?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          mode?: string | null
          project_id?: string | null
          sort_order?: number | null
          stage: string
          subject?: string | null
          tenant_id: string
          trigger_type: string
          updated_at?: string | null
          variables_used?: string[] | null
        }
        Update: {
          ai_prompt?: string | null
          attached_file_types?: string[] | null
          body?: string
          channel?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          mode?: string | null
          project_id?: string | null
          sort_order?: number | null
          stage?: string
          subject?: string | null
          tenant_id?: string
          trigger_type?: string
          updated_at?: string | null
          variables_used?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "message_templates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string | null
          metadata: Json | null
          read: boolean | null
          tenant_id: string
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          metadata?: Json | null
          read?: boolean | null
          tenant_id: string
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          metadata?: Json | null
          read?: boolean | null
          tenant_id?: string
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_schedules: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          due_date: string
          id: string
          installment_number: number
          paid_at: string | null
          sale_id: string
          status: Database["public"]["Enums"]["payment_status"]
          tenant_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          due_date: string
          id?: string
          installment_number: number
          paid_at?: string | null
          sale_id: string
          status?: Database["public"]["Enums"]["payment_status"]
          tenant_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          installment_number?: number
          paid_at?: string | null
          sale_id?: string
          status?: Database["public"]["Enums"]["payment_status"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_schedules_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_profiles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          is_default: boolean
          name: string
          permissions: Json | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean
          name: string
          permissions?: Json | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean
          name?: string
          permissions?: Json | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "permission_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      project_files: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          project_id: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type: string
          file_url: string
          id?: string
          project_id?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          avg_price_per_unit: number | null
          code: string
          cover_url: string | null
          created_at: string
          delivery_date: string | null
          description: string | null
          gallery_urls: string[] | null
          id: string
          location: string | null
          name: string
          status: Database["public"]["Enums"]["project_status"]
          tenant_id: string | null
        }
        Insert: {
          avg_price_per_unit?: number | null
          code: string
          cover_url?: string | null
          created_at?: string
          delivery_date?: string | null
          description?: string | null
          gallery_urls?: string[] | null
          id?: string
          location?: string | null
          name: string
          status?: Database["public"]["Enums"]["project_status"]
          tenant_id?: string | null
        }
        Update: {
          avg_price_per_unit?: number | null
          code?: string
          cover_url?: string | null
          created_at?: string
          delivery_date?: string | null
          description?: string | null
          gallery_urls?: string[] | null
          id?: string
          location?: string | null
          name?: string
          status?: Database["public"]["Enums"]["project_status"]
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_seen_at: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_seen_at?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_seen_at?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          agent_id: string
          client_id: string
          created_at: string
          deposit_amount: number
          deposit_method: Database["public"]["Enums"]["deposit_method"] | null
          deposit_reference: string | null
          duration_days: number
          expires_at: string
          id: string
          nin_cin: string
          project_id: string
          status: Database["public"]["Enums"]["reservation_status"]
          tenant_id: string | null
          unit_id: string
        }
        Insert: {
          agent_id: string
          client_id: string
          created_at?: string
          deposit_amount?: number
          deposit_method?: Database["public"]["Enums"]["deposit_method"] | null
          deposit_reference?: string | null
          duration_days?: number
          expires_at: string
          id?: string
          nin_cin: string
          project_id: string
          status?: Database["public"]["Enums"]["reservation_status"]
          tenant_id?: string | null
          unit_id: string
        }
        Update: {
          agent_id?: string
          client_id?: string
          created_at?: string
          deposit_amount?: number
          deposit_method?: Database["public"]["Enums"]["deposit_method"] | null
          deposit_reference?: string | null
          duration_days?: number
          expires_at?: string
          id?: string
          nin_cin?: string
          project_id?: string
          status?: Database["public"]["Enums"]["reservation_status"]
          tenant_id?: string | null
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_amenities: {
        Row: {
          created_at: string
          description: string
          id: string
          price: number
          sale_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          price?: number
          sale_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          price?: number
          sale_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_amenities_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_amenities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_charges: {
        Row: {
          amount: number | null
          charge_type: string
          created_at: string
          id: string
          label: string
          paid: boolean | null
          paid_at: string | null
          sale_id: string
          tenant_id: string
        }
        Insert: {
          amount?: number | null
          charge_type: string
          created_at?: string
          id?: string
          label: string
          paid?: boolean | null
          paid_at?: string | null
          sale_id: string
          tenant_id: string
        }
        Update: {
          amount?: number | null
          charge_type?: string
          created_at?: string
          id?: string
          label?: string
          paid?: boolean | null
          paid_at?: string | null
          sale_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_charges_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_charges_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_playbooks: {
        Row: {
          closing_phrases: Json | null
          created_at: string
          custom_instructions: string | null
          id: string
          is_active: boolean | null
          methodology: string | null
          name: string
          objection_rules: Json | null
          objective: string | null
          tenant_id: string
          tone: string | null
          updated_at: string | null
        }
        Insert: {
          closing_phrases?: Json | null
          created_at?: string
          custom_instructions?: string | null
          id?: string
          is_active?: boolean | null
          methodology?: string | null
          name: string
          objection_rules?: Json | null
          objective?: string | null
          tenant_id: string
          tone?: string | null
          updated_at?: string | null
        }
        Update: {
          closing_phrases?: Json | null
          created_at?: string
          custom_instructions?: string | null
          id?: string
          is_active?: boolean | null
          methodology?: string | null
          name?: string
          objection_rules?: Json | null
          objective?: string | null
          tenant_id?: string
          tone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_playbooks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          agent_id: string
          client_id: string
          created_at: string
          delivery_date: string | null
          discount_type: Database["public"]["Enums"]["discount_type"] | null
          discount_value: number
          final_price: number
          financing_mode: Database["public"]["Enums"]["financing_mode"]
          id: string
          internal_notes: string | null
          project_id: string
          reservation_id: string | null
          status: Database["public"]["Enums"]["sale_status"]
          tenant_id: string | null
          total_price: number
          unit_id: string
        }
        Insert: {
          agent_id: string
          client_id: string
          created_at?: string
          delivery_date?: string | null
          discount_type?: Database["public"]["Enums"]["discount_type"] | null
          discount_value?: number
          final_price: number
          financing_mode?: Database["public"]["Enums"]["financing_mode"]
          id?: string
          internal_notes?: string | null
          project_id: string
          reservation_id?: string | null
          status?: Database["public"]["Enums"]["sale_status"]
          tenant_id?: string | null
          total_price: number
          unit_id: string
        }
        Update: {
          agent_id?: string
          client_id?: string
          created_at?: string
          delivery_date?: string | null
          discount_type?: Database["public"]["Enums"]["discount_type"] | null
          discount_value?: number
          final_price?: number
          financing_mode?: Database["public"]["Enums"]["financing_mode"]
          id?: string
          internal_notes?: string | null
          project_id?: string
          reservation_id?: string | null
          status?: Database["public"]["Enums"]["sale_status"]
          tenant_id?: string | null
          total_price?: number
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      sent_messages_log: {
        Row: {
          agent_id: string | null
          channel: string
          client_id: string | null
          id: string
          message: string
          sent_at: string
          task_id: string | null
          tenant_id: string
        }
        Insert: {
          agent_id?: string | null
          channel: string
          client_id?: string | null
          id?: string
          message: string
          sent_at?: string
          task_id?: string | null
          tenant_id: string
        }
        Update: {
          agent_id?: string | null
          channel?: string
          client_id?: string | null
          id?: string
          message?: string
          sent_at?: string
          task_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sent_messages_log_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sent_messages_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sent_messages_log_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "client_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sent_messages_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      task_bundles: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          stage: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          stage: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          stage?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_bundles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      task_templates: {
        Row: {
          attached_file_types: string[] | null
          auto_trigger: string | null
          bundle_id: string | null
          channel: string | null
          created_at: string
          delay_minutes: number | null
          description: string | null
          id: string
          is_active: boolean | null
          maps_to_field: string | null
          message_mode: string | null
          message_template: string | null
          next_task_on_failure: string | null
          next_task_on_success: string | null
          priority: string | null
          sort_order: number | null
          stage: string
          tenant_id: string
          title: string
        }
        Insert: {
          attached_file_types?: string[] | null
          auto_trigger?: string | null
          bundle_id?: string | null
          channel?: string | null
          created_at?: string
          delay_minutes?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          maps_to_field?: string | null
          message_mode?: string | null
          message_template?: string | null
          next_task_on_failure?: string | null
          next_task_on_success?: string | null
          priority?: string | null
          sort_order?: number | null
          stage: string
          tenant_id: string
          title: string
        }
        Update: {
          attached_file_types?: string[] | null
          auto_trigger?: string | null
          bundle_id?: string | null
          channel?: string | null
          created_at?: string
          delay_minutes?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          maps_to_field?: string | null
          message_mode?: string | null
          message_template?: string | null
          next_task_on_failure?: string | null
          next_task_on_success?: string | null
          priority?: string | null
          sort_order?: number | null
          stage?: string
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_templates_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "task_bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          agent_id: string | null
          client_id: string
          created_at: string
          due_at: string | null
          id: string
          status: Database["public"]["Enums"]["task_status"]
          tenant_id: string
          title: string
          type: Database["public"]["Enums"]["task_type"]
        }
        Insert: {
          agent_id?: string | null
          client_id: string
          created_at?: string
          due_at?: string | null
          id?: string
          status?: Database["public"]["Enums"]["task_status"]
          tenant_id: string
          title: string
          type?: Database["public"]["Enums"]["task_type"]
        }
        Update: {
          agent_id?: string | null
          client_id?: string
          created_at?: string
          due_at?: string | null
          id?: string
          status?: Database["public"]["Enums"]["task_status"]
          tenant_id?: string
          title?: string
          type?: Database["public"]["Enums"]["task_type"]
        }
        Relationships: [
          {
            foreignKeyName: "tasks_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_settings: {
        Row: {
          id: string
          language: string
          min_deposit_amount: number
          notif_agent_inactive: boolean
          notif_goal_achieved: boolean
          notif_new_client: boolean
          notif_new_sale: boolean
          notif_payment_late: boolean
          notif_reservation_expired: boolean
          relaunch_alert_days: number
          reservation_duration_days: number
          tenant_id: string
          updated_at: string
          urgent_alert_days: number
        }
        Insert: {
          id?: string
          language?: string
          min_deposit_amount?: number
          notif_agent_inactive?: boolean
          notif_goal_achieved?: boolean
          notif_new_client?: boolean
          notif_new_sale?: boolean
          notif_payment_late?: boolean
          notif_reservation_expired?: boolean
          relaunch_alert_days?: number
          reservation_duration_days?: number
          tenant_id: string
          updated_at?: string
          urgent_alert_days?: number
        }
        Update: {
          id?: string
          language?: string
          min_deposit_amount?: number
          notif_agent_inactive?: boolean
          notif_goal_achieved?: boolean
          notif_new_client?: boolean
          notif_new_sale?: boolean
          notif_payment_late?: boolean
          notif_reservation_expired?: boolean
          relaunch_alert_days?: number
          reservation_duration_days?: number
          tenant_id?: string
          updated_at?: string
          urgent_alert_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "tenant_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          logo_url: string | null
          name: string
          onboarding_completed: boolean | null
          phone: string | null
          plan: string | null
          suspended_at: string | null
          trial_ends_at: string | null
          website: string | null
          wilaya: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          onboarding_completed?: boolean | null
          phone?: string | null
          plan?: string | null
          suspended_at?: string | null
          trial_ends_at?: string | null
          website?: string | null
          wilaya?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          onboarding_completed?: boolean | null
          phone?: string | null
          plan?: string | null
          suspended_at?: string | null
          trial_ends_at?: string | null
          website?: string | null
          wilaya?: string | null
        }
        Relationships: []
      }
      units: {
        Row: {
          agent_id: string | null
          building: string | null
          client_id: string | null
          code: string
          created_at: string
          delivery_date: string | null
          floor: number | null
          id: string
          plan_2d_url: string | null
          price: number | null
          project_id: string
          status: Database["public"]["Enums"]["unit_status"]
          subtype: Database["public"]["Enums"]["unit_subtype"] | null
          surface: number | null
          tenant_id: string | null
          type: Database["public"]["Enums"]["unit_type"]
        }
        Insert: {
          agent_id?: string | null
          building?: string | null
          client_id?: string | null
          code: string
          created_at?: string
          delivery_date?: string | null
          floor?: number | null
          id?: string
          plan_2d_url?: string | null
          price?: number | null
          project_id: string
          status?: Database["public"]["Enums"]["unit_status"]
          subtype?: Database["public"]["Enums"]["unit_subtype"] | null
          surface?: number | null
          tenant_id?: string | null
          type?: Database["public"]["Enums"]["unit_type"]
        }
        Update: {
          agent_id?: string | null
          building?: string | null
          client_id?: string | null
          code?: string
          created_at?: string
          delivery_date?: string | null
          floor?: number | null
          id?: string
          plan_2d_url?: string | null
          price?: number | null
          project_id?: string
          status?: Database["public"]["Enums"]["unit_status"]
          subtype?: Database["public"]["Enums"]["unit_subtype"] | null
          surface?: number | null
          tenant_id?: string | null
          type?: Database["public"]["Enums"]["unit_type"]
        }
        Relationships: [
          {
            foreignKeyName: "fk_units_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "units_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "units_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "units_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          archived_at: string | null
          avatar_url: string | null
          created_at: string
          deletion_requested_at: string | null
          email: string
          first_name: string
          id: string
          last_activity: string | null
          last_name: string
          must_change_password: boolean
          permission_profile_id: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          status: Database["public"]["Enums"]["user_status"]
          tenant_id: string | null
          terms_accepted_at: string | null
        }
        Insert: {
          archived_at?: string | null
          avatar_url?: string | null
          created_at?: string
          deletion_requested_at?: string | null
          email: string
          first_name: string
          id: string
          last_activity?: string | null
          last_name: string
          must_change_password?: boolean
          permission_profile_id?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["user_status"]
          tenant_id?: string | null
          terms_accepted_at?: string | null
        }
        Update: {
          archived_at?: string | null
          avatar_url?: string | null
          created_at?: string
          deletion_requested_at?: string | null
          email?: string
          first_name?: string
          id?: string
          last_activity?: string | null
          last_name?: string
          must_change_password?: boolean
          permission_profile_id?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["user_status"]
          tenant_id?: string | null
          terms_accepted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_permission_profile_id_fkey"
            columns: ["permission_profile_id"]
            isOneToOne: false
            referencedRelation: "permission_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      visits: {
        Row: {
          agent_id: string
          client_id: string
          created_at: string
          id: string
          notes: string | null
          project_id: string | null
          scheduled_at: string
          status: Database["public"]["Enums"]["visit_status"]
          tenant_id: string | null
          visit_type: Database["public"]["Enums"]["visit_type"]
        }
        Insert: {
          agent_id: string
          client_id: string
          created_at?: string
          id?: string
          notes?: string | null
          project_id?: string | null
          scheduled_at: string
          status?: Database["public"]["Enums"]["visit_status"]
          tenant_id?: string | null
          visit_type?: Database["public"]["Enums"]["visit_type"]
        }
        Update: {
          agent_id?: string
          client_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          project_id?: string | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["visit_status"]
          tenant_id?: string | null
          visit_type?: Database["public"]["Enums"]["visit_type"]
        }
        Relationships: [
          {
            foreignKeyName: "visits_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_accounts: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          messages_sent: number | null
          monthly_quota: number | null
          plan: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          messages_sent?: number | null
          monthly_quota?: number | null
          plan?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          messages_sent?: number | null
          monthly_quota?: number | null
          plan?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          client_id: string
          created_at: string
          direction: string | null
          id: string
          message: string
          status: string | null
          tenant_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          direction?: string | null
          id?: string
          message: string
          status?: string | null
          tenant_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          direction?: string | null
          id?: string
          message?: string
          status?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_plans: {
        Row: {
          created_at: string
          features: Json | null
          id: string
          is_active: boolean | null
          label: string
          monthly_quota: number
          name: string
          price_da: number
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          features?: Json | null
          id?: string
          is_active?: boolean | null
          label: string
          monthly_quota: number
          name: string
          price_da: number
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          features?: Json | null
          id?: string
          is_active?: boolean | null
          label?: string
          monthly_quota?: number
          name?: string
          price_da?: number
          sort_order?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      archive_agent: { Args: { p_agent_id: string }; Returns: Json }
      check_expired_reservations: { Args: never; Returns: number }
      check_overdue_payments: { Args: never; Returns: number }
      get_anthropic_api_key_preview: { Args: never; Returns: Json }
      get_my_tenant_id: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      is_reception: { Args: never; Returns: boolean }
      normalize_phone: { Args: { p_phone: string }; Returns: string }
      notify_push: {
        Args: {
          p_body?: string
          p_title: string
          p_url?: string
          p_user_id: string
        }
        Returns: number
      }
      owns_agent_id: { Args: { agent_id: string }; Returns: boolean }
      pick_agent_for_assignment: { Args: never; Returns: string }
      set_anthropic_api_key: { Args: { new_key: string }; Returns: undefined }
      test_notify_push: { Args: never; Returns: Json }
      transfer_agent_clients_and_deactivate: {
        Args: {
          p_agent_id: string
          p_departure_reason: string
          p_transfers: Json
        }
        Returns: Json
      }
      try_parse_uuid: { Args: { txt: string }; Returns: string }
    }
    Enums: {
      charge_type:
        | "notaire"
        | "agence"
        | "promotion"
        | "enregistrement"
        | "autre"
      client_source:
        | "facebook_ads"
        | "google_ads"
        | "instagram_ads"
        | "appel_entrant"
        | "reception"
        | "bouche_a_oreille"
        | "reference_client"
        | "site_web"
        | "portail_immobilier"
        | "autre"
      client_type: "individual" | "company"
      deposit_method: "cash" | "bank_transfer" | "cheque"
      discount_type: "percentage" | "fixed"
      doc_type:
        | "contrat_vente"
        | "echeancier"
        | "bon_reservation"
        | "cin"
        | "autre"
      financing_mode: "comptant" | "credit" | "mixte"
      goal_metric:
        | "sales_count"
        | "reservations_count"
        | "visits_count"
        | "revenue"
        | "new_clients"
        | "conversion_rate"
      goal_period: "monthly" | "quarterly" | "yearly"
      goal_status: "in_progress" | "achieved" | "exceeded" | "not_achieved"
      history_type:
        | "stage_change"
        | "visit_planned"
        | "visit_confirmed"
        | "visit_completed"
        | "call"
        | "whatsapp_call"
        | "whatsapp_message"
        | "sms"
        | "email"
        | "reservation"
        | "sale"
        | "payment"
        | "document"
        | "note"
        | "ai_task"
        | "client_created"
        | "reassignment"
        | "priority_change"
        | "budget_change"
      interest_level: "low" | "medium" | "high"
      payment_method: "comptant" | "credit" | "lpp" | "aadl" | "mixte"
      payment_status: "pending" | "paid" | "late"
      pipeline_stage:
        | "accueil"
        | "visite_a_gerer"
        | "visite_confirmee"
        | "visite_terminee"
        | "negociation"
        | "reservation"
        | "vente"
        | "relancement"
        | "perdue"
      project_status: "active" | "inactive" | "archived"
      reservation_status: "active" | "expired" | "cancelled" | "converted"
      sale_status: "active" | "cancelled"
      task_status: "pending" | "done" | "ignored"
      task_type: "ai_generated" | "manual"
      unit_status: "available" | "reserved" | "sold" | "blocked"
      unit_subtype: "F2" | "F3" | "F4" | "F5" | "F6"
      unit_type: "apartment" | "local" | "villa" | "parking"
      user_role: "admin" | "agent" | "reception" | "super_admin"
      user_status: "active" | "inactive" | "archived"
      visit_status:
        | "planned"
        | "confirmed"
        | "completed"
        | "cancelled"
        | "rescheduled"
      visit_type: "on_site" | "office" | "virtual"
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
      charge_type: [
        "notaire",
        "agence",
        "promotion",
        "enregistrement",
        "autre",
      ],
      client_source: [
        "facebook_ads",
        "google_ads",
        "instagram_ads",
        "appel_entrant",
        "reception",
        "bouche_a_oreille",
        "reference_client",
        "site_web",
        "portail_immobilier",
        "autre",
      ],
      client_type: ["individual", "company"],
      deposit_method: ["cash", "bank_transfer", "cheque"],
      discount_type: ["percentage", "fixed"],
      doc_type: [
        "contrat_vente",
        "echeancier",
        "bon_reservation",
        "cin",
        "autre",
      ],
      financing_mode: ["comptant", "credit", "mixte"],
      goal_metric: [
        "sales_count",
        "reservations_count",
        "visits_count",
        "revenue",
        "new_clients",
        "conversion_rate",
      ],
      goal_period: ["monthly", "quarterly", "yearly"],
      goal_status: ["in_progress", "achieved", "exceeded", "not_achieved"],
      history_type: [
        "stage_change",
        "visit_planned",
        "visit_confirmed",
        "visit_completed",
        "call",
        "whatsapp_call",
        "whatsapp_message",
        "sms",
        "email",
        "reservation",
        "sale",
        "payment",
        "document",
        "note",
        "ai_task",
        "client_created",
        "reassignment",
        "priority_change",
        "budget_change",
      ],
      interest_level: ["low", "medium", "high"],
      payment_method: ["comptant", "credit", "lpp", "aadl", "mixte"],
      payment_status: ["pending", "paid", "late"],
      pipeline_stage: [
        "accueil",
        "visite_a_gerer",
        "visite_confirmee",
        "visite_terminee",
        "negociation",
        "reservation",
        "vente",
        "relancement",
        "perdue",
      ],
      project_status: ["active", "inactive", "archived"],
      reservation_status: ["active", "expired", "cancelled", "converted"],
      sale_status: ["active", "cancelled"],
      task_status: ["pending", "done", "ignored"],
      task_type: ["ai_generated", "manual"],
      unit_status: ["available", "reserved", "sold", "blocked"],
      unit_subtype: ["F2", "F3", "F4", "F5", "F6"],
      unit_type: ["apartment", "local", "villa", "parking"],
      user_role: ["admin", "agent", "reception", "super_admin"],
      user_status: ["active", "inactive", "archived"],
      visit_status: [
        "planned",
        "confirmed",
        "completed",
        "cancelled",
        "rescheduled",
      ],
      visit_type: ["on_site", "office", "virtual"],
    },
  },
} as const

// ─── Named type aliases for application-side imports ────────────────────────
// Generated `Database` only exposes types via index access. Re-export the
// shapes the rest of the app imports by name so call sites stay stable.

// Enums
export type ChargeType = Database['public']['Enums']['charge_type']
export type ClientSource = Database['public']['Enums']['client_source']
export type ClientType = Database['public']['Enums']['client_type']
export type DepositMethod = Database['public']['Enums']['deposit_method']
export type DiscountType = Database['public']['Enums']['discount_type']
export type DocType = Database['public']['Enums']['doc_type']
export type FinancingMode = Database['public']['Enums']['financing_mode']
export type GoalMetric = Database['public']['Enums']['goal_metric']
export type GoalPeriod = Database['public']['Enums']['goal_period']
export type GoalStatus = Database['public']['Enums']['goal_status']
export type HistoryType = Database['public']['Enums']['history_type']
export type InterestLevel = Database['public']['Enums']['interest_level']
export type PaymentMethod = Database['public']['Enums']['payment_method']
export type PaymentStatus = Database['public']['Enums']['payment_status']
export type PipelineStage = Database['public']['Enums']['pipeline_stage']
export type ProjectStatus = Database['public']['Enums']['project_status']
export type ReservationStatus = Database['public']['Enums']['reservation_status']
export type SaleStatus = Database['public']['Enums']['sale_status']
export type TaskStatus = Database['public']['Enums']['task_status']
export type TaskType = Database['public']['Enums']['task_type']
export type UnitStatus = Database['public']['Enums']['unit_status']
export type UnitSubtype = Database['public']['Enums']['unit_subtype']
export type UnitType = Database['public']['Enums']['unit_type']
export type UserRole = Database['public']['Enums']['user_role']
export type UserStatus = Database['public']['Enums']['user_status']
export type VisitStatus = Database['public']['Enums']['visit_status']
export type VisitType = Database['public']['Enums']['visit_type']

// Tables (Row shapes)
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
