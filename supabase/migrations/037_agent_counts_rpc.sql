-- ─── 037_agent_counts_rpc.sql ───────────────────────────────────────────────
-- AgentsPage previously selected agent_id from every row of clients + sales
-- and counted client-side. On a populated tenant this transfers thousands of
-- rows just to compute two integers per agent. Move the aggregation into
-- Postgres so the frontend only ships a single small JSON payload.

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
