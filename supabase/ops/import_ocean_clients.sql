-- ============================================================================
-- Import clients "Résidence Océan" depuis Liste_clients_residence_ocean.xlsx
-- 22 acheteurs. Pattern identique à import_missing_legacy_clients.sql :
--   * anti-doublon sur phone_normalized (ne réécrit jamais une fiche existante)
--   * gestion défensive de la colonne legacy `tenant_id`
--   * assignation à un agent (par défaut : 1er admin actif — voir v_agent)
-- Étape pipeline = 'vente' (ce sont des acheteurs), source = 'autre'.
-- ============================================================================
BEGIN;

CREATE TEMP TABLE _ocean (
  full_name           text,
  phone               text,
  desired_unit_types  text[],
  notes               text
) ON COMMIT DROP;

INSERT INTO _ocean (full_name, phone, desired_unit_types, notes) VALUES
  ('Khrabcha', '+213550347422', ARRAY['F4']::text[], 'Résidence Océan | Appartement: A RDC F4 | Charges: Payé | Livraison: Non livré'),
  ('Massinissa Bennacer', '+33662836901', ARRAY['F4 duplex']::text[], 'Résidence Océan | Appartement: A RDC F4dup | Charges: Payé | Livraison: Non livré'),
  ('Kouri', '+32470206923', ARRAY['F3']::text[], 'Résidence Océan | Appartement: A 1ER F3 | Parking: N°17 | Charges: Payé | Livraison: Livré'),
  ('Rahima Lahiouel', '+213772376268', ARRAY['F4']::text[], 'Résidence Océan | Appartement: A 1ER F4 | Charges: Non payé | Livraison: Non livré'),
  ('Mesaoudi Abdelhakim', '+447944006117', ARRAY['F3']::text[], 'Résidence Océan | Appartement: A 2EME F3 | Charges: Payé | Livraison: Non livré'),
  ('Touati Redwane', '+213550553840', ARRAY['F4']::text[], 'Résidence Océan | Appartement: A 2EME F4 | Charges: Payé | Livraison: Livré'),
  ('Lamia Dekyous', '+213551707529', ARRAY['F4 duplex']::text[], 'Résidence Océan | Appartement: A 2EME F4dup | Charges: Non payé | Livraison: Livré'),
  ('Nait Mohamed Amine', '+213661728145', ARRAY['F3']::text[], 'Résidence Océan | Appartement: A 3EME F3 | Charges: Payé | Livraison: Livré'),
  ('Boughoufala Farid', '+213555045758', ARRAY['F4']::text[], 'Résidence Océan | Appartement: A 3EME F4 | Charges: Non payé | Livraison: Non livré'),
  ('Bensettal Mohamed', '+213560274049', ARRAY['F6 duplex']::text[], 'Résidence Océan | Appartement: A 4EME F6dup | Charges: Non payé | Livraison: Non livré'),
  ('Boublata', '+213554373126', ARRAY['F5 duplex']::text[], 'Résidence Océan | Appartement: A 4EME F5dup | Charges: Non payé | Livraison: Non livré'),
  ('Hanoufi', '+213540549436', ARRAY['F6']::text[], 'Résidence Océan | Appartement: B ENTRESOL F6 | Livraison: Non livré'),
  ('Zouadine', '+213657754254', ARRAY['F4']::text[], 'Résidence Océan | Appartement: B RDC F4 | Charges: Payé | Livraison: Livré'),
  ('Benkrimi lamia', '+15616741396', ARRAY['F4']::text[], 'Résidence Océan | Appartement: B RDC F4 | Charges: Payé | Livraison: Livré'),
  ('Ighzem Samia', '+213771623913', ARRAY['F5']::text[], 'Résidence Océan | Appartement: B 1ER F5 | Charges: Payé | Livraison: Non livré'),
  ('Romeo Biaux', '+33646491983', ARRAY['F4']::text[], 'Résidence Océan | Appartement: B 1ER F4 | Charges: Non payé | Livraison: Non livré'),
  ('Sid Ali Belaid', '+213770900783', ARRAY['F4']::text[], 'Résidence Océan | Appartement: B 2EME F4 | Charges: Payé | Livraison: Livré'),
  ('Kameche khallil', '+213553671554', ARRAY['F5']::text[], 'Résidence Océan | Appartement: B 2EME F5 | Charges: Payé | Livraison: Livré'),
  ('Baghdadi Nacera', '+213770414133', ARRAY['F5']::text[], 'Résidence Océan | Appartement: B 3EME F5 | Charges: Payé | Livraison: Livré'),
  ('Zouaoui Karim', '+213770710850', ARRAY['F4']::text[], 'Résidence Océan | Appartement: B 3EME F4 | Charges: Payé | Livraison: Livré'),
  ('Benaicha Mohamed', '+213661140267', ARRAY['F5 duplex']::text[], 'Résidence Océan | Appartement: B 4EME F5 dup | Charges: Non payé | Livraison: Non livré'),
  ('Nawel Bellmou', '+213554512156', ARRAY['F5 duplex']::text[], 'Résidence Océan | Appartement: B 4EME F5 dup | Charges: Non payé | Livraison: Non livré');

