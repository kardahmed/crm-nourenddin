# IMMO PRO-X v2 — Tests de Sécurité & Isolation

## Tests SQL (supabase/tests/rls_tests.sql)
Exécuter dans le SQL Editor Supabase. Vérifier les NOTICE dans l'onglet Messages.

| # | Test | Attendu | Status |
|---|------|---------|--------|
| 1 | Données test créées | 2 tenants, 3 projets, 3 unités | ☐ |
| 2 | RLS activé sur 17 tables | Toutes ✅ | ☐ |
| 3 | Policies configurées | 30+ policies sur 15+ tables | ☐ |
| 4 | Helper functions | get_user_tenant_id, get_user_role, is_super_admin | ☐ |
| 5 | Réservation → unité reserved/available | Transitions correctes | ☐ |
| 6 | Vente → unité sold | Transition correcte | ☐ |
| 7 | Triggers publics | 4 triggers critiques | ☐ |
| 8 | Cron functions | check_expired_reservations, check_overdue_payments | ☐ |
| 9 | Enums | 27 enums | ☐ |
| 10 | Indexes | 25+ custom indexes | ☐ |
| 11 | Tables | 17 tables | ☐ |

## Tests Frontend manuels

### Test Auth (navigateur)

| # | Test | Action | Attendu | Status |
|---|------|--------|---------|--------|
| F1 | Accès sans auth | Ouvrir /dashboard directement | Redirect → /login | ☐ |
| F2 | Login incorrect | Email/mdp incorrects | Message "Email ou mot de passe incorrect" | ☐ |
| F3 | Login correct | Credentials valides | Redirect → /dashboard | ☐ |
| F4 | Token expiré | Attendre expiration session | Redirect → /login automatique | ☐ |
| F5 | Compte inactif | Login avec compte status=inactive | Déconnexion forcée | ☐ |

### Test RBAC Agent (connecté en tant qu'agent)

| # | Test | Action | Attendu | Status |
|---|------|--------|---------|--------|
| R1 | Nav limitée | Vérifier sidebar | Agents et Paramètres absents | ☐ |
| R2 | URL /settings | Accéder directement à /settings | Page visible mais données filtrées | ☐ |
| R3 | URL /agents | Accéder directement à /agents | Page visible mais données filtrées | ☐ |
| R4 | Clients filtrés | Page Pipeline | Voit uniquement SES clients | ☐ |
| R5 | Visites filtrées | Page Planning | Voit uniquement SES visites | ☐ |
| R6 | Pas de delete | Actions sur un projet | Pas de bouton Supprimer | ☐ |
| R7 | Pas de création agent | Page Agents | Pas de bouton + Ajouter | ☐ |

### Test RBAC Admin (connecté en tant qu'admin)

| # | Test | Action | Attendu | Status |
|---|------|--------|---------|--------|
| A1 | Nav complète | Sidebar | Tous les liens visibles | ☐ |
| A2 | Voit tous les clients | Pipeline | Clients de tous les agents | ☐ |
| A3 | Manage agents | Page Agents | Bouton + visible, peut désactiver | ☐ |
| A4 | Settings accessible | Page Paramètres | 7 sections éditables | ☐ |
| A5 | Filtré par tenant | Données | Voit uniquement SON tenant | ☐ |
| A6 | Peut supprimer | Actions | Bouton supprimer visible (si canDeleteData) | ☐ |

### Test Isolation multi-tenant

| # | Test | Action | Attendu | Status |
|---|------|--------|---------|--------|
| T1 | Tenant A voit A | Dashboard Tenant A | KPIs = données A uniquement | ☐ |
| T2 | Tenant A ≠ B | Comparer avec Tenant B | Données complètement différentes | ☐ |
| T3 | API cross-tenant | Supabase query avec mauvais tenant_id | 0 résultats (RLS bloque) | ☐ |

### Test History immuable

| # | Test | Action | Attendu | Status |
|---|------|--------|---------|--------|
| H1 | Pas d'UPDATE | Tenter UPDATE history | Bloqué par RLS (pas de policy UPDATE sauf super_admin) | ☐ |
| H2 | Pas de DELETE | Tenter DELETE history | Bloqué par RLS (pas de policy DELETE sauf super_admin) | ☐ |
| H3 | INSERT OK | Ajouter une entrée | Fonctionne via policy INSERT | ☐ |

### Test Triggers automatiques

| # | Test | Action | Attendu | Status |
|---|------|--------|---------|--------|
| G1 | Stage change → history | Changer étape client | Entrée history auto avec from/to | ☐ |
| G2 | Réservation → unit reserved | Créer réservation | Unité passe à "reserved" | ☐ |
| G3 | Annulation → unit available | Annuler réservation | Unité revient à "available" | ☐ |
| G4 | Vente → unit sold | Créer vente | Unité passe à "sold" | ☐ |
| G5 | Vente → reservation converted | Créer vente sur unité réservée | Réservation passe à "converted" | ☐ |
| G6 | Contact → last_contact_at | Ajouter appel/message dans history | Client.last_contact_at mis à jour | ☐ |
| G7 | Login → last_activity | Se connecter | User.last_activity mis à jour | ☐ |
