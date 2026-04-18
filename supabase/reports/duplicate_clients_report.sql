-- ================================================
-- DUPLICATE CLIENTS — READ-ONLY DIAGNOSTIC
--
-- PURPOSE
--   Surfaces every group of clients that share the same normalized
--   phone number. NOTHING IS MODIFIED — copy-paste the queries below
--   into the Supabase SQL Editor and review the output before we run
--   the merge migration.
--
-- PREREQUISITE
--   Migration 023_clients_phone_normalized.sql must be applied first
--   (adds the `phone_normalized` column and index).
--
-- USAGE
--   Run each numbered query separately.
-- ================================================


-- ─────────────────────────────────────────────────
-- QUERY 1 — Duplicate groups summary
-- One row per duplicate group: normalized phone + how many fiches
-- share it + list of stages + list of owning agents.
-- ─────────────────────────────────────────────────
SELECT
  c.phone_normalized,
  COUNT(*)                                     AS nb_fiches,
  ARRAY_AGG(c.full_name ORDER BY c.created_at) AS noms,
  ARRAY_AGG(DISTINCT c.pipeline_stage)         AS stages,
  ARRAY_AGG(DISTINCT u.first_name || ' ' || u.last_name) AS agents,
  MIN(c.created_at)                            AS premiere_creation,
  MAX(c.created_at)                            AS derniere_creation
FROM public.clients c
LEFT JOIN public.users u ON u.id = c.agent_id
WHERE c.phone_normalized IS NOT NULL
GROUP BY c.phone_normalized
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC, MIN(c.created_at) ASC;


-- ─────────────────────────────────────────────────
-- QUERY 2 — Full detail per fiche inside each duplicate group
-- For each dup group, shows every single fiche with everything we
-- need to decide which one to keep (most advanced pipeline stage,
-- most sales, oldest/newest, etc.).
-- ─────────────────────────────────────────────────
WITH dupes AS (
  SELECT phone_normalized
  FROM public.clients
  WHERE phone_normalized IS NOT NULL
  GROUP BY phone_normalized
  HAVING COUNT(*) > 1
)
SELECT
  c.phone_normalized,
  c.id                  AS client_id,
  c.full_name,
  c.phone               AS phone_as_typed,
  c.nin_cin,
  c.pipeline_stage,
  c.source,
  u.first_name || ' ' || u.last_name AS agent,
  c.created_at,
  c.last_contact_at,
  (SELECT COUNT(*) FROM public.visits       v WHERE v.client_id = c.id) AS nb_visits,
  (SELECT COUNT(*) FROM public.reservations r WHERE r.client_id = c.id) AS nb_reservations,
  (SELECT COUNT(*) FROM public.sales        s WHERE s.client_id = c.id) AS nb_sales,
  (SELECT COUNT(*) FROM public.client_tasks t WHERE t.client_id = c.id) AS nb_tasks,
  (SELECT COUNT(*) FROM public.history      h WHERE h.client_id = c.id) AS nb_history_entries
FROM public.clients c
JOIN dupes d ON d.phone_normalized = c.phone_normalized
LEFT JOIN public.users u ON u.id = c.agent_id
ORDER BY c.phone_normalized, c.created_at ASC;


-- ─────────────────────────────────────────────────
-- QUERY 3 — Cross-agent duplicates (the commission problem)
-- ONLY the duplicate groups where the SAME number belongs to TWO OR
-- MORE different agents. These are the riskiest rows — they're what
-- the user was worried about.
-- ─────────────────────────────────────────────────
SELECT
  c.phone_normalized,
  COUNT(DISTINCT c.agent_id) AS nb_agents,
  ARRAY_AGG(DISTINCT u.first_name || ' ' || u.last_name ORDER BY u.first_name || ' ' || u.last_name) AS agents,
  ARRAY_AGG(c.full_name) AS noms
FROM public.clients c
LEFT JOIN public.users u ON u.id = c.agent_id
WHERE c.phone_normalized IS NOT NULL
GROUP BY c.phone_normalized
HAVING COUNT(DISTINCT c.agent_id) > 1
ORDER BY nb_agents DESC;


-- ─────────────────────────────────────────────────
-- QUERY 4 — CIN duplicates (second axis — catches same person, new
-- phone number)
-- ─────────────────────────────────────────────────
SELECT
  c.nin_cin,
  COUNT(*) AS nb_fiches,
  ARRAY_AGG(c.full_name ORDER BY c.created_at) AS noms,
  ARRAY_AGG(DISTINCT u.first_name || ' ' || u.last_name) AS agents
FROM public.clients c
LEFT JOIN public.users u ON u.id = c.agent_id
WHERE c.nin_cin IS NOT NULL AND c.nin_cin <> ''
GROUP BY c.nin_cin
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;


-- ─────────────────────────────────────────────────
-- QUERY 5 — Grand total
-- ─────────────────────────────────────────────────
SELECT
  (SELECT COUNT(*) FROM public.clients)                           AS total_fiches,
  (SELECT COUNT(DISTINCT phone_normalized)
     FROM public.clients WHERE phone_normalized IS NOT NULL)      AS distinct_phones,
  (SELECT COUNT(*) FROM public.clients c
     WHERE c.phone_normalized IN (
       SELECT phone_normalized FROM public.clients
       WHERE phone_normalized IS NOT NULL
       GROUP BY phone_normalized HAVING COUNT(*) > 1
     ))                                                           AS fiches_en_doublon,
  (SELECT COUNT(*) FROM public.clients
     WHERE phone_normalized IS NULL OR phone_normalized = '')     AS fiches_sans_phone;
