import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { handleSupabaseError } from '@/lib/errors'
import { useTenant } from './useTenant'
import toast from 'react-hot-toast'
import type { Database } from '@/types'

type ProjectInsert = Database['public']['Tables']['projects']['Insert']
type ProjectUpdate = Database['public']['Tables']['projects']['Update']

export function useProjects() {
  const tenantId = useTenant()
  const qc = useQueryClient()

  const projectsQuery = useQuery({
    queryKey: ['projects', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })

      if (error) { handleSupabaseError(error); throw error }
      return data
    },
  })

  const createProject = useMutation({
    mutationFn: async (input: Omit<ProjectInsert, 'tenant_id'>) => {
      const { data, error } = await supabase
        .from('projects')
        .insert({ ...input, tenant_id: tenantId })
        .select()
        .single()

      if (error) { handleSupabaseError(error); throw error }
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      toast.success('Projet cree avec succes')
    },
  })

  const updateProject = useMutation({
    mutationFn: async ({ id, ...input }: ProjectUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('projects')
        .update(input)
        .eq('id', id)
        .select()
        .single()

      if (error) { handleSupabaseError(error); throw error }
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      toast.success('Projet mis a jour')
    },
  })

  const deleteProject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id)

      if (error) { handleSupabaseError(error); throw error }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      toast.success('Projet supprime')
    },
  })

  return {
    projects: projectsQuery.data ?? [],
    isLoading: projectsQuery.isLoading,
    error: projectsQuery.error,
    refetch: projectsQuery.refetch,
    createProject,
    updateProject,
    deleteProject,
  }
}

/** Standalone hook for fetching a single project by ID (defense-in-depth with tenant_id) */
export function useProjectById(id: string, tenantId: string) {
  return useQuery({
    queryKey: ['projects', id, tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*, units(*)')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single()

      if (error) { handleSupabaseError(error); throw error }
      return data
    },
    enabled: !!id && !!tenantId,
  })
}
