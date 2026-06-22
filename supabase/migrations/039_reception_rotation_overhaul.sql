-- ================================================
-- CRM NOUREDDINE — File 39/N
-- Refonte du système de rotation Réception → Agents.
--
-- Corrige les défauts identifiés dans l'audit du flux de distribution:
--
--  1. [CRITIQUE] Les clients auto-créés par un agent (source ≠ réception)
--     polluaient les compteurs de rotation : un agent qui ajoutait son
--     propre client était poussé en fin de file (round_robin) ou comptait
--     comme "chargé" (load_balanced / leads_today), et la réception
--     envoyait alors le lead suivant à un autre agent "même si ce n'était
--     pas son tour". On distingue désormais explicitement les LEADS
--     DISTRIBUÉS PAR LA RÉCEPTION (clients.assigned_at IS NOT NULL) des
--     clients auto-sourcés. Seuls les leads distribués entrent dans la
--     rotation.
--
--  2. [CRITIQUE] Aucune attribution atomique côté serveur : la décision
--     et le plafond quotidien étaient calculés dans le navigateur à partir
--     d'un cache de 15 s → courses entre réceptionnistes, plafond
--     contournable. Tout passe maintenant par assign_client_to_agent(),
--     SECURITY DEFINER, qui choisit l'agent, vérifie le plafond et logue
--     l'événement de façon atomique.
--
--  3. [CRITIQUE] Tableau "Équité" faux : le canal de création directe
--     n'écrivait aucune ligne 'reassignment' (sous-comptage) tandis que la
--     file d'attente en écrivait deux (insert manuel + trigger) (sur-
--     comptage). Désormais chaque dispatch écrit EXACTEMENT une ligne
--     history taguée metadata.kind = 'dispatch', et le trigger générique
--     est neutralisé pour ces écritures (drapeau de session).
--
--  4. [MAJEUR] Pas de notification push lors d'une création déjà assignée
--     (le trigger ne couvrait que les UPDATE). On ajoute un trigger INSERT.
--
--  5. round_robin se basait uniquement sur les leads "du jour" (remise à
--     zéro quotidienne, biais alphabétique). On s'appuie sur assigned_at
--     persistant, NULLS FIRST, départage stable par u.id.
--
--  6. [PERF] La UI chargeait toute la table clients pour agréger côté
--     navigateur. reception_agent_loads() fait l'agrégat en SQL.
-- ================================================


-- ─── 1. Marqueurs de dispatch sur clients ───
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_clients_assigned ON clients(agent_id, assigned_at);

-- Backfill : les leads historiquement saisis par la réception comptent
-- comme distribués. Tout autre client (auto-sourcé par un agent) reste
-- assigned_at = NULL et n'entre donc pas dans la rotation.
UPDATE clients
SET assigned_at = created_at
WHERE assigned_at IS NULL
  AND agent_id IS NOT NULL
  AND source::text = 'reception';


-- ─── 2. Sélection de l'agent (leads distribués uniquement, plafond) ───
-- manual         → NULL (la réception choisit).
-- round_robin    → assigned_at le plus ancien (NULLS FIRST = jamais servi).
-- load_balanced  → le moins de clients distribués actifs en pipeline.
-- leads_today    → le moins de leads distribués aujourd'hui.
-- Les agents ayant atteint le plafond du jour sont exclus.
CREATE OR REPLACE FUNCTION public.pick_agent_for_assignment()
RETURNS UUID AS $$
DECLARE
  v_mode   TEXT;
  v_cap    INTEGER;
  v_chosen UUID;