DO $$
DECLARE
  v_agent       uuid;
  v_tenant      uuid;
  v_has_tenant  boolean;
  v_inserted    int;
BEGIN
  -- ── Agent destinataire ──────────────────────────────────────────────────
  -- Remplace NULL ci-dessous par un UID précis, ex. '09daa9d0-...'::uuid,
  -- sinon le script assigne au 1er admin actif.
  v_agent := NULL;
  IF v_agent IS NULL THEN
    SELECT id INTO v_agent
      FROM public.users
     WHERE role = 'admin' AND status = 'active'
     ORDER BY created_at
     LIMIT 1;
  END IF;
  IF v_agent IS NULL THEN
    RAISE EXCEPTION 'Aucun agent trouvé : renseigne v_agent manuellement.';
  END IF;

  -- ── Colonne legacy tenant_id (peut encore exister en prod) ───────────────
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name='clients' AND column_name='tenant_id'
  ) INTO v_has_tenant;

  IF v_has_tenant THEN
    SELECT tenant_id INTO v_tenant FROM public.clients WHERE tenant_id IS NOT NULL LIMIT 1;
    BEGIN
      EXECUTE 'ALTER TABLE public.clients ALTER COLUMN tenant_id DROP NOT NULL';
    EXCEPTION WHEN others THEN NULL;
    END;
  END IF;

  -- ── Insertion (anti-doublon sur phone_normalized) ────────────────────────
  IF v_has_tenant THEN
    INSERT INTO public.clients
      (agent_id, full_name, phone, source, pipeline_stage, interest_level,
       client_type, nationality, desired_unit_types, notes, tenant_id)
    SELECT v_agent, o.full_name, o.phone, 'autre'::client_source,
           'vente'::pipeline_stage, 'high'::interest_level,
           'individual'::client_type, 'DZ', o.desired_unit_types, o.notes, v_tenant
      FROM _ocean o
     WHERE NOT EXISTS (
             SELECT 1 FROM public.clients c
              WHERE c.phone_normalized IS NOT NULL
                AND c.phone_normalized = public.normalize_phone(o.phone)
           );
  ELSE
    INSERT INTO public.clients
      (agent_id, full_name, phone, source, pipeline_stage, interest_level,
       client_type, nationality, desired_unit_types, notes)
    SELECT v_agent, o.full_name, o.phone, 'autre'::client_source,
           'vente'::pipeline_stage, 'high'::interest_level,
           'individual'::client_type, 'DZ', o.desired_unit_types, o.notes
      FROM _ocean o
     WHERE NOT EXISTS (
             SELECT 1 FROM public.clients c
              WHERE c.phone_normalized IS NOT NULL
                AND c.phone_normalized = public.normalize_phone(o.phone)
           );
  END IF;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RAISE NOTICE 'Agent destinataire : %, lignes insérées : %', v_agent, v_inserted;
END $$;

-- ── Rapport ────────────────────────────────────────────────────────────────
SELECT
  (SELECT COUNT(*) FROM _ocean) AS total_fichier,
  (SELECT COUNT(*) FROM _ocean o
     WHERE EXISTS (SELECT 1 FROM public.clients c
                    WHERE c.phone_normalized = public.normalize_phone(o.phone))) AS presents_apres_import,
  (SELECT COUNT(*) FROM _ocean o
     WHERE NOT EXISTS (SELECT 1 FROM public.clients c
                        WHERE c.phone_normalized = public.normalize_phone(o.phone))) AS ignores_doublon_phone;

COMMIT;
