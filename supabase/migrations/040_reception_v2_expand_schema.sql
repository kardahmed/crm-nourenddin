-- ================================================
-- CRM NOUREDDINE — File 40/N — PR2A
-- Réception V2 : EXPANSION ADDITIVE du schéma (phase "Expand").
--
-- Objectif : poser les fondations de données du futur système d'attribution
-- SANS modifier le comportement actuel du CRM. Tout est additif et réversible.
--
-- CE QUE CETTE MIGRATION FAIT :
--   1. Enums séparés : statut / méthode / classification (concepts distincts).
--   2. Colonnes d'état courant additives sur `clients` (nullables, sans défaut).
--   3. Table événementielle append-only `reception_assignment_events`.
--   4. Table `idempotency_operations` (schéma + contraintes seulement).
--   5. Table `notification_outbox` (aucune équivalente n'existe : `notifications`
--      est un magasin in-app, pas une outbox transactionnelle).
--   6. Contraintes CHECK d'invariants + index.
--   7. Fonction/trigger `forbid_mutation` (append-only) sur les événements.
--
-- CE QUE CETTE MIGRATION NE FAIT PAS (volontairement — PR2B et suivantes) :
--   - ne touche PAS à assign_client_to_agent / pick_agent_for_assignment ;
--   - ne supprime PAS clients.assigned_at / clients.assigned_by ;
--   - n'écrit AUCUN événement, ne fait AUCUN backfill ;
--   - ne double-écrit pas ; ne bascule pas le journal ni les stats ;
--   - ne révoque PAS les droits directs sur `clients` ;
--   - ne crée AUCUNE RPC métier publique ; n'ajoute AUCUN trigger bloquant
--     sur `clients` ; ne change AUCUNE policy RLS existante.
--
-- NOTE HONNÊTE (append-only) : le trigger forbid_mutation empêche UPDATE/DELETE
-- pour les rôles applicatifs, mais NE protège PAS contre le propriétaire de la
-- base ou un superutilisateur, qui peuvent désactiver le trigger.
-- ================================================


