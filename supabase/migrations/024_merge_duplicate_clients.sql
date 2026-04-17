-- ================================================
-- CRM NOUREDDINE — File 24/N
-- One-shot merge of duplicate client fiches. Run ONCE.
--
-- SAFE-BY-CONSTRUCTION
--   * Wrapped in a single implicit transaction (any RAISE EXCEPTION
--     rolls back the entire thing).
--   * Losers are archived into audit_trail as JSONB BEFORE deletion
--     — zero data loss, full traceability.
--   * Child rows (visits / reservations / sales / tasks / history /
--     charges / documents) are reassigned to the winner BEFORE the
--     loser is deleted. Because the FK is ON DELETE CASCADE, this
--     order matters: migrate first, delete second.
--
-- PHASE A — Delete the 3 KARD AHMED test fiches entirely (542766068).
--           ON DELETE CASCADE takes care of all children.
-- PHASE B — For every other duplicate group (same phone_normalized):
--           pick the winner (most advanced stage; tie → oldest),
--           merge NULL fields from losers, reassign children, archive
--           losers in audit_trail, delete losers.
--
-- PREREQ
--   * Migration 023 applied (adds phone_normalized column).
--   * Preview file reviewed (supabase/reports/merge_duplicates_preview.sql).
-- ================================================

DO $$
DECLARE
  v_kard_count  INT;
  v_groups      INT;
  v_losers      INT := 0;
  v_winner_id   UUID;
  v_loser_ids   UUID[];
  v_grp         RECORD;
