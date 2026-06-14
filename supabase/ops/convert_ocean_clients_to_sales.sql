-- ============================================================================
-- Conversion des 22 acheteurs Résidence Océan en VENTES (dossiers)
--   * relie chaque client (par téléphone) à son unité
--   * crée la vente (sales) au prix catalogue de l'unité
--   * marque l'unité 'sold' + client_id/agent_id
--   * idempotent : ignore une unité déjà vendue
-- Correspondance validée le 2026-06-14 (4 paires ambiguës confirmées).
-- ============================================================================
BEGIN;

CREATE TEMP TABLE _map (phone text, unit_id uuid) ON COMMIT DROP;

INSERT INTO _map (phone, unit_id) VALUES
  ('+213550347422', '0018838b-65b3-4bb3-8a24-e607cd8fab65'::uuid),  -- Khrabcha → A003 (A RDC F4)
  ('+33662836901', '22991c89-2b9e-44e2-bb45-1bb15c4e8695'::uuid),  -- Massinissa Bennacer → A002 (A RDC F4 dup)
  ('+32470206923', '3923b903-2959-4f91-880a-6b65259d1670'::uuid),  -- Kouri → A101 (A 1ER F3)
  ('+213772376268', '64f7ac48-d456-4e26-a768-691f7cdacfc3'::uuid),  -- Rahima Lahiouel → A102 (A 1ER F4)
  ('+447944006117', '17b6a6bf-e1ef-48f3-9eeb-2aa39e17d529'::uuid),  -- Mesaoudi Abdelhakim → A201 (A 2EME F3)
  ('+213550553840', '791610fa-f7b6-4f42-ac46-035229c4f1de'::uuid),  -- Touati Redwane → A202 (A 2EME F4)
  ('+213551707529', 'd8a229c4-a214-4766-905f-fa44e740b00c'::uuid),  -- Lamia Dekyous → A203 (A 2EME F4 dup)
  ('+213661728145', '9020c165-0050-43cb-a33e-7e1649e1c233'::uuid),  -- Nait Mohamed Amine → A301 (A 3EME F3)
  ('+213555045758', 'c3edcc79-3814-46d7-8d54-e5cbfe69f973'::uuid),  -- Boughoufala Farid → A302 (A 3EME F4)
  ('+213560274049', '44782284-ce01-4001-a3d1-3d1a7f31c632'::uuid),  -- Bensettal Mohamed → A402 (A 4EME F6 dup)
  ('+213554373126', 'dfe0fec1-62ed-4ed5-be9c-6ad9c641caf9'::uuid),  -- Boublata → A401 (A 4EME F5 dup)
  ('+213540549436', '213dcf8e-e553-4da1-a562-f150761b11ea'::uuid),  -- Hanoufi → B0001 (B ENTRESOL F6)
  ('+213657754254', '2dca0a89-6145-4ef3-a235-e44b4bb06173'::uuid),  -- Zouadine → B001 (B RDC F4)
  ('+15616741396', '05a98ee9-7ad6-4626-9b0f-52e807ac36e9'::uuid),  -- Benkrimi lamia → B002 (B RDC F4)
  ('+213771623913', '72b3630e-867c-4079-8341-5c52fbdfe02c'::uuid),  -- Ighzem Samia → B101 (B 1ER F5)
  ('+33646491983', 'cac78dbf-d0ba-4679-b1d0-4ee1b2768a35'::uuid),  -- Romeo Biaux → B102 (B 1ER F4)
  ('+213770900783', 'b5a8687d-88b5-4f02-9d79-78c56f361f5b'::uuid),  -- Sid Ali Belaid → B202 (B 2EME F4)
  ('+213553671554', '017942af-ee3a-4221-8c8c-ba1ade4d34f9'::uuid),  -- Kameche khallil → B201 (B 2EME F5)
  ('+213770414133', '726064a5-9e84-4a82-be29-84e2dd304788'::uuid),  -- Baghdadi Nacera → B301 (B 3EME F5)
  ('+213770710850', 'e976eb9b-10bf-4376-aa3d-d72c68b7ccfe'::uuid),  -- Zouaoui Karim → B302 (B 3EME F4)
  ('+213661140267', 'b84e9ab3-d520-4fe2-880b-538f232eca5a'::uuid),  -- Benaicha Mohamed → B401 (B 4EME F5 dup)
  ('+213554512156', '2543e968-979e-4f03-8b4b-08388388deca'::uuid)  -- Nawel Bellmou → B402 (B 4EME F5 dup)
;

DO $$
DECLARE
  r          record;
  v_client   uuid;
  v_agent    uuid;
  v_fallback uuid;
  v_created  int := 0;
  v_skipped  int := 0;
BEGIN
  SELECT id INTO v_fallback FROM public.users
   WHERE role='admin' AND status='active' ORDER BY created_at LIMIT 1;

  FOR r IN
    SELECT m.phone, m.unit_id, u.project_id, u.price
      FROM _map m JOIN public.units u ON u.id = m.unit_id
  LOOP
    SELECT id, agent_id INTO v_client, v_agent
      FROM public.clients
     WHERE phone_normalized = public.normalize_phone(r.phone)
     LIMIT 1;

    IF v_client IS NULL THEN
      RAISE NOTICE 'Client introuvable (tel %) — ignoré', r.phone;
      v_skipped := v_skipped + 1; CONTINUE;
    END IF;
    v_agent := COALESCE(v_agent, v_fallback);

    -- Idempotence : si l'unité a déjà une vente active, on saute.
    IF EXISTS (SELECT 1 FROM public.sales WHERE unit_id = r.unit_id AND status='active') THEN
      RAISE NOTICE 'Unité % déjà vendue — ignorée', r.unit_id;
      v_skipped := v_skipped + 1; CONTINUE;
    END IF;

    INSERT INTO public.sales
      (client_id, agent_id, project_id, unit_id, total_price, final_price)
    VALUES
      (v_client, v_agent, r.project_id, r.unit_id, r.price, r.price);

    UPDATE public.units
       SET status='sold', client_id=v_client, agent_id=v_agent
     WHERE id = r.unit_id;

    UPDATE public.clients SET pipeline_stage='vente' WHERE id = v_client;

    v_created := v_created + 1;
  END LOOP;

  RAISE NOTICE 'Ventes créées: %, ignorées: %', v_created, v_skipped;
END $$;

-- ── Rapport ──────────────────────────────────────────────────────────────
SELECT
  (SELECT COUNT(*) FROM _map) AS lignes_mapping,
  (SELECT COUNT(*) FROM public.sales s JOIN _map m ON m.unit_id = s.unit_id) AS ventes_pour_ces_unites,
  (SELECT COUNT(*) FROM public.units WHERE id IN (SELECT unit_id FROM _map) AND status='sold') AS unites_vendues,
  (SELECT COALESCE(SUM(final_price),0) FROM public.sales s JOIN _map m ON m.unit_id = s.unit_id) AS ca_total;

COMMIT;
