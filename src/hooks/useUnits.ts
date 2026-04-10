import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { handleSupabaseError } from '@/lib/errors'
import { useTenant } from './useTenant'
import toast from 'react-hot-toast'
import type { Database, UnitStatus, UnitType } from '@/types'

type UnitInsert = Database['public']['Tables']['units']['Insert']
type UnitUpdate = Database['public']['Tables']['units']['Update']

interface UnitFilters {
  projectId?: string
  status?: UnitStatus
  type?: string
}

export function useUnits(filters?: UnitFilters) {
  const tenantId = useTenant()
  const qc = useQueryClient()

  const unitsQuery = useQuery({
    queryKey: ['units', tenantId, filters],
    queryFn: async () => {
      let query = supabase
        .from('units')
        .select('*, projects(name, code)')
        .eq('tenant_id', tenantId)

      if (filters?.projectId) query = query.eq('project_id', filters.projectId)
      if (filters?.status) query = query.eq('status', filters.status)
      if (filters?.type) query = query.eq('type', filters.type as UnitType)

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) { handleSupabaseError(error); throw error }
      return data
    },
  })

  const unitsByProject = (projectId: string) =>
    useQuery({
      queryKey: ['units', 'project', projectId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('units')
          .select('*')
          .eq('project_id', projectId)
          .order('code')

        if (error) { handleSupabaseError(error); throw error }
        return data
      },
      enabled: !!projectId,
    })

  const createUnit = useMutation({
    mutationFn: async (input: Omit<UnitInsert, 'tenant_id'>) => {
      const { data, error } = await supabase
        .from('units')
        .insert({ ...input, tenant_id: tenantId })
        .select()
        .single()

      if (error) { handleSupabaseError(error); throw error }
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['units'] })
      toast.success('Unité créée avec succès')
    },
  })

  const updateUnit = useMutation({
    mutationFn: async ({ id, ...input }: UnitUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('units')
        .update(input)
        .eq('id', id)
        .select()
        .single()

      if (error) { handleSupabaseError(error); throw error }
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['units'] })
      toast.success('Unité mise à jour')
    },
  })

  const updateUnitStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: UnitStatus }) => {
      const { data, error } = await supabase
        .from('units')
        .update({ status })
        .eq('id', id)
        .select()
        .single()

      if (error) { handleSupabaseError(error); throw error }
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['units'] })
    },
  })

  return {
    units: unitsQuery.data ?? [],
    isLoading: unitsQuery.isLoading,
    error: unitsQuery.error,
    refetch: unitsQuery.refetch,
    unitsByProject,
    createUnit,
    updateUnit,
    updateUnitStatus,
  }
}
