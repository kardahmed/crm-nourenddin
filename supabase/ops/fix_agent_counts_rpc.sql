-- ============================================================================
-- FIX — "Could not find the function public.agent_counts without parameters
--        in the schema cache" (page Agents)
--
-- Cause : la fonction RPC public.agent_counts() (migration 037) n'est pas
--         présente sur cette base — ou le cache PostgREST est périmé.
--         Le frontend appelle supabase.rpc('agent_counts'), l'appel échoue,
--         et la page Agents se vide entièrement ("Aucun agent").
--
-- À exécuter dans le SQL Editor du projet PRODUCTION. Idempotent.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.agent_counts()
RETURNS TABLE (
  agent_id      uuid,
  clients_count integer,
  sales_count   integer
)
LANGUAGE sql
SECURITY INVOKER
STABLE
AS $$
  WITH c AS (
    SELECT agent_id, COUNT(*)::int AS clients_count
    FROM clients
    WHERE agent_id IS NOT NULL
    GROUP BY agent_id
  ),
  s AS (
    SELECT agent_id, COUNT(*)::int AS sales_count
    FROM sales
    WHERE status = 'active'
    GROUP BY agent_id
  )
  SELECT
    u.id AS agent_id,
    COALESCE(c.clients_count, 0) AS clients_count,
    COALESCE(s.sales_count, 0)   AS sales_count
  FROM users u
  LEFT JOIN c ON c.agent_id = u.id
  LEFT JOIN s ON s.agent_id = u.id;
$$;

GRANT EXECUTE ON FUNCTION public.agent_counts() TO authenticated;

-- Force PostgREST à recharger son cache de schéma pour exposer le RPC tout de suite.
NOTIFY pgrst, 'reload schema';

-- Vérification : doit renvoyer une ligne par utilisateur.
SELECT * FROM public.agent_counts();