BEGIN
  SELECT reception_assignment_mode, reception_max_leads_per_day
    INTO v_mode, v_cap
  FROM app_settings
  LIMIT 1;

  v_mode := COALESCE(v_mode, 'manual');
  v_cap  := COALESCE(v_cap, 10);

  IF v_mode = 'manual' THEN
    RETURN NULL;
  END IF;

  IF v_mode = 'round_robin' THEN
    SELECT u.id INTO v_chosen
    FROM users u
    LEFT JOIN LATERAL (
      SELECT
        MAX(c.assigned_at) AS last_assigned,
        COUNT(*) FILTER (WHERE c.assigned_at >= date_trunc('day', now())) AS today_count
      FROM clients c
      WHERE c.agent_id = u.id AND c.assigned_at IS NOT NULL
    ) s ON TRUE
    WHERE u.role = 'agent' AND u.status = 'active'
      AND COALESCE(s.today_count, 0) < v_cap
    ORDER BY s.last_assigned NULLS FIRST, COALESCE(s.today_count, 0) ASC, u.id
    LIMIT 1;

  ELSIF v_mode = 'load_balanced' THEN
    SELECT u.id INTO v_chosen
    FROM users u
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*) FILTER (WHERE c.pipeline_stage NOT IN ('vente', 'perdue')) AS active_count,
        COUNT(*) FILTER (WHERE c.assigned_at >= date_trunc('day', now())) AS today_count
      FROM clients c
      WHERE c.agent_id = u.id AND c.assigned_at IS NOT NULL
    ) s ON TRUE
    WHERE u.role = 'agent' AND u.status = 'active'
      AND COALESCE(s.today_count, 0) < v_cap
    ORDER BY COALESCE(s.active_count, 0) ASC, COALESCE(s.today_count, 0) ASC, u.id
    LIMIT 1;

  ELSIF v_mode = 'leads_today' THEN
    SELECT u.id INTO v_chosen
    FROM users u
    LEFT JOIN LATERAL (
      SELECT COUNT(*) FILTER (WHERE c.assigned_at >= date_trunc('day', now())) AS today_count
      FROM clients c
      WHERE c.agent_id = u.id AND c.assigned_at IS NOT NULL
    ) s ON TRUE
    WHERE u.role = 'agent' AND u.status = 'active'
      AND COALESCE(s.today_count, 0) < v_cap
    ORDER BY COALESCE(s.today_count, 0) ASC, u.id
    LIMIT 1;
  END IF;

  RETURN v_chosen;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;


-- ─── 3. Charges par agent pour l'UI réception (agrégat SQL) ───
-- Remplace le téléchargement de toute la table clients dans le navigateur.
-- Compte uniquement les leads distribués (assigned_at IS NOT NULL) pour
-- rester cohérent avec pick_agent_for_assignment().
CREATE OR REPLACE FUNCTION public.reception_agent_loads()
RETURNS TABLE (
  id             UUID,
  first_name     TEXT,
  last_name      TEXT,
  active_clients INTEGER,
  leads_today    INTEGER,
  last_assigned  TIMESTAMPTZ,
  at_cap         BOOLEAN
) AS $$
  SELECT
    u.id,
    u.first_name,
    u.last_name,
    COALESCE(s.active_count, 0)::int,
    COALESCE(s.today_count, 0)::int,
    s.last_assigned,
    COALESCE(s.today_count, 0) >= COALESCE((SELECT reception_max_leads_per_day FROM app_settings LIMIT 1), 10)
  FROM users u
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*) FILTER (WHERE c.pipeline_stage NOT IN ('vente', 'perdue')) AS active_count,
      COUNT(*) FILTER (WHERE c.assigned_at >= date_trunc('day', now()))   AS today_count,
      MAX(c.assigned_at) AS last_assigned
    FROM clients c
    WHERE c.agent_id = u.id AND c.assigned_at IS NOT NULL
  ) s ON TRUE
  WHERE u.role = 'agent' AND u.status = 'active'
  ORDER BY u.first_name;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;


