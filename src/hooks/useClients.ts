import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { handleSupabaseError } from '@/lib/errors'
import { useTenant } from './useTenant'
import toast from 'react-hot-toast'
import type { Database, PipelineStage, ClientSource } from '@/types'

type ClientInsert = Database['public']['Tables']['clients']['Insert']
type ClientUpdate = Database['public']['Tables']['clients']['Update']

interface ClientFilters {
  stage?: PipelineStage
  source?: ClientSource
  agentId?: string
  search?: string
  isPriority?: boolean
}

export function useClients(filters?: ClientFilters) {
  const tenantId = useTenant()
  const qc = useQueryClient()

  const clientsQuery = useQuery({
    queryKey: ['clients', tenantId, filters],
    queryFn: async () => {
      let query = supabase
        .from('clients')
        .select('*, users!clients_agent_id_fkey(first_name, last_name)')
        .eq('tenant_id', tenantId)

      if (filters?.stage) query = query.eq('pipeline_stage', filters.stage)
      if (filters?.source) query = query.eq('source', filters.source)
      if (filters?.agentId) query = query.eq('agent_id', filters.agentId)
      if (filters?.isPriority) query = query.eq('is_priority', true)
      if (filters?.search) {
        query = query.or(`full_name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%,email.ilike.%${filters.search}%`)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) { handleSupabaseError(error); throw error }
      return data
    },
  })

  const clientByIdQuery = (id: string) =>
    useQuery({
      queryKey: ['clients', id],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('clients')
          .select('*, users!clients_agent_id_fkey(first_name, last_name)')
          .eq('id', id)
          .single()

        if (error) { handleSupabaseError(error); throw error }
        return data
      },
      enabled: !!id,
    })

  const createClient = useMutation({
    mutationFn: async (input: Omit<ClientInsert, 'tenant_id'>) => {
      const { data, error } = await supabase
        .from('clients')
        .insert({ ...input, tenant_id: tenantId })
        .select()
        .single()

      if (error) { handleSupabaseError(error); throw error }
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] })
      toast.success('Client ajouté avec succès')
    },
  })

  const updateClient = useMutation({
    mutationFn: async ({ id, ...input }: ClientUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('clients')
        .update(input)
        .eq('id', id)
        .select()
        .single()

      if (error) { handleSupabaseError(error); throw error }
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] })
      toast.success('Client mis à jour')
    },
  })

  const updateClientStage = useMutation({
    mutationFn: async ({ clientId, newStage }: { clientId: string; newStage: PipelineStage }) => {
      const { data, error } = await supabase
        .from('clients')
        .update({ pipeline_stage: newStage })
        .eq('id', clientId)
        .select()
        .single()

      // history log is handled by the DB trigger (log_stage_change)
      if (error) { handleSupabaseError(error); throw error }
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] })
      qc.invalidateQueries({ queryKey: ['history'] })
    },
  })

  return {
    clients: clientsQuery.data ?? [],
    isLoading: clientsQuery.isLoading,
    error: clientsQuery.error,
    refetch: clientsQuery.refetch,
    clientByIdQuery,
    createClient,
    updateClient,
    updateClientStage,
  }
}
