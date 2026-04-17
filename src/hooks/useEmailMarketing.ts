import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { handleSupabaseError } from '@/lib/errors'
import type { EmailBlock } from '@/lib/blocksToHtml'
import type { Json, PipelineStage, ClientSource } from '@/types/database'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface EmailTemplate {
  id: string
  name: string
  subject: string
  blocks: EmailBlock[]
  html_cache: string | null
  created_at: string
  updated_at: string
}

export interface EmailCampaign {
  id: string
  template_id: string | null
  name: string
  subject: string
  status: string
  segment_rules: SegmentRules
  scheduled_at: string | null
  sent_at: string | null
  total_recipients: number
  total_sent: number
  total_opened: number
  total_clicked: number
  created_at: string
  email_templates?: { name: string } | null
}

export interface SegmentRules {
  pipeline_stages?: string[]
  sources?: string[]
  project_ids?: string[]
}

export interface CampaignRecipient {
  id: string
  campaign_id: string
  client_id: string | null
  email: string
  full_name: string | null
  status: string
  sent_at: string | null
  opened_at: string | null
  clicked_at: string | null
}

// ─── Templates ──────────────────────────────────────────────────────────────

export function useEmailTemplates() {
  return useQuery({
    queryKey: ['email-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_templates')
        .select('id, name, subject, blocks, html_cache, created_at, updated_at')
        .order('updated_at', { ascending: false })
      if (error) { handleSupabaseError(error); throw error }
      return (data ?? []).map((d): EmailTemplate => ({
        ...d,
        blocks: Array.isArray(d.blocks) ? (d.blocks as unknown as EmailBlock[]) : [],
      }))
    },
  })
}

export function useSaveTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (template: { id?: string; name: string; subject: string; blocks: EmailBlock[]; html_cache: string }) => {
      if (template.id) {
        const { error } = await supabase.from('email_templates')
          .update({
            name: template.name,
            subject: template.subject,
            blocks: template.blocks as unknown as Json,
            html_cache: template.html_cache,
            updated_at: new Date().toISOString(),
          })
          .eq('id', template.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('email_templates')
          .insert({
            name: template.name,
            subject: template.subject,
            blocks: template.blocks as unknown as Json,
            html_cache: template.html_cache,
          })
        if (error) throw error
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['email-templates'] }),
  })
}

export function useDeleteTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('email_templates').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['email-templates'] }),
  })
}

// ─── Campaigns ──────────────────────────────────────────────────────────────

export function useEmailCampaigns() {
  return useQuery({
    queryKey: ['email-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_campaigns')
        .select('id, template_id, name, subject, status, segment_rules, scheduled_at, sent_at, total_recipients, total_sent, total_opened, total_clicked, created_at, email_templates(name)')
        .order('created_at', { ascending: false })
      if (error) { handleSupabaseError(error); throw error }
      return (data ?? []).map((d): EmailCampaign => ({
        ...d,
        segment_rules: (d.segment_rules && typeof d.segment_rules === 'object' && !Array.isArray(d.segment_rules)
          ? (d.segment_rules as SegmentRules)
          : {}),
      }))
    },
  })
}

export function useSaveCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (campaign: {
      id?: string
      name: string
      subject: string
      template_id: string | null
      segment_rules: SegmentRules
      scheduled_at?: string | null
      status?: string
    }) => {
      if (campaign.id) {
        const { error } = await supabase.from('email_campaigns')
          .update({
            name: campaign.name,
            subject: campaign.subject,
            template_id: campaign.template_id,
            segment_rules: campaign.segment_rules as unknown as Json,
            scheduled_at: campaign.scheduled_at ?? null,
            status: campaign.status ?? 'draft',
          })
          .eq('id', campaign.id)
        if (error) throw error
        return campaign.id
      } else {
        const { data, error } = await supabase.from('email_campaigns')
          .insert({
            name: campaign.name,
            subject: campaign.subject,
            template_id: campaign.template_id,
            segment_rules: campaign.segment_rules as unknown as Json,
            scheduled_at: campaign.scheduled_at ?? null,
            status: campaign.status ?? 'draft',
          })
          .select('id')
          .single()
        if (error) throw error
        return data.id
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['email-campaigns'] }),
  })
}

// ─── Segment Preview ────────────────────────────────────────────────────────

export function useSegmentCount(rules: SegmentRules) {
  return useQuery({
    queryKey: ['segment-count', rules],
    queryFn: async () => {
      let query = supabase
        .from('clients')
        .select('id', { count: 'exact', head: true })
        .not('email', 'is', null)

      if (rules.pipeline_stages?.length) query = query.in('pipeline_stage', rules.pipeline_stages as PipelineStage[])
      if (rules.sources?.length) query = query.in('source', rules.sources as ClientSource[])
      // `clients` has no project_id; match interested_projects array instead.
      if (rules.project_ids?.length) query = query.overlaps('interested_projects', rules.project_ids)

      const { count, error } = await query
      if (error) throw error
      return count ?? 0
    },
    enabled: true,
  })
}

// ─── Campaign Recipients ────────────────────────────────────────────────────

export function useCampaignRecipients(campaignId: string | null) {
  return useQuery({
    queryKey: ['campaign-recipients', campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_campaign_recipients')
        .select('id, campaign_id, client_id, email, full_name, status, sent_at, opened_at, clicked_at')
        .eq('campaign_id', campaignId!)
        .order('sent_at', { ascending: false })
        .limit(500)
      if (error) throw error
      return (data ?? []) as CampaignRecipient[]
    },
    enabled: !!campaignId,
  })
}

// ─── Send Campaign ──────────────────────────────────────────────────────────

export function useSendCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (campaignId: string) => {
      const { data, error } = await supabase.functions.invoke('send-campaign', {
        body: { campaign_id: campaignId },
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['email-campaigns'] })
      qc.invalidateQueries({ queryKey: ['campaign-recipients'] })
    },
  })
}

// ─── Projects list (for segment builder) ────────────────────────────────────

export function useProjectsList() {
  return useQuery({
    queryKey: ['projects-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .eq('status', 'active')
        .order('name')
      if (error) throw error
      return data ?? []
    },
    enabled: true,
  })
}
