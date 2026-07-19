-- ═══════════════════════════════════════════════════════════════
-- PR2A — Tests SQL du schéma d'expansion Réception V2 (migration 040)
--
-- À exécuter sur une base où la migration 040 est appliquée (base de test
-- locale, branche Supabase, ou CI — PAS la production). Le script insère des
-- fixtures minimales dans une transaction et ROLLBACK à la fin : rien n'est
-- persisté. Il échoue bruyamment (RAISE EXCEPTION) à la première assertion
-- fausse ; sinon il affiche 'PR2A SCHEMA TESTS: ALL PASS'.
--
-- Couvre : enums, colonnes additives, conservation des colonnes legacy,
-- invariants CHECK des événements, monotonie d'event_sequence, contraintes
-- d'idempotence, append-only (UPDATE/DELETE bloqués), et absence d'accès
-- direct des rôles applicatifs.
-- ═══════════════════════════════════════════════════════════════

BEGIN;

DO $$
DECLARE
  v_a UUID;
  v_b UUID;
  v_seq1 BIGINT;
  v_seq2 BIGINT;
  v_id UUID;
  v_failed BOOLEAN;
BEGIN
  -- ── Fixtures : deux agents (réutilise l'existant, sinon insère id seul) ──
  SELECT id INTO v_a FROM users ORDER BY id LIMIT 1;
  SELECT id INTO v_b FROM users WHERE id <> v_a ORDER BY id LIMIT 1;
  IF v_a IS NULL THEN v_a := gen_random_uuid(); INSERT INTO users (id) VALUES (v_a); END IF;
  IF v_b IS NULL THEN v_b := gen_random_uuid(); INSERT INTO users (id) VALUES (v_b); END IF;

  -- ── 1. Enums créés avec les bonnes valeurs ──
  ASSERT (SELECT array_agg(e.enumlabel::text ORDER BY e.enumsortorder)
          FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid
          WHERE t.typname='assignment_status')
         = ARRAY['unassigned','assigned','capacity_exhausted'],
    'enum assignment_status invalide';
  ASSERT (SELECT count(*) FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid
          WHERE t.typname='assignment_method') = 8, 'enum assignment_method: 8 valeurs attendues';
  ASSERT EXISTS (SELECT 1 FROM pg_type WHERE typname='assignment_classification_source'),
    'enum assignment_classification_source manquant';

  -- ── 2. Colonnes additives présentes sur clients ──
  ASSERT (SELECT count(*) FROM information_schema.columns
          WHERE table_name='clients' AND column_name IN
          ('assignment_status','current_assignment_method','assignment_classification_source',
           'current_assigned_at','current_assigned_by')) = 5,
    'colonnes clients additives manquantes';

  -- ── 3. Colonnes legacy CONSERVÉES ──
  ASSERT (SELECT count(*) FROM information_schema.columns
          WHERE table_name='clients' AND column_name IN ('assigned_at','assigned_by')) = 2,
    'assigned_at / assigned_by ne doivent pas être supprimées en PR2A';

  -- ── 4. Insertion d'un événement RR valide ──
  INSERT INTO reception_assignment_events
    (client_id, event_type, new_agent_id, assignment_status, assignment_method,
     classification_source, counts_toward_round_robin, actor_id,
     source_snapshot, client_label_snapshot, occurred_at)
  VALUES (gen_random_uuid(), 'dispatched', v_a, 'assigned', 'round_robin',
          'native_v2', TRUE, v_a, 'reception', 'Client Test', now());

  -- ── 5. Rejet d'un dispatch sans agent ──
  v_failed := FALSE;
  BEGIN
    INSERT INTO reception_assignment_events
      (client_id, event_type, new_agent_id, assignment_status, assignment_method,
       classification_source, counts_toward_round_robin, source_snapshot,
       client_label_snapshot, occurred_at)
    VALUES (gen_random_uuid(), 'dispatched', NULL, 'assigned', 'round_robin',
            'native_v2', TRUE, 'reception', 'X', now());
  EXCEPTION WHEN check_violation THEN v_failed := TRUE; END;
  ASSERT v_failed, 'un dispatch sans agent aurait dû être rejeté';

  -- ── 6. Rejet d'un manuel compté dans le RR ──
  v_failed := FALSE;
  BEGIN
    INSERT INTO reception_assignment_events
      (client_id, event_type, new_agent_id, assignment_status, assignment_method,
       classification_source, counts_toward_round_robin, reason, source_snapshot,
       client_label_snapshot, occurred_at)
    VALUES (gen_random_uuid(), 'assigned_manual', v_a, 'assigned', 'manual',
            'native_v2', TRUE, 'motif', 'reception', 'X', now());
  EXCEPTION WHEN check_violation THEN v_failed := TRUE; END;
  ASSERT v_failed, 'un manuel compté dans le RR aurait dû être rejeté';

  -- ── 7. Rejet d'un capacity_exhausted avec agent ──
  v_failed := FALSE;
  BEGIN
    INSERT INTO reception_assignment_events
      (client_id, event_type, new_agent_id, assignment_status, assignment_method,
       classification_source, counts_toward_round_robin, reason, source_snapshot,
       client_label_snapshot, occurred_at)
    VALUES (gen_random_uuid(), 'capacity_exhausted', v_a, 'capacity_exhausted', NULL,
            'native_v2', FALSE, 'capacity_exhausted', 'reception', 'X', now());
  EXCEPTION WHEN check_violation THEN v_failed := TRUE; END;
  ASSERT v_failed, 'un capacity_exhausted avec agent aurait dû être rejeté';

  -- Un capacity_exhausted correct est accepté
  INSERT INTO reception_assignment_events
    (client_id, event_type, new_agent_id, assignment_status, assignment_method,
     classification_source, counts_toward_round_robin, reason, source_snapshot,
     client_label_snapshot, occurred_at)
  VALUES (gen_random_uuid(), 'capacity_exhausted', NULL, 'capacity_exhausted', NULL,
          'native_v2', FALSE, 'capacity_exhausted', 'reception', 'X', now());

  -- ── 8. Rejet d'une réassignation sans raison ──
  v_failed := FALSE;
  BEGIN
    INSERT INTO reception_assignment_events
      (client_id, event_type, previous_agent_id, new_agent_id, assignment_status,
       assignment_method, classification_source, source_snapshot,
       client_label_snapshot, occurred_at)
    VALUES (gen_random_uuid(), 'reassigned', v_a, v_b, 'assigned', 'reassignment',
            'native_v2', 'reception', 'X', now());
  EXCEPTION WHEN check_violation THEN v_failed := TRUE; END;
  ASSERT v_failed, 'une réassignation sans raison aurait dû être rejetée';

  -- ── 9. Rejet d'un self_assigned où acteur <> agent ──
  v_failed := FALSE;
  BEGIN
    INSERT INTO reception_assignment_events
      (client_id, event_type, new_agent_id, assignment_status, assignment_method,
       classification_source, actor_id, source_snapshot, client_label_snapshot, occurred_at)
    VALUES (gen_random_uuid(), 'lead_created', v_a, 'assigned', 'self_assigned',
            'native_v2', v_b, 'agent_workspace', 'X', now());
  EXCEPTION WHEN check_violation THEN v_failed := TRUE; END;
  ASSERT v_failed, 'un self_assigned avec acteur <> agent aurait dû être rejeté';

  -- Un self_assigned correct (acteur = agent) est accepté
  INSERT INTO reception_assignment_events
    (client_id, event_type, new_agent_id, assignment_status, assignment_method,
     classification_source, actor_id, source_snapshot, client_label_snapshot, occurred_at)
  VALUES (gen_random_uuid(), 'lead_created', v_a, 'assigned', 'self_assigned',
          'native_v2', v_a, 'agent_workspace', 'X', now());

  -- ── 10. event_sequence monotone et unique ──
  INSERT INTO reception_assignment_events
    (client_id, event_type, assignment_status, classification_source,
     source_snapshot, client_label_snapshot, occurred_at)
  VALUES (gen_random_uuid(), 'lead_created', 'unassigned', 'native_v2', 'reception', 'A', now())
  RETURNING event_sequence INTO v_seq1;
  INSERT INTO reception_assignment_events
    (client_id, event_type, assignment_status, classification_source,
     source_snapshot, client_label_snapshot, occurred_at)
  VALUES (gen_random_uuid(), 'lead_created', 'unassigned', 'native_v2', 'reception', 'B', now())
  RETURNING event_sequence INTO v_seq2;
  ASSERT v_seq2 > v_seq1, 'event_sequence doit être strictement croissant';

  -- ── 11. Contraintes idempotency_operations ──
  -- valide in_progress
  INSERT INTO idempotency_operations
    (operation_type, idempotency_key, actor_id, request_hash, status, resource_type)
  VALUES ('create_and_dispatch', gen_random_uuid(), v_a, 'h1', 'in_progress', 'client');
  -- completed sans response → rejet
  v_failed := FALSE;
  BEGIN
    INSERT INTO idempotency_operations
      (operation_type, idempotency_key, actor_id, request_hash, status, resource_type, completed_at)
    VALUES ('create_and_dispatch', gen_random_uuid(), v_a, 'h2', 'completed', 'client', now());
  EXCEPTION WHEN check_violation THEN v_failed := TRUE; END;
  ASSERT v_failed, 'completed sans response_snapshot aurait dû être rejeté';
  -- in_progress avec completed_at → rejet
  v_failed := FALSE;
  BEGIN
    INSERT INTO idempotency_operations
      (operation_type, idempotency_key, actor_id, request_hash, status, resource_type, completed_at)
    VALUES ('create_and_dispatch', gen_random_uuid(), v_a, 'h3', 'in_progress', 'client', now());
  EXCEPTION WHEN check_violation THEN v_failed := TRUE; END;
  ASSERT v_failed, 'in_progress avec completed_at aurait dû être rejeté';

  -- ── 12. Append-only : UPDATE et DELETE bloqués par le trigger ──
  SELECT id INTO v_id FROM reception_assignment_events LIMIT 1;
  v_failed := FALSE;
  BEGIN
    UPDATE reception_assignment_events SET reason='x' WHERE id=v_id;
  EXCEPTION WHEN OTHERS THEN v_failed := TRUE; END;
  ASSERT v_failed, 'UPDATE sur reception_assignment_events aurait dû être bloqué';
  v_failed := FALSE;
  BEGIN
    DELETE FROM reception_assignment_events WHERE id=v_id;
  EXCEPTION WHEN OTHERS THEN v_failed := TRUE; END;
  ASSERT v_failed, 'DELETE sur reception_assignment_events aurait dû être bloqué';

  RAISE NOTICE 'PR2A SCHEMA TESTS: ALL PASS (assertions internes)';
END $$;

-- ── 13. Rôles applicatifs : aucun accès direct aux tables internes ──
-- (hors DO pour utiliser has_table_privilege ; ne s'exécute que si les rôles existent)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
    ASSERT NOT has_table_privilege('authenticated','reception_assignment_events','INSERT'),
      'authenticated ne doit pas pouvoir INSERT dans reception_assignment_events';
    ASSERT NOT has_table_privilege('authenticated','reception_assignment_events','UPDATE'),
      'authenticated ne doit pas pouvoir UPDATE reception_assignment_events';
    ASSERT NOT has_table_privilege('authenticated','idempotency_operations','SELECT'),
      'authenticated ne doit pas lire idempotency_operations';
    ASSERT NOT has_table_privilege('authenticated','notification_outbox','INSERT'),
      'authenticated ne doit pas écrire notification_outbox';
    RAISE NOTICE 'PR2A PERMISSION TESTS: ALL PASS';
  ELSE
    RAISE NOTICE 'PR2A PERMISSION TESTS: skipped (role authenticated absent)';
  END IF;
END $$;

ROLLBACK;