-- ─── 4. Attribution atomique d'un lead à un agent ───
-- Point d'entrée UNIQUE pour les deux canaux réception (création directe
-- et file d'attente). p_agent_id NULL ⇒ choix automatique selon le mode.
-- Vérifie l'autorisation, le plafond, le motif d'override, puis met à jour
-- le client (agent_id + assigned_at + assigned_by) et logue exactement un
-- événement history tagué kind = 'dispatch'. Le trigger générique
-- log_client_changes est neutralisé via un drapeau de session pour éviter
-- le double comptage.
CREATE OR REPLACE FUNCTION public.assign_client_to_agent(
  p_client_id UUID,
  p_agent_id  UUID DEFAULT NULL,
  p_reason    TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_mode            TEXT;
  v_cap             INTEGER;
  v_requires_reason BOOLEAN;
  v_suggested       UUID;
  v_chosen          UUID;
  v_from            UUID;
  v_today           INTEGER;
  v_is_override     BOOLEAN := FALSE;
BEGIN
  -- Autorisation : réception ou admin uniquement.
  IF NOT (public.is_admin() OR public.is_reception()) THEN
    RAISE EXCEPTION 'Seuls la réception ou un admin peuvent attribuer un lead';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM clients WHERE id = p_client_id) THEN
    RAISE EXCEPTION 'Client introuvable';
  END IF;

  SELECT reception_assignment_mode,
         reception_max_leads_per_day,
         reception_override_requires_reason
    INTO v_mode, v_cap, v_requires_reason
  FROM app_settings
  LIMIT 1;

  v_mode            := COALESCE(v_mode, 'manual');
  v_cap             := COALESCE(v_cap, 10);
  v_requires_reason := COALESCE(v_requires_reason, TRUE);

  -- Agent suggéré par le mode courant (sert aussi à détecter un override).
  v_suggested := public.pick_agent_for_assignment();

  v_chosen := COALESCE(p_agent_id, v_suggested);
  IF v_chosen IS NULL THEN
    RAISE EXCEPTION 'Aucun agent disponible (plafond atteint ou mode manuel sans choix)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = v_chosen AND role = 'agent' AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'La cible n''est pas un agent actif';
  END IF;

  -- Override = en mode auto, choix différent de la suggestion.
  v_is_override := (v_mode <> 'manual' AND v_suggested IS NOT NULL AND v_chosen <> v_suggested);
  IF v_is_override AND v_requires_reason AND COALESCE(length(TRIM(p_reason)), 0) < 3 THEN
    RAISE EXCEPTION 'Un motif est obligatoire pour contourner l''agent suggéré';
  END IF;

  -- Plafond quotidien (leads distribués aujourd'hui), garanti côté serveur.
  SELECT COUNT(*) INTO v_today
  FROM clients
  WHERE agent_id = v_chosen
    AND assigned_at >= date_trunc('day', now());
  IF v_today >= v_cap THEN
    RAISE EXCEPTION 'L''agent a atteint son plafond quotidien (% leads)', v_cap;
  END IF;

  SELECT agent_id INTO v_from FROM clients WHERE id = p_client_id;

  -- Neutralise le trigger log_client_changes (on logue une ligne plus riche).
  PERFORM set_config('app.dispatch_logged', '1', TRUE);

  UPDATE clients
  SET agent_id    = v_chosen,
      assigned_at = now(),
      assigned_by = auth.uid()
  WHERE id = p_client_id;

  INSERT INTO history (client_id, agent_id, type, title, description, metadata)
  VALUES (
    p_client_id,
    v_chosen,
    'reassignment',
    CASE WHEN v_is_override
         THEN 'Attribution manuelle (motif: ' || TRIM(p_reason) || ')'
         ELSE 'Attribution automatique' END,
    'Dispatch réception (mode ' || v_mode || ').',
    jsonb_build_object(
      'kind',               'dispatch',
      'reassigned_by',      auth.uid(),
      'from_agent_id',      v_from,
      'to_agent_id',        v_chosen,
      'suggested_agent_id', v_suggested,
      'mode',               v_mode,
      'reason',             NULLIF(TRIM(p_reason), '')
    )
  );

  RETURN jsonb_build_object(
    'chosen_agent_id',    v_chosen,
    'suggested_agent_id', v_suggested,
    'was_override',       v_is_override,
    'mode',               v_mode
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ─── 5. Neutralisation du double-log de réassignation ───
-- Recrée log_client_changes (migration 012) en ajoutant la garde de
-- drapeau de session : quand assign_client_to_agent() a déjà logué une
-- ligne 'reassignment' riche, le trigger ne doit pas en écrire une seconde.
-- Les branches priorité / budget sont conservées à l'identique.
CREATE OR REPLACE FUNCTION public.log_client_changes() RETURNS TRIGGER AS $$
DECLARE
  actor UUID := auth.uid();
BEGIN
  -- Réassignation (changement d'agent) — sauf si déjà loguée par le dispatch.
  IF NEW.agent_id IS DISTINCT FROM OLD.agent_id
     AND COALESCE(current_setting('app.dispatch_logged', TRUE), '') <> '1' THEN
    INSERT INTO history (client_id, agent_id, type, title, metadata)
    VALUES (
      NEW.id,
      actor,
      'reassignment',
      'Reassignation',
      jsonb_build_object(
        'from_agent_id', OLD.agent_id,
        'to_agent_id',   NEW.agent_id,
        'reassigned_by', actor
      )
    );
  END IF;

  -- Bascule du flag prioritaire
  IF NEW.is_priority IS DISTINCT FROM OLD.is_priority THEN
    INSERT INTO history (client_id, agent_id, type, title, metadata)
    VALUES (
      NEW.id,
      COALESCE(actor, NEW.agent_id),
      'priority_change',
      CASE WHEN NEW.is_priority THEN 'Marque prioritaire' ELSE 'Priorite retiree' END,
      jsonb_build_object('from', OLD.is_priority, 'to', NEW.is_priority, 'changed_by', actor)
    );
  END IF;

  -- Changement de budget confirmé
  IF NEW.confirmed_budget IS DISTINCT FROM OLD.confirmed_budget THEN
    INSERT INTO history (client_id, agent_id, type, title, metadata)
    VALUES (
      NEW.id,
      COALESCE(actor, NEW.agent_id),
      'budget_change',
      'Budget confirme mis a jour',
      jsonb_build_object(
        'from', OLD.confirmed_budget,
        'to',   NEW.confirmed_budget,
        'changed_by', actor
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ─── 6. Notification push à la création d'un client déjà assigné ───
-- Le trigger de migration 021 ne couvrait que les UPDATE de agent_id.
-- Quand un admin crée un client directement pour un agent (INSERT), ce
-- dernier n'était jamais notifié. On comble le trou. (Le canal réception
-- crée le client sans agent puis appelle assign_client_to_agent → l'UPDATE
-- existant notifie déjà.)
CREATE OR REPLACE FUNCTION public.trg_notify_client_assigned_on_insert() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.agent_id IS NULL OR NEW.agent_id = auth.uid() THEN
    RETURN NEW;
  END IF;

  PERFORM notify_push(
    NEW.agent_id,
    'Client assigné : ' || NEW.full_name,
    COALESCE('Tél : ' || NEW.phone, NULL),
    '/pipeline/clients/' || NEW.id
  );
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'clients') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS on_client_insert_notify ON public.clients';
    EXECUTE 'CREATE TRIGGER on_client_insert_notify AFTER INSERT ON public.clients FOR EACH ROW WHEN (NEW.agent_id IS NOT NULL) EXECUTE FUNCTION public.trg_notify_client_assigned_on_insert()';
  END IF;
END $$;


-- ─── 7. Grants ───
GRANT EXECUTE ON FUNCTION public.pick_agent_for_assignment() TO authenticated;
GRANT EXECUTE ON FUNCTION public.reception_agent_loads() TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_client_to_agent(UUID, UUID, TEXT) TO authenticated;
