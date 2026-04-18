-- ================================================
-- Seed: default task bundles, task templates, and message templates
-- Populates the automatic follow-up system for every pipeline stage.
-- Idempotent: safe to re-run (uses WHERE NOT EXISTS guards).
-- ================================================

DO $$
DECLARE
  b_accueil_contact    UUID; b_accueil_relance   UUID;
  b_visite_a_gerer     UUID;
  b_visite_confirmee   UUID;
  b_visite_terminee    UUID;
  b_negociation        UUID;
  b_reservation        UUID;
  b_vente              UUID;
  b_relancement        UUID;
  b_perdue             UUID;
BEGIN
  -- Skip seeding entirely if any template already exists (preserves custom data)
  IF EXISTS (SELECT 1 FROM task_templates LIMIT 1) THEN
    RAISE NOTICE 'task_templates already populated — skipping seed';
    RETURN;
  END IF;

  -- ─── 1. Task bundles ───
  INSERT INTO task_bundles (name, stage, sort_order) VALUES ('Prise de contact', 'accueil', 10) RETURNING id INTO b_accueil_contact;
  INSERT INTO task_bundles (name, stage, sort_order) VALUES ('Relance sans reponse', 'accueil', 20) RETURNING id INTO b_accueil_relance;
  INSERT INTO task_bundles (name, stage, sort_order) VALUES ('Programmation visite', 'visite_a_gerer', 10) RETURNING id INTO b_visite_a_gerer;
  INSERT INTO task_bundles (name, stage, sort_order) VALUES ('Preparation visite', 'visite_confirmee', 10) RETURNING id INTO b_visite_confirmee;
  INSERT INTO task_bundles (name, stage, sort_order) VALUES ('Suivi post-visite', 'visite_terminee', 10) RETURNING id INTO b_visite_terminee;
  INSERT INTO task_bundles (name, stage, sort_order) VALUES ('Negociation active', 'negociation', 10) RETURNING id INTO b_negociation;
  INSERT INTO task_bundles (name, stage, sort_order) VALUES ('Confirmation reservation', 'reservation', 10) RETURNING id INTO b_reservation;
  INSERT INTO task_bundles (name, stage, sort_order) VALUES ('Suivi vente', 'vente', 10) RETURNING id INTO b_vente;
  INSERT INTO task_bundles (name, stage, sort_order) VALUES ('Relance client tiede', 'relancement', 10) RETURNING id INTO b_relancement;
  INSERT INTO task_bundles (name, stage, sort_order) VALUES ('Cloture dossier', 'perdue', 10) RETURNING id INTO b_perdue;

  -- ─── 2. Task templates ───
  -- Stage: accueil
  INSERT INTO task_templates (bundle_id, title, stage, channel, priority, auto_trigger, delay_minutes, message_mode, sort_order) VALUES
    (b_accueil_contact, 'Envoyer message de bienvenue', 'accueil', 'whatsapp', 'high', 'welcome', 0, 'template', 10),
    (b_accueil_contact, 'Envoyer le catalogue des projets', 'accueil', 'whatsapp', 'medium', 'catalogue', 5, 'template', 20),
    (b_accueil_contact, 'Appeler pour qualification', 'accueil', 'call', 'high', 'welcome', 60, 'template', 30),
    (b_accueil_relance, 'Relance J+2 (WhatsApp)', 'accueil', 'whatsapp', 'medium', 'relance_1', 2880, 'template', 40),
    (b_accueil_relance, 'Relance J+5 (SMS)', 'accueil', 'sms', 'medium', 'relance_2', 7200, 'template', 50);

  -- Stage: visite_a_gerer
  INSERT INTO task_templates (bundle_id, title, stage, channel, priority, auto_trigger, delay_minutes, message_mode, sort_order) VALUES
    (b_visite_a_gerer, 'Appeler pour fixer date de visite', 'visite_a_gerer', 'call', 'high', 'confirm_visite', 0, 'template', 10),
    (b_visite_a_gerer, 'Envoyer proposition de creneaux', 'visite_a_gerer', 'whatsapp', 'high', 'confirm_visite', 30, 'template', 20),
    (b_visite_a_gerer, 'Relance si pas de reponse J+1', 'visite_a_gerer', 'whatsapp', 'medium', 'relance_1', 1440, 'template', 30);

  -- Stage: visite_confirmee
  INSERT INTO task_templates (bundle_id, title, stage, channel, priority, auto_trigger, delay_minutes, message_mode, sort_order) VALUES
    (b_visite_confirmee, 'Envoyer confirmation et adresse', 'visite_confirmee', 'whatsapp', 'high', 'confirm_visite', 0, 'template', 10),
    (b_visite_confirmee, 'Rappel la veille de la visite', 'visite_confirmee', 'whatsapp', 'high', 'rappel_j1', 1440, 'template', 20),
    (b_visite_confirmee, 'Rappel 2h avant la visite', 'visite_confirmee', 'sms', 'urgent', 'rappel_jourj', 2880, 'template', 30);

  -- Stage: visite_terminee
  INSERT INTO task_templates (bundle_id, title, stage, channel, priority, auto_trigger, delay_minutes, message_mode, sort_order) VALUES
    (b_visite_terminee, 'Remercier apres la visite', 'visite_terminee', 'whatsapp', 'high', 'post_visite', 60, 'template', 10),
    (b_visite_terminee, 'Envoyer simulation de prix', 'visite_terminee', 'whatsapp', 'high', 'simulation', 240, 'template', 20),
    (b_visite_terminee, 'Appeler pour retour client J+2', 'visite_terminee', 'call', 'high', 'post_visite', 2880, 'template', 30);

  -- Stage: negociation
  INSERT INTO task_templates (bundle_id, title, stage, channel, priority, auto_trigger, delay_minutes, message_mode, sort_order) VALUES
    (b_negociation, 'Appeler pour discuter modalites', 'negociation', 'call', 'urgent', 'simulation', 0, 'template', 10),
    (b_negociation, 'Envoyer offre commerciale', 'negociation', 'whatsapp', 'high', 'simulation', 120, 'template', 20),
    (b_negociation, 'Demander la CIN pour preparer dossier', 'negociation', 'whatsapp', 'high', 'collect_cin', 1440, 'template', 30),
    (b_negociation, 'Relance J+3 si pas de decision', 'negociation', 'whatsapp', 'medium', 'relance_1', 4320, 'template', 40);

  -- Stage: reservation
  INSERT INTO task_templates (bundle_id, title, stage, channel, priority, auto_trigger, delay_minutes, message_mode, sort_order) VALUES
    (b_reservation, 'Envoyer felicitations reservation', 'reservation', 'whatsapp', 'high', 'felicitations', 0, 'template', 10),
    (b_reservation, 'Collecter documents (CIN, justificatifs)', 'reservation', 'whatsapp', 'urgent', 'collect_cin', 60, 'template', 20),
    (b_reservation, 'Appeler pour valider echeancier', 'reservation', 'call', 'high', 'rappel_echeance', 1440, 'template', 30);

  -- Stage: vente
  INSERT INTO task_templates (bundle_id, title, stage, channel, priority, auto_trigger, delay_minutes, message_mode, sort_order) VALUES
    (b_vente, 'Envoyer felicitations vente confirmee', 'vente', 'whatsapp', 'high', 'felicitations', 0, 'template', 10),
    (b_vente, 'Rappel premiere echeance', 'vente', 'whatsapp', 'medium', 'rappel_echeance', 43200, 'template', 20),
    (b_vente, 'Demander parrainage / avis client', 'vente', 'whatsapp', 'low', 'post_visite', 10080, 'template', 30);

  -- Stage: relancement
  INSERT INTO task_templates (bundle_id, title, stage, channel, priority, auto_trigger, delay_minutes, message_mode, sort_order) VALUES
    (b_relancement, 'Relance WhatsApp immediate', 'relancement', 'whatsapp', 'high', 'relance_1', 0, 'template', 10),
    (b_relancement, 'Appeler pour comprendre hesitation', 'relancement', 'call', 'high', 'relance_1', 1440, 'template', 20),
    (b_relancement, 'Relance SMS J+7', 'relancement', 'sms', 'medium', 'relance_2', 10080, 'template', 30);

  -- Stage: perdue
  INSERT INTO task_templates (bundle_id, title, stage, channel, priority, auto_trigger, delay_minutes, message_mode, sort_order) VALUES
    (b_perdue, 'Enregistrer raison de la perte', 'perdue', 'system', 'medium', 'raison_perte', 0, 'template', 10),
    (b_perdue, 'Message de courtoisie final', 'perdue', 'whatsapp', 'low', 'raison_perte', 60, 'template', 20);

  -- ─── 3. Message templates (body text per stage × trigger_type) ───
  INSERT INTO message_templates (stage, trigger_type, channel, mode, body, variables_used, sort_order) VALUES
  -- accueil
  ('accueil', 'welcome', 'whatsapp', 'template',
    E'Bonjour {client_prenom}, je suis {agent_prenom} de {agence}. Merci de votre interet pour nos projets immobiliers. Je reste a votre disposition pour toute question.',
    ARRAY['{client_prenom}','{agent_prenom}','{agence}'], 10),
  ('accueil', 'catalogue', 'whatsapp', 'template',
    E'Voici notre catalogue de projets disponibles. N''hesitez pas a me dire ce qui vous interesse et votre budget approximatif pour que je puisse vous orienter au mieux.',
    ARRAY[]::TEXT[], 20),
  ('accueil', 'relance_1', 'whatsapp', 'template',
    E'Bonjour {client_prenom}, avez-vous eu le temps de regarder le catalogue que je vous ai envoye ? Je suis la si vous souhaitez plus d''infos ou organiser une visite.',
    ARRAY['{client_prenom}'], 30),
  ('accueil', 'relance_2', 'sms', 'template',
    E'{client_prenom}, {agent_prenom} de {agence}. Toujours interesse par nos projets ? Repondez STOP pour ne plus recevoir.',
    ARRAY['{client_prenom}','{agent_prenom}','{agence}'], 40),

  -- visite_a_gerer
  ('visite_a_gerer', 'confirm_visite', 'whatsapp', 'template',
    E'Bonjour {client_prenom}, je vous propose de visiter {projet}. Quel creneau vous arrange cette semaine ? Matin ou apres-midi ?',
    ARRAY['{client_prenom}','{projet}'], 10),
  ('visite_a_gerer', 'relance_1', 'whatsapp', 'template',
    E'{client_prenom}, avez-vous choisi un creneau pour la visite ? Je peux bloquer un horaire pour vous aujourd''hui.',
    ARRAY['{client_prenom}'], 20),

  -- visite_confirmee
  ('visite_confirmee', 'confirm_visite', 'whatsapp', 'template',
    E'Visite confirmee pour {client_prenom} le {date_visite} a {heure_visite} au projet {projet}. Adresse : {adresse_projet} ({lien_maps}). A bientot !',
    ARRAY['{client_prenom}','{date_visite}','{heure_visite}','{projet}','{adresse_projet}','{lien_maps}'], 10),
  ('visite_confirmee', 'rappel_j1', 'whatsapp', 'template',
    E'Rappel : visite demain {date_visite} a {heure_visite} au projet {projet}. Pensez a votre CIN. A demain !',
    ARRAY['{date_visite}','{heure_visite}','{projet}'], 20),
  ('visite_confirmee', 'rappel_jourj', 'sms', 'template',
    E'RDV aujourd''hui {heure_visite} au {projet}. {agent_prenom} {agent_phone}',
    ARRAY['{heure_visite}','{projet}','{agent_prenom}','{agent_phone}'], 30),

  -- visite_terminee
  ('visite_terminee', 'post_visite', 'whatsapp', 'template',
    E'Merci {client_prenom} pour votre visite de {unite_visitee} aujourd''hui. Qu''avez-vous pense du projet ? Je reste disponible pour repondre a vos questions.',
    ARRAY['{client_prenom}','{unite_visitee}'], 10),
  ('visite_terminee', 'simulation', 'whatsapp', 'template',
    E'Voici la simulation de prix pour {unite_visitee} : prix total {prix_unite}, apport {apport}, {nb_echeances} echeances. Qu''en pensez-vous ?',
    ARRAY['{unite_visitee}','{prix_unite}','{apport}','{nb_echeances}'], 20),

  -- negociation
  ('negociation', 'simulation', 'whatsapp', 'template',
    E'{client_prenom}, suite a notre echange, voici l''offre commerciale finale pour {unite_visitee} : {prix_unite}. Modalites de paiement sur mesure a discuter.',
    ARRAY['{client_prenom}','{unite_visitee}','{prix_unite}'], 10),
  ('negociation', 'collect_cin', 'whatsapp', 'template',
    E'Pour preparer votre dossier de reservation, pourriez-vous m''envoyer une photo de votre CIN (recto/verso) ? Merci !',
    ARRAY[]::TEXT[], 20),
  ('negociation', 'relance_1', 'whatsapp', 'template',
    E'{client_prenom}, ou en etes-vous dans votre reflexion ? Avez-vous besoin d''elements supplementaires pour decider ?',
    ARRAY['{client_prenom}'], 30),

  -- reservation
  ('reservation', 'felicitations', 'whatsapp', 'template',
    E'Felicitations {client_prenom} ! Votre reservation pour {unite_visitee} est enregistree. Prochaine etape : finaliser le dossier et valider l''echeancier.',
    ARRAY['{client_prenom}','{unite_visitee}'], 10),
  ('reservation', 'collect_cin', 'whatsapp', 'template',
    E'Pour finaliser le contrat de reservation, merci de m''envoyer : CIN (recto/verso), justificatif de revenus, justificatif de domicile.',
    ARRAY[]::TEXT[], 20),
  ('reservation', 'rappel_echeance', 'whatsapp', 'template',
    E'Bonjour {client_prenom}, echeance de {montant_echeance} prevue le {date_echeance}. Merci de confirmer les modalites de reglement.',
    ARRAY['{client_prenom}','{montant_echeance}','{date_echeance}'], 30),

  -- vente
  ('vente', 'felicitations', 'whatsapp', 'template',
    E'Felicitations {client_prenom} pour l''acquisition de {unite_visitee} ! Bienvenue dans la famille {agence}. Je reste votre interlocuteur privilegie.',
    ARRAY['{client_prenom}','{unite_visitee}','{agence}'], 10),
  ('vente', 'rappel_echeance', 'whatsapp', 'template',
    E'Rappel : prochaine echeance de {montant_echeance} le {date_echeance}. Merci de proceder au reglement.',
    ARRAY['{montant_echeance}','{date_echeance}'], 20),
  ('vente', 'post_visite', 'whatsapp', 'template',
    E'{client_prenom}, votre experience avec {agence} s''est-elle bien passee ? Si oui, connaissez-vous quelqu''un qui pourrait etre interesse par nos projets ?',
    ARRAY['{client_prenom}','{agence}'], 30),

  -- relancement
  ('relancement', 'relance_1', 'whatsapp', 'template',
    E'Bonjour {client_prenom}, cela fait un moment que nous n''avons pas echange. Vos projets immobiliers sont-ils toujours d''actualite ? Nous avons de nouvelles opportunites interessantes.',
    ARRAY['{client_prenom}'], 10),
  ('relancement', 'relance_2', 'sms', 'template',
    E'{client_prenom}, nouvelles unites disponibles chez {agence}. Interesse ? Repondez OUI pour en savoir plus.',
    ARRAY['{client_prenom}','{agence}'], 20),

  -- perdue
  ('perdue', 'raison_perte', 'whatsapp', 'template',
    E'Bonjour {client_prenom}, merci pour votre temps. Si vos besoins evoluent, n''hesitez pas a revenir vers nous. Bonne continuation !',
    ARRAY['{client_prenom}'], 10);

  RAISE NOTICE 'Seeded % bundles, % task templates, % message templates',
    (SELECT COUNT(*) FROM task_bundles),
    (SELECT COUNT(*) FROM task_templates),
    (SELECT COUNT(*) FROM message_templates);
END $$;
