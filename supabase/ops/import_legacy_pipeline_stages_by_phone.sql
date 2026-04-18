-- Backfill pipeline_stage for the 27 legacy clients whose ids got merged
-- during phone-dedup (migration 024). We key them by phone instead of id.
BEGIN;

CREATE TEMP TABLE _phone_stage (
  phone text,
  stage pipeline_stage,
  legacy_name text
) ON COMMIT DROP;

INSERT INTO _phone_stage (phone, stage, legacy_name) VALUES
  -- visite_a_gerer
  ('0661151462',          'visite_a_gerer',   'Oussama mimouni'),
  ('+213777901533',       'visite_a_gerer',   'Benkara sara'),
  ('+213552476150',       'visite_a_gerer',   'Hatem Benchikh'),
  ('+213552242564',       'visite_a_gerer',   'Ammam Tania'),
  ('0540651023',          'visite_a_gerer',   'Benatiya sohil'),
  ('0552686298',          'visite_a_gerer',   'Sade aaoune'),
  ('+213770933191',       'visite_a_gerer',   'Sana Narimane'),
  ('+213662879461',       'visite_a_gerer',   'Arezki Karim'),
  ('+213540777415',       'visite_a_gerer',   'Kermiche nawel'),
  ('0657892559',          'visite_a_gerer',   'Cherifi malek'),
  ('+213557150920',       'visite_a_gerer',   'Mehdi ait djebara'),
  ('+213770897477',       'visite_a_gerer',   'Meriem ghezali'),
  ('+213550240432',       'visite_a_gerer',   'Nouri Sarah'),
  ('0540969839',          'visite_a_gerer',   'Zohir'),
  ('0550035301',          'visite_a_gerer',   'Badi abdennour'),
  -- visite_confirmee
  ('+213563866600',       'visite_confirmee', 'Souad Belhadji'),
  ('+213662226170',       'visite_confirmee', 'Mehazzem Billal'),
  ('+213770352306',       'visite_confirmee', 'TIFOURA Mohammed'),
  ('+971503485012',       'visite_confirmee', 'Islem belbekri'),
  ('+213557910708',       'visite_confirmee', 'Narimane Masmoudi'),
  -- visite_terminee
  ('+213549700529',       'visite_terminee',  'MOHAMED CHERGUI'),
  ('+213541080069',       'visite_terminee',  'Yacine Rawassy immobilire'),
  ('+213556699182',       'visite_terminee',  'Douib wassim'),
  ('+213549079733',       'visite_terminee',  'Smati Lila'),
  ('+33650988992',        'visite_terminee',  'hadri hamdi'),
  -- perdue
  ('+33773664025',        'perdue',           'Mohamed Achouri'),
  ('+2130542379473',      'perdue',           'Taher Ben messaoud');

-- Diagnostic BEFORE update: who matches by phone_normalized?
SELECT
  p.legacy_name,
  p.phone          AS legacy_phone,
  public.normalize_phone(p.phone) AS legacy_norm,
  p.stage          AS expected,
  c.id             AS matched_id,
  c.full_name      AS matched_name,
  c.pipeline_stage AS current_stage,
  CASE WHEN c.id IS NULL THEN 'NO_MATCH'
       WHEN c.pipeline_stage = p.stage THEN 'ALREADY_OK'
       ELSE 'WILL_UPDATE' END AS verdict
FROM _phone_stage p
LEFT JOIN public.clients c
       ON c.phone_normalized = public.normalize_phone(p.phone)
ORDER BY verdict, p.stage, p.legacy_name;

-- Apply the update
UPDATE public.clients c
   SET pipeline_stage = p.stage
  FROM _phone_stage p
 WHERE c.phone_normalized = public.normalize_phone(p.phone)
   AND c.pipeline_stage <> p.stage;

-- Final distribution for Soumeya
SELECT pipeline_stage, COUNT(*) AS n
  FROM public.clients
 WHERE agent_id = '09daa9d0-3c8f-49fb-909f-24da5563908b'
 GROUP BY pipeline_stage
 ORDER BY n DESC;

COMMIT;
