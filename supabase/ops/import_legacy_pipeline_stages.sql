-- Migrate pipeline stages from OLD CRM `client_pipeline_progress` (88 rows)
-- For each (client_id, current_stage) tuple, update clients.pipeline_stage.
-- Rows whose client_id is not present in prod are reported as not_found.
BEGIN;

CREATE TEMP TABLE _old_progress (
  client_id uuid,
  stage pipeline_stage
) ON COMMIT DROP;

INSERT INTO _old_progress (client_id, stage) VALUES
  ('98385ef3-adc2-438e-820c-c2eca3fe3432', 'accueil'::pipeline_stage),
  ('f00860fd-a10a-47ab-a1f2-475387eaa270', 'accueil'::pipeline_stage),
  ('76b6fa59-0ca8-4f80-85b9-65cb8487a4f8', 'accueil'::pipeline_stage),
  ('b869cb39-59fe-43dc-bfe9-243f985333fc', 'visite_a_gerer'::pipeline_stage),
  ('8bb46bb3-6404-40f9-8177-8780c5e7ec77', 'visite_terminee'::pipeline_stage),
  ('5d612730-6d03-4952-aa7f-5e4829c9ee58', 'visite_a_gerer'::pipeline_stage),
  ('1cd19af0-7a86-4e99-8430-2f45ddb4fea6', 'accueil'::pipeline_stage),
  ('3254ab9f-639f-4d96-abf5-638507903652', 'accueil'::pipeline_stage),
  ('6aac7d22-5eed-44ce-9968-f3bc822930f9', 'accueil'::pipeline_stage),
  ('f6e357b1-8f0d-4919-bbb6-84cb46503e8f', 'accueil'::pipeline_stage),
  ('5f5cacd4-37ae-4759-9863-0c158abdf567', 'visite_a_gerer'::pipeline_stage),
  ('a44446f3-ba73-43c9-9a41-387877f64784', 'visite_a_gerer'::pipeline_stage),
  ('86fbaef1-c33d-422f-b393-4c962c22a3bb', 'visite_a_gerer'::pipeline_stage),
  ('f3df3351-e0aa-4722-a3b6-53b3753ac3a3', 'accueil'::pipeline_stage),
  ('038cc59e-d7d4-4dee-a21d-d90f5b7b95aa', 'visite_terminee'::pipeline_stage),
  ('67a05a67-ee9b-45a4-97c8-a018783cbc3f', 'accueil'::pipeline_stage),
  ('14936cd4-ed1c-4e9d-bc6a-c37de67d0a1b', 'accueil'::pipeline_stage),
  ('db2f00e1-fe29-4104-a22d-b7ee7f14c853', 'accueil'::pipeline_stage),
  ('69fa1135-af82-42bb-a91d-09e062aab6d1', 'visite_confirmee'::pipeline_stage),
  ('7344a9fd-3640-4cd7-adb0-3be388affa9a', 'accueil'::pipeline_stage),
  ('ae3e4c6b-7daa-4bc4-8a12-a7ceabc86f62', 'accueil'::pipeline_stage),
  ('656b5e66-fc78-4b18-8029-94fd9f735118', 'visite_confirmee'::pipeline_stage),
  ('05532c1a-a4ae-41b5-ba25-29c78286841a', 'accueil'::pipeline_stage),
  ('1b8113f1-cfeb-4faf-a464-30fdbb3b4c79', 'accueil'::pipeline_stage),
  ('21d3d637-6152-424a-a0da-71afa8033788', 'accueil'::pipeline_stage),
  ('226978a0-f9ef-4d10-9cdb-557cbb73d330', 'accueil'::pipeline_stage),
  ('6b47f252-32f1-4759-9e14-8f96e2bf5dfa', 'accueil'::pipeline_stage),
  ('7e9fec66-eee2-4ae3-a71e-35728420fdbe', 'accueil'::pipeline_stage),
  ('1d24e2db-8531-426c-bc9c-0073d8f6dc20', 'accueil'::pipeline_stage),
  ('57cd838c-5969-4c1d-9035-7a0cae677944', 'visite_a_gerer'::pipeline_stage),
  ('89be8df5-0a3d-4bd9-9b94-c2e2a437b9c5', 'accueil'::pipeline_stage),
  ('40b6f4fd-3a38-4be0-a8a8-3cba6039fad0', 'accueil'::pipeline_stage),
  ('3baeb5db-ae1e-40f1-87d4-c5599f43263d', 'perdue'::pipeline_stage),
  ('b72eb885-b4ec-4844-aecb-7fd128d912b4', 'accueil'::pipeline_stage),
  ('1e9844b4-352b-46b4-bc84-b7c5239385b4', 'visite_confirmee'::pipeline_stage),
  ('59d5da6c-f781-42c3-96da-cd3a800ebb6f', 'accueil'::pipeline_stage),
  ('76b2f35b-6e1f-44c0-93d5-36a12cc1568c', 'accueil'::pipeline_stage),
  ('4707e2c3-0451-4386-a14c-f702f5b2dcbe', 'accueil'::pipeline_stage),
  ('2462fc00-5e4a-44ff-8ae3-b0a02d86c9fa', 'accueil'::pipeline_stage),
  ('88995584-d8db-48f7-89fe-6748a5cd21f9', 'accueil'::pipeline_stage),
  ('c3df481d-2d72-4264-992b-0ecb2bbe3dd4', 'accueil'::pipeline_stage),
  ('194f2bb6-cf0c-412e-bf14-bcb70833774e', 'visite_a_gerer'::pipeline_stage),
  ('99ea0d6d-fd40-4da3-af57-e2fd588cf19f', 'accueil'::pipeline_stage),
  ('1cf7d51e-b397-4db5-87a8-26c456e8bd8e', 'accueil'::pipeline_stage),
  ('09d86bf3-39b0-446b-9801-32639fc0f6a3', 'visite_a_gerer'::pipeline_stage),
  ('ac098b7a-4a5e-454d-b340-d27503b1679d', 'accueil'::pipeline_stage),
  ('cb5d4e55-9ddc-4d32-af61-8a131e8a2e4a', 'accueil'::pipeline_stage),
  ('9d8c830e-1d43-4904-b067-27c2074759b4', 'accueil'::pipeline_stage),
  ('07a3ada8-e017-414c-8b48-23439db34318', 'accueil'::pipeline_stage),
  ('6d720c16-270a-437c-932e-0ff9bd0a4577', 'visite_a_gerer'::pipeline_stage),
  ('c205a983-93e6-43a4-886f-28f312823fd8', 'visite_a_gerer'::pipeline_stage),
  ('fd006c2e-8a32-4ebe-b0e1-e502b060397b', 'accueil'::pipeline_stage),
  ('123bdafe-9d6a-4bab-882c-34c9c85d37b5', 'accueil'::pipeline_stage),
  ('55251214-a822-494d-8d57-a081e6a610fa', 'visite_confirmee'::pipeline_stage),
  ('b7729b85-5f5d-4964-aa52-f89f5bffdd0d', 'perdue'::pipeline_stage),
  ('8664b4bb-82e5-4226-9068-8f14a2514f59', 'accueil'::pipeline_stage),
  ('bfc5e512-30eb-47bc-8614-4968da0db2f1', 'accueil'::pipeline_stage),
  ('8c2bd7c6-2a8c-40dc-869f-8af77de73656', 'accueil'::pipeline_stage),
  ('5e562851-60e2-487a-a3bf-f9af4ec81454', 'accueil'::pipeline_stage),
  ('67b0ede9-bc07-44c5-894b-c27c03d10b73', 'visite_a_gerer'::pipeline_stage),
  ('bbedd5bd-03fa-4dbf-9ab9-e1d53442ed99', 'accueil'::pipeline_stage),
  ('53339c5b-9264-4064-a153-0877ed83ed03', 'visite_a_gerer'::pipeline_stage),
  ('d3a1a542-2679-4bde-a66b-0f64390a713d', 'accueil'::pipeline_stage),
  ('9eee14c1-c8c1-4b6c-ade0-1f737ff20e50', 'visite_terminee'::pipeline_stage),
  ('63ff9256-d3fc-4965-983a-81fdf1f7be98', 'accueil'::pipeline_stage),
  ('299d0b95-51fe-493c-855e-afa38c294bf6', 'visite_confirmee'::pipeline_stage),
  ('d6eb5f12-48f6-498e-a72c-651e7e2fda87', 'accueil'::pipeline_stage),
  ('3786417b-3cd4-4fd5-b4c2-34f330928745', 'visite_a_gerer'::pipeline_stage),
  ('76c5276c-85d8-43e1-ad62-e37006da5765', 'visite_terminee'::pipeline_stage),
  ('33f79440-92a8-41f0-aedf-508a6cd621a2', 'accueil'::pipeline_stage),
  ('3483e60d-72be-4901-a6f3-2cf0ae682679', 'accueil'::pipeline_stage),
  ('bb990037-1006-46c4-8a72-fc38b599eefd', 'accueil'::pipeline_stage),
  ('d83f5bef-7085-4698-b2c1-996439137967', 'accueil'::pipeline_stage),
  ('17e7d920-64ca-400a-bedf-2cb7427bf205', 'accueil'::pipeline_stage),
  ('074cd56e-5fd3-45c5-8bde-2681c16c4065', 'visite_a_gerer'::pipeline_stage),
  ('b59c8028-5866-47e3-96b1-fcbb71e5cad4', 'accueil'::pipeline_stage),
  ('3be12b9b-53ac-4c71-8114-4710dde0d8a1', 'accueil'::pipeline_stage),
  ('f7672a1d-4bd4-4b19-82b1-efd7a713ec93', 'accueil'::pipeline_stage),
  ('5ef926e2-17c7-41b0-ad31-62e174efb5bb', 'accueil'::pipeline_stage),
  ('e06be474-ba8d-43e7-b646-945ed78647be', 'visite_terminee'::pipeline_stage),
  ('727e6037-7e74-4f28-807a-b6ea47f0fd13', 'visite_a_gerer'::pipeline_stage),
  ('4077e036-8490-4ff9-ad3e-c3eb6b3e76c8', 'accueil'::pipeline_stage),
  ('730eea3a-0b7c-43bd-b736-ba558cbd56aa', 'accueil'::pipeline_stage),
  ('d31d8f4f-18e7-4483-b657-9e5e09fb49f0', 'accueil'::pipeline_stage),
  ('637d759e-bc2d-4357-b11b-f9653d143b9c', 'accueil'::pipeline_stage),
  ('a62ca198-f6e9-4535-89d9-83137fc59485', 'accueil'::pipeline_stage),
  ('fd68caf5-dda8-47c6-8172-85ae2e3b5ff0', 'accueil'::pipeline_stage),
  ('1999a7d2-d58b-4a70-a72d-f5382d3dff6c', 'accueil'::pipeline_stage);

-- Apply the stage from the old CRM to the matching client in prod
UPDATE public.clients c
   SET pipeline_stage = o.stage
  FROM _old_progress o
 WHERE c.id = o.client_id;

-- Report: how many got updated, how many old client_ids don't exist in prod,
-- and the final stage distribution for Soumeya's portfolio.
SELECT
  (SELECT COUNT(*) FROM _old_progress) AS old_total,
  (SELECT COUNT(*) FROM _old_progress o
     WHERE EXISTS (SELECT 1 FROM public.clients c WHERE c.id = o.client_id)) AS matched_and_updated,
  (SELECT COUNT(*) FROM _old_progress o
     WHERE NOT EXISTS (SELECT 1 FROM public.clients c WHERE c.id = o.client_id)) AS not_found;

SELECT pipeline_stage, COUNT(*) AS n
  FROM public.clients
 WHERE agent_id = '09daa9d0-3c8f-49fb-909f-24da5563908b'
 GROUP BY pipeline_stage
 ORDER BY n DESC;

COMMIT;