-- ─── 1. Enums séparés (statut ≠ méthode ≠ classification) ───
DO $$ BEGIN
  CREATE TYPE assignment_status AS ENUM ('unassigned', 'assigned', 'capacity_exhausted');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE assignment_method AS ENUM (
    'round_robin', 'manual', 'manual_on_behalf', 'self_assigned',
    'reassignment', 'transfer', 'import', 'unknown'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE assignment_classification_source AS ENUM (
    'native_v2', 'proven_legacy', 'inferred_legacy', 'unknown_legacy'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ─── 2. Colonnes d'état courant additives sur `clients` ───
-- Nullables, SANS défaut (pas de 'legacy_unknown' trompeur). Les colonnes
-- historiques agent_id / assigned_at / assigned_by sont CONSERVÉES telles quelles.
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS assignment_status                assignment_status,
  ADD COLUMN IF NOT EXISTS current_assignment_method        assignment_method,
  ADD COLUMN IF NOT EXISTS assignment_classification_source assignment_classification_source,
  ADD COLUMN IF NOT EXISTS current_assigned_at              TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS current_assigned_by              UUID REFERENCES users(id) ON DELETE SET NULL;


-- ─── 3. Table événementielle append-only (future source de vérité) ───
-- client_id N'A PAS de FK : choix délibéré pour CONSERVER l'audit même après
-- suppression du client. Les *_snapshot figent le libellé au moment de l'action
-- afin qu'un renommage/suppression d'agent ne réécrive pas l'historique.
CREATE TABLE IF NOT EXISTS reception_assignment_events (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_sequence                BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE,
  client_id                     UUID NOT NULL,                         -- pas de FK (voir note)
  event_type                    TEXT NOT NULL,
  previous_agent_id             UUID REFERENCES users(id) ON DELETE SET NULL,
  new_agent_id                  UUID REFERENCES users(id) ON DELETE SET NULL,
  assignment_status             assignment_status,
  assignment_method             assignment_method,
  classification_source         assignment_classification_source NOT NULL,
  counts_toward_round_robin     BOOLEAN NOT NULL DEFAULT FALSE,
  actor_id                      UUID REFERENCES users(id) ON DELETE SET NULL,
  reason                        TEXT,
  source_snapshot               TEXT NOT NULL,
  client_label_snapshot         TEXT NOT NULL,
  actor_label_snapshot          TEXT,
  previous_agent_label_snapshot TEXT,
  new_agent_label_snapshot      TEXT,
  idempotency_key               UUID,
  metadata                      JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at                   TIMESTAMPTZ NOT NULL,
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),

  -- Types d'événements autorisés
  CONSTRAINT rae_event_type_valid CHECK (event_type IN (
    'lead_created', 'dispatched', 'assigned_manual', 'reassigned',
    'transfer', 'capacity_exhausted', 'import'
  )),

  -- ── 4. Invariants ──
  -- Un dispatch Round-robin est complet et cohérent.
  CONSTRAINT rae_dispatched_shape CHECK (
    event_type <> 'dispatched' OR (
      assignment_status = 'assigned'
      AND assignment_method = 'round_robin'
      AND new_agent_id IS NOT NULL
      AND counts_toward_round_robin = TRUE
    )
  ),
  -- Seul un dispatch RR peut compter dans le Round-robin.
  CONSTRAINT rae_counts_only_dispatch CHECK (
    counts_toward_round_robin = FALSE OR (
      event_type = 'dispatched'
      AND assignment_method = 'round_robin'
      AND new_agent_id IS NOT NULL
    )
  ),
  -- Capacity exhausted : lead conservé, non assigné.
  CONSTRAINT rae_capacity_shape CHECK (
    event_type <> 'capacity_exhausted' OR (
      assignment_status = 'capacity_exhausted'
      AND assignment_method IS NULL
      AND new_agent_id IS NULL
      AND counts_toward_round_robin = FALSE
      AND reason = 'capacity_exhausted'
    )
  ),
  -- Attribution manuelle : agent + motif obligatoires, hors Round-robin.
  CONSTRAINT rae_assigned_manual_shape CHECK (
    event_type <> 'assigned_manual' OR (
      assignment_status = 'assigned'
      AND assignment_method IN ('manual', 'manual_on_behalf')
      AND new_agent_id IS NOT NULL
      AND reason IS NOT NULL AND length(btrim(reason)) > 0
      AND counts_toward_round_robin = FALSE
    )
  ),
  -- Réassignation : ancien ≠ nouvel agent, motif obligatoire, hors Round-robin.
  CONSTRAINT rae_reassigned_shape CHECK (
    event_type <> 'reassigned' OR (
      assignment_status = 'assigned'
      AND assignment_method = 'reassignment'
      AND previous_agent_id IS NOT NULL
      AND new_agent_id IS NOT NULL
      AND previous_agent_id <> new_agent_id
      AND reason IS NOT NULL AND length(btrim(reason)) > 0
      AND counts_toward_round_robin = FALSE
    )
  ),
  -- Client personnel (self_assigned) : acteur == agent, hors Round-robin.
  -- Clé sur la MÉTHODE (NULL ⇒ contrainte satisfaite).
  CONSTRAINT rae_self_assigned_shape CHECK (
    assignment_method <> 'self_assigned' OR (
      assignment_status = 'assigned'
      AND new_agent_id IS NOT NULL
      AND actor_id = new_agent_id
      AND counts_toward_round_robin = FALSE
    )
  )
);


-- ─── 5. Index ───
CREATE INDEX IF NOT EXISTS idx_rae_client_seq
  ON reception_assignment_events (client_id, event_sequence);

-- Pointeur Round-robin : MAX(event_sequence) des vrais dispatches par agent.
CREATE INDEX IF NOT EXISTS idx_rae_rr_pointer
  ON reception_assignment_events (new_agent_id, event_sequence)
  WHERE event_type = 'dispatched' AND counts_toward_round_robin;

-- Plafond journalier : vrais dispatches par agent et par jour (occurred_at).
CREATE INDEX IF NOT EXISTS idx_rae_rr_cap
  ON reception_assignment_events (new_agent_id, occurred_at)
  WHERE event_type = 'dispatched' AND counts_toward_round_robin;

CREATE INDEX IF NOT EXISTS idx_rae_type_time
  ON reception_assignment_events (event_type, occurred_at);

CREATE INDEX IF NOT EXISTS idx_rae_idem
  ON reception_assignment_events (idempotency_key)
  WHERE idempotency_key IS NOT NULL;


-- ─── 6. Idempotence (schéma + contraintes seulement ; protocole en PR2B) ───
CREATE TABLE IF NOT EXISTS idempotency_operations (
  operation_type    TEXT NOT NULL,
  idempotency_key   UUID NOT NULL,
  actor_id          UUID NOT NULL,
  request_hash      TEXT NOT NULL,
  status            TEXT NOT NULL,
  resource_type     TEXT NOT NULL,
  resource_id       UUID,
  response_snapshot JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  completed_at      TIMESTAMPTZ,
  PRIMARY KEY (operation_type, idempotency_key),
  CONSTRAINT idem_status_valid CHECK (status IN ('in_progress', 'completed')),
  CONSTRAINT idem_completed_shape CHECK (
    status <> 'completed' OR (response_snapshot IS NOT NULL AND completed_at IS NOT NULL)
  ),
  CONSTRAINT idem_inprogress_shape CHECK (
    status <> 'in_progress' OR completed_at IS NULL
  )
);


-- ─── 7. Outbox de notifications (aucune équivalente : notifications = in-app) ───
CREATE TABLE IF NOT EXISTS notification_outbox (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type       TEXT NOT NULL,
  recipient_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  payload          JSONB NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending',
  attempt_count    INTEGER NOT NULL DEFAULT 0,
  available_at     TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  processed_at     TIMESTAMPTZ,
  last_error       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT outbox_status_valid CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  CONSTRAINT outbox_attempts_nonneg CHECK (attempt_count >= 0),
  CONSTRAINT outbox_sent_processed CHECK (status <> 'sent' OR processed_at IS NOT NULL)
);


-- ─── 8. Append-only : fonction + triggers (bloque UPDATE/DELETE) ───
CREATE OR REPLACE FUNCTION public.forbid_mutation() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  RAISE EXCEPTION 'Table %.% is append-only; % is not allowed',
    TG_TABLE_SCHEMA, TG_TABLE_NAME, TG_OP;
END $$;

DROP TRIGGER IF EXISTS trg_rae_no_update ON reception_assignment_events;
CREATE TRIGGER trg_rae_no_update BEFORE UPDATE ON reception_assignment_events
  FOR EACH ROW EXECUTE FUNCTION public.forbid_mutation();

DROP TRIGGER IF EXISTS trg_rae_no_delete ON reception_assignment_events;
CREATE TRIGGER trg_rae_no_delete BEFORE DELETE ON reception_assignment_events
  FOR EACH ROW EXECUTE FUNCTION public.forbid_mutation();


-- ─── 9. Permissions : tables internes non exposées aux rôles applicatifs ───
-- RLS activée SANS policy = deny-all pour anon/authenticated. REVOKE en plus
-- (ceinture + bretelles). Aucune RPC/écriture directe n'est accordée en PR2A.
-- Les grants de `clients` ne sont PAS modifiés (verrouillage colonne = PR5).
ALTER TABLE reception_assignment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE idempotency_operations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_outbox        ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  REVOKE ALL ON TABLE reception_assignment_events FROM anon, authenticated;
  REVOKE ALL ON TABLE idempotency_operations     FROM anon, authenticated;
  REVOKE ALL ON TABLE notification_outbox        FROM anon, authenticated;
EXCEPTION WHEN undefined_object THEN NULL; END $$;
