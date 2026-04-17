-- ================================================
-- MERGE DUPLICATES — READ-ONLY PREVIEW
--
-- PURPOSE
--   Shows EXACTLY what the forthcoming merge migration will do:
--     * the winner of each duplicate group (kept)
--     * the losers (archived in audit_trail + deleted)
--     * how many child records will be reassigned
--   NOTHING IS MODIFIED. Review, then run 024_merge_duplicate_clients.sql.
--
-- RULE
--   Winner = fiche with the most advanced pipeline stage.
--     vente > reservation > negociation > visite_terminee >
--     visite_confirmee > visite_a_gerer > accueil > relancement > perdue
--   Tie-break: MIN(created_at) — the oldest fiche.
--
-- SPECIAL CASES
--   * phone_normalized = '542766068' (KARD AHMED) → ALL 3 fiches
--     deleted entirely (test data, no merge).
-- ================================================

WITH stage_rank AS (
  SELECT * FROM (VALUES
    ('vente',            9),
    ('reservation',      8),
    ('negociation',      7),
    ('visite_terminee',  6),
    ('visite_confirmee', 5),
    ('visite_a_gerer',   4),
    ('accueil',          3),
    ('relancement',      2),
    ('perdue',           1)
  ) AS t(stage, rank)
),
ranked AS (
  SELECT
    c.id,
    c.phone_normalized,
    c.full_name,
    c.pipeline_stage,
    c.created_at,
    u.first_name || ' ' || u.last_name AS agent,
    ROW_NUMBER() OVER (
      PARTITION BY c.phone_normalized
      ORDER BY COALESCE(sr.rank, 0) DESC, c.created_at ASC
    ) AS rn
  FROM clients c
  LEFT JOIN users u ON u.id = c.agent_id
  LEFT JOIN stage_rank sr ON sr.stage = c.pipeline_stage::text
  WHERE c.phone_normalized IS NOT NULL
    AND c.phone_normalized <> '542766068'  -- KARD AHMED handled separately
    AND c.phone_normalized IN (
      SELECT phone_normalized FROM clients
      WHERE phone_normalized IS NOT NULL
      GROUP BY phone_normalized HAVING COUNT(*) > 1
    )
)
SELECT
  r.phone_normalized,
  CASE WHEN r.rn = 1 THEN '✅ GARDE' ELSE '❌ SUPPRIME' END AS action,
  r.full_name,
  r.pipeline_stage,
  r.agent,
  r.created_at,
  CASE WHEN r.rn = 1 THEN
    (SELECT COUNT(*) FROM visits       WHERE client_id IN (SELECT id FROM ranked rr WHERE rr.phone_normalized = r.phone_normalized AND rr.rn > 1)) ||
    ' visites, ' ||
    (SELECT COUNT(*) FROM reservations WHERE client_id IN (SELECT id FROM ranked rr WHERE rr.phone_normalized = r.phone_normalized AND rr.rn > 1)) ||
    ' réservations, ' ||
    (SELECT COUNT(*) FROM sales        WHERE client_id IN (SELECT id FROM ranked rr WHERE rr.phone_normalized = r.phone_normalized AND rr.rn > 1)) ||
    ' ventes, ' ||
    (SELECT COUNT(*) FROM client_tasks WHERE client_id IN (SELECT id FROM ranked rr WHERE rr.phone_normalized = r.phone_normalized AND rr.rn > 1)) ||
    ' tâches, ' ||
    (SELECT COUNT(*) FROM history      WHERE client_id IN (SELECT id FROM ranked rr WHERE rr.phone_normalized = r.phone_normalized AND rr.rn > 1)) ||
    ' historique'
  ELSE NULL END AS enfants_a_migrer_vers_moi
FROM ranked r
ORDER BY r.phone_normalized, r.rn;


-- Résumé KARD AHMED (test data)
SELECT
  '🗑️ SUPPRESSION TOTALE' AS action,
  c.id,
  c.full_name,
  c.pipeline_stage,
  u.first_name || ' ' || u.last_name AS agent,
  (SELECT COUNT(*) FROM visits       v WHERE v.client_id = c.id) AS nb_visits,
  (SELECT COUNT(*) FROM reservations r WHERE r.client_id = c.id) AS nb_reservations,
  (SELECT COUNT(*) FROM sales        s WHERE s.client_id = c.id) AS nb_sales,
  (SELECT COUNT(*) FROM client_tasks t WHERE t.client_id = c.id) AS nb_tasks
FROM clients c
LEFT JOIN users u ON u.id = c.agent_id
WHERE c.phone_normalized = '542766068';
