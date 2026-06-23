-- ================================================
-- CRM NOUREDDINE — File 40/N
-- Refonte de la génération automatique des tâches.
--
-- Avant : la création des tâches vivait dans le navigateur
-- (hook useAutoTasks.generateForStage). Défauts corrigés ici :
--
--  1. [CRITIQUE] Les tâches étaient assignées à l'UTILISATEUR qui
--     déclenchait le changement d'étape (agent_id = userId), pas à
--     l'agent du client. Un admin qui déplaçait une carte ou créait un
--     client pour un agent envoyait les tâches sur son propre compte ;
--     l'agent réel ne les voyait jamais. Désormais agent_id = clients.agent_id.
--
--  2. [CRITIQUE] Les leads saisis par la réception (NewContactForm) ne
--     passaient pas par generateForStage → aucune tâche d'accueil. Le
--     trigger se déclenche pour TOUS les canaux, y compris au moment du
--     dispatch (agent_id NULL → agent).
--
--  3. [MAJEUR] Création non atomique (« check puis insert » côté client)
--     + fire-and-forget → doublons et pertes silencieuses. La génération
--     est maintenant atomique en SQL et indépendante de l'UI.
--
-- Plus : un filet de sécurité BEFORE INSERT remplit agent_id depuis le
-- client pour toute tâche créée sans agent (ex. rappels ad-hoc), et la
-- bascule scheduled → pending est gérée par le cron check-reminders
-- (édité séparément).
-- ================================================


-- ─── 1. Génération des tâches d'étape ───
-- Instancie les task_templates actifs du nouveau stage, possédés par
-- l'agent DU CLIENT. Annule les tâches ouvertes de l'ancien stage.
-- Idempotent : ne recrée pas si le stage a déjà des tâches vivantes.
CREATE OR REPLACE FUNCTION public.generate_stage_tasks() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Un client sans agent (lead réception pas encore dispatché) ne reçoit
  -- pas de tâche tout de suite ; le trigger se redéclenche quand agent_id
  -- est renseigné au dispatch.
  IF NEW.agent_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Sur un vrai changement d'étape, on retire les tâches ouvertes de
  -- l'ancienne étape.
  IF TG_OP = 'UPDATE'
     AND NEW.pipeline_stage IS DISTINCT FROM OLD.pipeline_stage
     AND OLD.pipeline_stage IS NOT NULL THEN
    UPDATE client_tasks
    SET status = 'cancelled', auto_cancelled = TRUE
    WHERE client_id = NEW.id
      AND stage = OLD.pipeline_stage
      AND status IN ('pending', 'scheduled');
  END IF;

  -- Idempotent : pas de doublon si ce stage a déjà des tâches non annulées.
  IF EXISTS (
    SELECT 1 FROM client_tasks
    WHERE client_id = NEW.id
      AND stage = NEW.pipeline_stage
      AND status <> 'cancelled'
  ) THEN
    RETURN NEW;
  END IF;

  -- Instancie les templates actifs du nouveau stage, possédés par l'agent
  -- du client (jamais l'utilisateur qui a déclenché le changement).
  INSERT INTO client_tasks (
    client_id, agent_id, template_id, bundle_id, title, description,
    stage, status, priority, channel, scheduled_at
  )
  SELECT
    NEW.id,
    NEW.agent_id,
    t.id,
    t.bundle_id,
    t.title,
    t.description,
    t.stage,
    CASE WHEN COALESCE(t.delay_minutes, 0) = 0 THEN 'pending' ELSE 'scheduled' END,
    t.priority,
    t.channel,
    CASE WHEN COALESCE(t.delay_minutes, 0) > 0
         THEN now() + make_interval(mins => t.delay_minutes::int)
         ELSE NULL END
  FROM task_templates t
  WHERE t.stage = NEW.pipeline_stage
    AND t.is_active = TRUE
  ORDER BY t.sort_order;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_stage_tasks_ins ON clients;
CREATE TRIGGER trg_generate_stage_tasks_ins
  AFTER INSERT ON clients
  FOR EACH ROW EXECUTE FUNCTION public.generate_stage_tasks();

-- Sur UPDATE, ne se déclenche que pour un changement d'étape ou un dispatch
-- (agent_id NULL → renseigné), pour éviter de tourner à chaque écriture.
DROP TRIGGER IF EXISTS trg_generate_stage_tasks_upd ON clients;
CREATE TRIGGER trg_generate_stage_tasks_upd
  AFTER UPDATE ON clients
  FOR EACH ROW
  WHEN (
    NEW.pipeline_stage IS DISTINCT FROM OLD.pipeline_stage
    OR (OLD.agent_id IS NULL AND NEW.agent_id IS NOT NULL)
  )
  EXECUTE FUNCTION public.generate_stage_tasks();


-- ─── 2. Filet de sécurité : agent par défaut sur les tâches ───
-- Toute tâche insérée sans agent_id (ex. rappel ad-hoc du SmartStageDialog)
-- hérite de l'agent du client, jamais d'un acteur arbitraire.
CREATE OR REPLACE FUNCTION public.client_tasks_default_agent() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.agent_id IS NULL AND NEW.client_id IS NOT NULL THEN
    SELECT agent_id INTO NEW.agent_id FROM clients WHERE id = NEW.client_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_client_tasks_default_agent ON client_tasks;
CREATE TRIGGER trg_client_tasks_default_agent
  BEFORE INSERT ON client_tasks
  FOR EACH ROW EXECUTE FUNCTION public.client_tasks_default_agent();
