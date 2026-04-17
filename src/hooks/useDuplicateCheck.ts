import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface DuplicateMatch {
  id: string
  full_name: string
  phone: string
  pipeline_stage: string
  agent_id: string | null
  agent_name: string | null
  match_score: number
  match_reason: 'exact_phone' | 'fuzzy_phone' | 'fuzzy_name'
}

function normalizePhone(raw: string): string {
  // Strip spaces, dashes, parentheses; keep last 9 digits (DZ local number).
  const digits = raw.replace(/\D/g, '')
  return digits.slice(-9)
}

function normalizeName(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  const curr = new Array(b.length + 1).fill(0)
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost)
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j]
  }
  return prev[b.length]
}

/**
 * Look up potential duplicates of a new lead. We check three signals:
 *
 *   1. Exact phone match on the normalized 9-digit local number.
 *   2. Fuzzy phone match — last 8 digits match (covers typos on the
 *      first digit, common with walk-ins writing their number on paper).
 *   3. Fuzzy name match — edit distance <= 2 on the normalized name,
 *      but only when the phone also shares a prefix (avoids Karim A. in
 *      Oran being flagged as duplicate of Karim B. in Alger).
 *
 * RLS lets reception read every client, so this works from the front
 * desk. For an agent account, the query naturally filters to their own
 * book.
 */
export function useDuplicateCheck(fullName: string, phone: string, enabled: boolean) {
  const debouncedKey = `${normalizeName(fullName)}|${normalizePhone(phone)}`

  return useQuery({
    queryKey: ['duplicate-check', debouncedKey],
    enabled: enabled && (fullName.length >= 3 || phone.length >= 6),
    queryFn: async (): Promise<DuplicateMatch[]> => {
      const phoneNorm = normalizePhone(phone)
      const nameNorm = normalizeName(fullName)
      if (phoneNorm.length < 6 && nameNorm.length < 3) return []

      // Pull candidates cheaply using an ILIKE on the last 6 phone
      // digits (covers fuzzy phone). Names we filter client-side.
      const phoneTail = phoneNorm.slice(-6)
      const { data, error } = await supabase
        .from('clients')
        .select('id, full_name, phone, pipeline_stage, agent_id, users!clients_agent_id_fkey(first_name, last_name)')
        .or(phoneTail ? `phone.ilike.%${phoneTail}%` : `full_name.ilike.%${nameNorm.split(' ')[0]}%`)
        .limit(20)

      if (error) return []

      const rows = (data ?? []) as Array<{
        id: string; full_name: string; phone: string; pipeline_stage: string
        agent_id: string | null
        users: { first_name: string; last_name: string } | null
      }>

      const matches: DuplicateMatch[] = []
      for (const r of rows) {
        const rPhone = normalizePhone(r.phone)
        const rName = normalizeName(r.full_name)
        let score = 0
        let reason: DuplicateMatch['match_reason'] | null = null

        if (phoneNorm && rPhone === phoneNorm) {
          score = 100
          reason = 'exact_phone'
        } else if (phoneNorm.length >= 8 && rPhone.slice(-8) === phoneNorm.slice(-8)) {
          score = 80
          reason = 'fuzzy_phone'
        } else if (nameNorm.length >= 4 && rName) {
          const dist = levenshtein(nameNorm, rName)
          const maxLen = Math.max(nameNorm.length, rName.length)
          const similarity = 1 - dist / maxLen
          if (similarity >= 0.85) {
            score = Math.round(similarity * 70)
            reason = 'fuzzy_name'
          }
        }

        if (reason) {
          const agent = r.users
          matches.push({
            id: r.id,
            full_name: r.full_name,
            phone: r.phone,
            pipeline_stage: r.pipeline_stage,
            agent_id: r.agent_id,
            agent_name: agent ? `${agent.first_name} ${agent.last_name}` : null,
            match_score: score,
            match_reason: reason,
          })
        }
      }
      matches.sort((a, b) => b.match_score - a.match_score)
      return matches.slice(0, 5)
    },
    staleTime: 30_000,
  })
}