BEGIN
  -- ─────────── PHASE A : KARD AHMED (test data) ───────────
  SELECT COUNT(*) INTO v_kard_count
    FROM clients WHERE phone_normalized = '542766068';

  DELETE FROM clients WHERE phone_normalized = '542766068';

  RAISE NOTICE 'Phase A: supprimé % fiches KARD AHMED (+ enfants via CASCADE)', v_kard_count;

  -- ─────────── PHASE B : merge same-phone groups ───────────
  FOR v_grp IN
    SELECT phone_normalized
      FROM clients
     WHERE phone_normalized IS NOT NULL
     GROUP BY phone_normalized
    HAVING COUNT(*) > 1
  LOOP
    -- Determine winner: most advanced stage, tie → oldest.
    SELECT c.id INTO v_winner_id
      FROM clients c
     WHERE c.phone_normalized = v_grp.phone_normalized
     ORDER BY
       CASE c.pipeline_stage::text
         WHEN 'vente'            THEN 9
         WHEN 'reservation'      THEN 8
         WHEN 'negociation'      THEN 7
         WHEN 'visite_terminee'  THEN 6
         WHEN 'visite_confirmee' THEN 5
         WHEN 'visite_a_gerer'   THEN 4
         WHEN 'accueil'          THEN 3
         WHEN 'relancement'      THEN 2
         WHEN 'perdue'           THEN 1
         ELSE 0
       END DESC,
       c.created_at ASC
     LIMIT 1;

    -- Collect losers.
    SELECT ARRAY_AGG(id) INTO v_loser_ids
      FROM clients
     WHERE phone_normalized = v_grp.phone_normalized
       AND id <> v_winner_id;

    -- Backup losers to audit_trail as JSONB snapshots.
    INSERT INTO audit_trail (user_id, action, table_name, record_id, old_data, new_data)
    SELECT
      c.agent_id,
      'merge_duplicate_deleted',
      'clients',
      c.id::text,
      to_jsonb(c),
      jsonb_build_object('merged_into', v_winner_id)
      FROM clients c
     WHERE c.id = ANY(v_loser_ids);

    -- Backfill NULL fields of the winner from the losers.
    UPDATE clients w SET
      nin_cin          = COALESCE(w.nin_cin,          (SELECT l.nin_cin          FROM clients l WHERE l.id = ANY(v_loser_ids) AND l.nin_cin          IS NOT NULL LIMIT 1)),
      email            = COALESCE(w.email,            (SELECT l.email            FROM clients l WHERE l.id = ANY(v_loser_ids) AND l.email            IS NOT NULL LIMIT 1)),
      confirmed_budget = COALESCE(w.confirmed_budget, (SELECT l.confirmed_budget FROM clients l WHERE l.id = ANY(v_loser_ids) AND l.confirmed_budget IS NOT NULL LIMIT 1)),
      birth_date       = COALESCE(w.birth_date,       (SELECT l.birth_date       FROM clients l WHERE l.id = ANY(v_loser_ids) AND l.birth_date       IS NOT NULL LIMIT 1)),
      address          = COALESCE(w.address,          (SELECT l.address          FROM clients l WHERE l.id = ANY(v_loser_ids) AND l.address          IS NOT NULL LIMIT 1)),
      profession       = COALESCE(w.profession,       (SELECT l.profession       FROM clients l WHERE l.id = ANY(v_loser_ids) AND l.profession       IS NOT NULL LIMIT 1)),
      notes            = COALESCE(w.notes,            (SELECT l.notes            FROM clients l WHERE l.id = ANY(v_loser_ids) AND l.notes            IS NOT NULL LIMIT 1)),
      last_contact_at  = GREATEST(
        w.last_contact_at,
        (SELECT MAX(l.last_contact_at) FROM clients l WHERE l.id = ANY(v_loser_ids))
      )
    WHERE w.id = v_winner_id;

    -- Reassign children (ALL tables that reference clients.id).
    UPDATE visits        SET client_id = v_winner_id WHERE client_id = ANY(v_loser_ids);
    UPDATE reservations  SET client_id = v_winner_id WHERE client_id = ANY(v_loser_ids);
    UPDATE sales         SET client_id = v_winner_id WHERE client_id = ANY(v_loser_ids);
    UPDATE charges       SET client_id = v_winner_id WHERE client_id = ANY(v_loser_ids);
    UPDATE history       SET client_id = v_winner_id WHERE client_id = ANY(v_loser_ids);
    UPDATE documents     SET client_id = v_winner_id WHERE client_id = ANY(v_loser_ids);
    UPDATE client_tasks  SET client_id = v_winner_id WHERE client_id = ANY(v_loser_ids);
    -- calls / emails / sent_messages_log: SET NULL on delete, but we
    -- prefer to preserve the link by reassigning explicitly.
    UPDATE calls              SET client_id = v_winner_id WHERE client_id = ANY(v_loser_ids);
    UPDATE emails             SET client_id = v_winner_id WHERE client_id = ANY(v_loser_ids);
    UPDATE sent_messages_log  SET client_id = v_winner_id WHERE client_id = ANY(v_loser_ids);
    -- units have a SET NULL on delete, but if a loser had a reserved
    -- unit we point it at the winner instead.
    UPDATE units         SET client_id = v_winner_id WHERE client_id = ANY(v_loser_ids);

    -- Delete losers. At this point no child row references them.
    DELETE FROM clients WHERE id = ANY(v_loser_ids);

    v_losers := v_losers + COALESCE(array_length(v_loser_ids, 1), 0);
  END LOOP;

  SELECT COUNT(*) INTO v_groups
    FROM clients
   WHERE phone_normalized IS NOT NULL
   GROUP BY phone_normalized
  HAVING COUNT(*) > 1;

  RAISE NOTICE 'Phase B: fusionné % fiches perdantes dans leurs survivants', v_losers;
  RAISE NOTICE 'Groupes de doublons restants: %', COALESCE(v_groups, 0);
END $$;


-- Sanity check: there should be zero duplicate groups now.
SELECT
  COUNT(*)                                                        AS total_clients,
  (SELECT COUNT(DISTINCT phone_normalized) FROM clients
    WHERE phone_normalized IS NOT NULL)                           AS distinct_phones,
  (SELECT COUNT(*) FROM (
     SELECT 1 FROM clients
      WHERE phone_normalized IS NOT NULL
     GROUP BY phone_normalized HAVING COUNT(*) > 1
   ) x)                                                           AS remaining_duplicate_groups
FROM clients;
