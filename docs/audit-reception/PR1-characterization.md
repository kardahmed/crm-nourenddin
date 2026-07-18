# Audit Réception / Attribution — PR1 (caractérisation)

> **Périmètre PR1 :** tests + documentation uniquement. **Aucune** migration, RPC,
> RLS, changement de comportement, SQL de production ou déploiement.
> Branche : `claude/audit-reception-attribution-sw1gwf`.

## 1. Faits de production prouvés (read-only, projet `xrgkrwmafzhlgganqdfj` / CRM NOUREDDINE)

Requêtes SELECT exécutées côté admin, résultats figés ici :

| Preuve | Résultat | Conclusion |
|---|---|---|
| Version RPC | `col_assigned_at=1`, `assign_client_to_agent=1`, `pick` ordonne sur `assigned_at`=**true**, sur `history.client_created`=**false** | **Migration 039 déployée** (bon algorithme) |
| `SHOW timezone` | `UTC` | Bornes serveur en UTC (≠ Alger UTC+1) |
| Répartition/agent (tout l'historique) | Marwa : **18** distribués RR / 9 perso ; Soumeya : **15** distribués RR / **88** perso ; `dernier_dispatch` = **2026-06-22** pour les deux | RR globalement équilibré ; dernier dispatch réel il y a ~1 mois |
| Dispatch vs créations (7 j) | `client_created`=**4**, `dispatch (kind=dispatch)`=**0** | Le « 3/1 » de la capture ne contient **aucun** dispatch RR |
| Origine des 6 derniers leads (14 j) | tous `distribué_réception=false` et `event_dispatch_RR=false` ; 18/07 créés par Lydia (source=reception), 13/07 auto-créés par Marwa (source=autre) | Créations directes/manuelles, **pas** de round-robin |
| Répartition par source (60 j) | `reception` : 23 total = 18 via dispatch + **5 directs** ; `autre` : 25, tous directs | Contournement du RR pour `reception` **récent** (juin→juillet) |

**Le « 3 Marwa / 1 Soumeya » est un artefact d'affichage du journal, pas une distribution round-robin.**

## 2. Chemin fautif identifié (prouvé par élimination dans le code)

Les 4 leads de Lydia (`agent_id` renseigné + `assigned_at` NULL + aucun event `kind=dispatch`) ne
peuvent venir que de l'unique point d'insertion frontend qui envoie `agent_id` sans RPC :

```
Pipeline → bouton « Nouveau client » (PipelinePage.tsx:448)
 → <ClientFormModal> (source = liste incluant « Réception », agent_id OBLIGATOIRE :39/:170)
 → useClients.createClient (useClients.ts:64-68) → supabase.from('clients').insert({ source, agent_id })
 → trigger log_client_created (012:41) : agent_id = COALESCE(NEW.agent_id, auth.uid())
 —— aucun assign_client_to_agent, aucun assigned_at, aucun event kind=dispatch ——
```

Lydia ayant assigné à deux agents différents (Soumeya ET Marwa) alors qu'un agent est verrouillé
sur lui-même (`:149-150`), c'est un compte **admin**.

## 3. Catalogue d'anomalies

| ID | Sévérité | Résumé | Preuve |
|---|---|---|---|
| A1 | P2 | Journal conflate perso/manuel/dispatch ; « Agent assigné » = `COALESCE(agent_id, auth.uid())`, pas de colonne méthode | `ReceptionJournal.tsx:80-127`, `012:41` |
| A2 | P2 (opérationnel) | Round-robin contourné en pratique (leads `source=reception` créés en direct) ; dernier dispatch 22/06 | SQL §1 |
| A3 | P1 (latent) | `assign_client_to_agent` non sérialisé (pas de lock) → même agent servi 2× / cap franchissable | `039:214-252` |
| A4 | P1 | Cap & rotation garantis seulement dans le RPC ; écriture directe `agent_id` possible (RLS) | `014:72-91` |
| A5 | P2 | Journal non immuable : `history.client_id ON DELETE CASCADE`, noms recalculés par jointure | `003:157`, `ReceptionJournal.tsx:80` |
| A6 | P2 | Fuseau : cap/pick en UTC (`date_trunc('day', now())`) vs UI en heure navigateur | `039:91,238`, `SHOW timezone=UTC` |
| A7 | P3 | V1/V2 de `pick_agent` (014 vs 039) ; `pickAgent` frontend sans départage stable par id | `014:167`, `039:66`, `useReceptionAssignment.ts:96-104` |
| A8 | P3 | `ReassignModal` double-log + n'update pas `assigned_at` | `ReassignModal.tsx:40-48` |

## 4. Verdict

**GO** pour maintenir le CRM disponible (moteur `039` correct et peu sollicité, pas de P0, mono-tenant sans fuite).
**NO-GO** pour présenter la Réception comme fonctionnant réellement en round-robin tant que flux,
atomicité, plafond et tests ne sont pas corrigés.

## 5. Conception cible validée (résumé) — implémentée à partir de PR2

- `clients` = état courant (`agent_id`, `current_assignment_method`, `current_assigned_at`, `current_assigned_by`) ; `assigned_at`/`assigned_by` conservés pendant Expand, supprimés en Contract.
- Table immuable `reception_assignment_events` (append-only, `event_sequence` monotone, snapshots figés, `client_id` sans FK) = **source de vérité** du journal, du plafond, de l'équité.
- `idempotency_operations` (`status in_progress|completed`, `request_hash`, `response_snapshot` nullable tant que `in_progress`, refus si même clé + payload différent).
- RPC publique unique `create_and_dispatch_reception_lead` (transaction : droits → idempotence → création sans agent → `pg_advisory_xact_lock(reception_lock_key())` → pick déterministe → cap Alger via `clock_timestamp()` → dispatch **ou** `capacity_exhausted` → événement immuable → mémorisation réponse). Fonctions internes `REVOKE ALL FROM PUBLIC/anon/authenticated`.
- Concepts séparés : `assignment_status` (unassigned/assigned/capacity_exhausted), `assignment_method` (round_robin/manual/manual_on_behalf/self_assigned/reassignment/transfer/import/unknown), `classification_source` (native_v2/proven_legacy/inferred_legacy/unknown_legacy). `assignment_method` NULL pour `lead_created`/`capacity_exhausted`.
- CHECK d'invariants sur les événements ; toutes les mutations idempotentes ; `create_personal_client` (agent, soi) vs `create_client_on_behalf` (admin) ; notifications via `notification_outbox` (post-commit).
- Backfill par preuve : dispatch prouvé → `round_robin` ; 0 ligne non prouvée en `round_robin` ; ambigu → `legacy_unknown`/`manual_unknown` ; rapport + échantillon.

## 6. Mapping spec cible → PR (specs skippées tant que non implémentées)

| Domaine (voir `src/pages/reception/reception-assignment.spec.ts`) | PR |
|---|---|
| Perso/manuel/on-behalf, idempotence, réassignation | PR2 |
| Atomicité, cap Alger, déterminisme, concurrence | PR3 |
| Reconnexion réception, résultat explicite | PR4 |
| Anti-contournement (grants/REVOKE) | PR5 |
| Journal & stats depuis events | PR6 |
| Immuabilité audit | PR7 |

## 7. Contenu de PR1

- `src/hooks/useReceptionAssignment.characterization.test.ts` — caractérisation **verte** de `pickAgent` (display-only, divergences figées).
- `src/pages/reception/reception-assignment.spec.ts` — specs cibles **skippées** (jamais rouges).
- `docs/audit-reception/PR1-characterization.md` — ce document.

**Aucun fichier de production, SQL ou migration modifié.**
