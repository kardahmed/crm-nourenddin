# PR2A — Réception V2 : expansion additive du schéma

> **Migration :** `supabase/migrations/040_reception_v2_expand_schema.sql`
> **Tests :** `supabase/tests/reception_v2_expand.test.sql`
> **Nature :** 100 % additif et réversible. Aucun changement de comportement.
> Branche : `chore/reception-v2-expand-schema` (basée sur `main` @ `8aad41d`).

## Objectif

Poser les fondations de données du futur système d'attribution (Réception V2)
sans modifier le CRM actuel. Phase **Expand** du cycle Expand → Migrate → Switch
→ Contract.

## Schéma ajouté

### Enums séparés (statut ≠ méthode ≠ classification)
- `assignment_status` : `unassigned`, `assigned`, `capacity_exhausted`.
- `assignment_method` : `round_robin`, `manual`, `manual_on_behalf`,
  `self_assigned`, `reassignment`, `transfer`, `import`, `unknown`.
- `assignment_classification_source` : `native_v2`, `proven_legacy`,
  `inferred_legacy`, `unknown_legacy`.

### Colonnes additives sur `clients` (état courant, nullables, sans défaut)
`assignment_status`, `current_assignment_method`,
`assignment_classification_source`, `current_assigned_at`,
`current_assigned_by` (→ `users(id) ON DELETE SET NULL`).
Les colonnes legacy `agent_id`, `assigned_at`, `assigned_by` sont **conservées**.

### `reception_assignment_events` (append-only, future source de vérité)
`event_sequence` (identité monotone) + snapshots figés + invariants CHECK.
`client_id` **sans FK** (choix délibéré, voir ci-dessous). `previous_agent_id`,
`new_agent_id`, `actor_id` → `users(id) ON DELETE SET NULL`.

### `idempotency_operations`
`status ∈ {in_progress, completed}`, `request_hash`, `actor_id`,
`response_snapshot` (nullable tant que `in_progress`), PK
`(operation_type, idempotency_key)`. **Schéma seul** — le protocole
transactionnel arrive en PR2B.

### `notification_outbox`
Aucune outbox équivalente n'existait (`notifications` est un magasin in-app,
`push_subscriptions` des endpoints web-push). `status ∈ {pending, processing,
sent, failed}`. **Aucun worker, aucun envoi** en PR2A.

## Décisions métier reflétées

| Décision | Traduction schéma |
|---|---|
| Statut ≠ méthode ≠ classification | trois enums distincts ; `pending`/`legacy_unknown`/`manual_unknown` ne sont PAS des méthodes |
| Manuel/réassignation hors RR | `counts_toward_round_robin` ne peut être vrai que pour `dispatched`/`round_robin` (CHECK) |
| `capacity_exhausted` explicite | event dédié, agent NULL, `reason='capacity_exhausted'` (CHECK) |
| `self_assigned` strict | `actor_id = new_agent_id` obligatoire (CHECK) |
| Audit immuable | append-only (trigger `forbid_mutation`) + snapshots + `client_id` sans FK |
| Pointeur RR monotone | `event_sequence BIGINT GENERATED ALWAYS AS IDENTITY` ; le pointeur utilisera `MAX(event_sequence)` |
| Idempotence complète | table `idempotency_operations` avec `request_hash` (refus cross-payload en PR2B) |

## `client_id` sans clé étrangère — pourquoi

`reception_assignment_events.client_id` n'a **pas** de FK vers `clients`.
Objectif : **conserver l'audit même après suppression d'un client** (une FK
`ON DELETE CASCADE` effacerait l'historique ; `RESTRICT` empêcherait la
suppression légitime d'un client). Les `*_snapshot` figent les libellés pour
rester lisibles sans jointure.

## Différences statut / méthode / classification

- **statut** = où en est le lead (`unassigned`/`assigned`/`capacity_exhausted`).
- **méthode** = comment l'agent a été choisi (`round_robin`, `manual`, …).
- **classification** = fiabilité de la donnée historique (`native_v2` pour tout
  événement produit par V2 ; les valeurs `*_legacy` seront réservées au backfill
  de PR2B, jamais posées par défaut).

## Volontairement NON activé en PR2A

Aucune RPC métier ; aucun backfill ; aucune double-écriture ; aucune bascule du
journal/des stats ; aucune révocation des droits sur `clients` ; aucun trigger
bloquant sur `clients` ; aucune policy RLS existante modifiée ; `assign_client_to_agent`
et le Round-robin actuel **intacts**.

## Sécurité / append-only

RLS activée (deny-all, aucune policy) **+** `REVOKE ALL … FROM anon,
authenticated` sur les trois tables internes. Trigger `forbid_mutation` bloque
`UPDATE`/`DELETE` sur les événements. **Note honnête :** cette protection
s'applique aux **rôles applicatifs** ; le propriétaire de la base / un
superutilisateur peut la contourner (désactiver le trigger).

## Expand → Migrate → Switch → Contract

- **Expand (cette PR)** : ajout des enums, colonnes, tables, contraintes, index.
  Additif, réversible.
- **Migrate (PR2B)** : protocole d'idempotence, RPC internes, double-écriture,
  backfill par preuve (`native_v2`/`proven_legacy`/`inferred_legacy`/`unknown_legacy`).
- **Switch (PR3–PR6)** : bascule lecture (journal, équité, cap, pointeur) vers
  les événements ; atomicité + plafond ; reconnexion du canal réception.
- **Contract (PR5/PR7)** : révocation des écritures directes ; suppression de
  `assigned_at`/`assigned_by` une fois la bascule stabilisée.

## Rollback

Additif ⇒ réversible sans perte : `DROP TABLE reception_assignment_events,
idempotency_operations, notification_outbox;` `ALTER TABLE clients DROP COLUMN …`
(les 5 nouvelles colonnes) ; `DROP FUNCTION forbid_mutation();` `DROP TYPE …`.
Les colonnes legacy et le comportement actuel étant inchangés, un rollback
n'impacte aucun flux en production.

## Risques

- Faible : additif, aucune écriture, aucun flux ne lit encore ces objets.
- Les nouvelles colonnes de `clients` sont lisibles/écrivables par qui a déjà
  accès à `clients` jusqu'à PR5 (verrouillage colonne) ; sans impact car aucun
  code ne les touche.

## Validation locale (PostgreSQL 16)

Migration appliquée sur une base de test avec stubs `users`/`clients` :
`MIGRATION 040 APPLIED OK`, ré-application idempotente OK, tests SQL
`PR2A SCHEMA TESTS: ALL PASS` + `PR2A PERMISSION TESTS: ALL PASS`. Frontend :
`tsc` OK, `build` ✓, `vitest` 25 passed / 31 skipped.

## Prochaine étape — PR2B (NO-GO tant que non validé)

Protocole transactionnel d'idempotence, RPC internes
(`create_and_dispatch_reception_lead`, etc.), double-écriture, backfill par
preuve. **PR2B–PR7 restent NO-GO.**
