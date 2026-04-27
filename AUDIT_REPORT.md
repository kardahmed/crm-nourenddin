# 📋 Audit Complet de la Plateforme CRM Noureddine

**Date :** 2026-04-27  
**Branche :** `claude/fix-payment-method-error-IgHNL`  
**Statut :** ✅ Audit terminé, correctifs en cours d'application

---

## 🎯 Problème Initial

**Erreur :** `"Could not find the 'payment_method' column of 'clients' in the schema cache"`  
**Contexte :** Quand la réception essaie d'ajouter un client via le formulaire "Nouveau contact"

**Cause racine :** La base de données live est restée sur l'ancien schéma multi-tenant (archivé dans `supabase/migrations/_archive/`), alors que les migrations actives 001-033 définissent un schéma single-tenant. La colonne `payment_method` ajoutée à migration 003 n'a jamais été appliquée car `CREATE TABLE IF NOT EXISTS` ne s'exécute pas si la table existe déjà.

---

## 📊 Résultats d'Audit

### 1. **ENUMs SQL ↔ TypeScript**

| Enum | Status | Détail |
|------|--------|--------|
| user_role | 🔴 | `'reception'` absent de SQL, présent en TS |
| history_type | 🔴 | 4 valeurs manquantes en SQL : `'client_created'`, `'reassignment'`, `'priority_change'`, `'budget_change'` |
| 13 autres | ✅ | Parfaitement synchronisés |

**Impact :** INSERT/UPDATE échouera si on envoie ces valeurs en BD.

### 2. **Edge Functions ↔ Frontend**

| Audit | Status | Notes |
|-------|--------|-------|
| Appels FE → Functions | ✅ | Toutes les fonctions appelées existent |
| Payloads | ✅ | Alignés, aucune divergence |
| RPC calls | ✅ | Tous les RPC existent en BD |
| Sécurité | ✅ | JWT et vérifications correctes |

**Verdict :** ✅ **EXCELLENT** — Aucun problème détecté.

### 3. **Routes, Permissions, RLS**

| Élément | Status | Détail |
|---------|--------|--------|
| Routes | ✅ | Toutes les pages existent |
| RLS | ✅ | Migrations 014-015 ont fermé les trous critiques |
| Isolation roles | ✅ | Clients gelés commercialement, sales/reservations protégés |
| Permission FE | ⚠️ | Reception ne déclare pas avoir `visits.edit`, mais RLS l'autorise |

**Verdict :** ✅ **CONFORME** — Système sécurisé. Anomalie mineure : incohérence FE/RLS sur visits.edit.

### 4. **Tables DB ↔ TypeScript**

| Issue | Criticité | Détail |
|-------|-----------|--------|
| `tenant_id` fantôme | 🔴 | Types TS ajoutent `tenant_id` (multi-tenant) absent du schéma single-tenant réel |
| `app_settings` vs `tenant_settings` | 🔴 | Types TS référencent une table qui n'existe pas en BD |
| Tables manquantes | 🟡 | `client_tasks`, `call_scripts`, `push_subscriptions`, etc. absentes de types TS |
| `phone_normalized` | 🟡 | Colonne ajoutée en M23, manquante en types TS |

**Impact :** PostgREST rejet quand code tente INSERT/UPDATE sur email tables, payment schedules, etc. avec `tenant_id`.

---

## ✅ Correctifs Appliqués

### Migration 034 : `034_clients_payment_method_fix.sql`

```sql
-- Ajoute la colonne payment_method si manquante
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS payment_method payment_method;

-- Recharge le cache PostgREST
NOTIFY pgrst, 'reload schema';
```

**Status :** ✅ Exécutée manuellement en BD, puis documentée dans la migration.

### Migration 035 : `035_fix_missing_enum_values.sql`

```sql
-- Ajoute 'reception' à user_role
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'reception';

-- Ajoute 4 valeurs à history_type
ALTER TYPE public.history_type ADD VALUE IF NOT EXISTS 'client_created';
ALTER TYPE public.history_type ADD VALUE IF NOT EXISTS 'reassignment';
ALTER TYPE public.history_type ADD VALUE IF NOT EXISTS 'priority_change';
ALTER TYPE public.history_type ADD VALUE IF NOT EXISTS 'budget_change';

-- Recharge PostgREST
NOTIFY pgrst, 'reload schema';
```

**Status :** ✅ Créée et committée.

---

## 🔲 Actions Restantes

### Priorité HAUTE (avant production)

| Action | Fichier | Notes |
|--------|---------|-------|
| Régénérer types TS | `src/types/database.generated.ts` | Exécuter `npx supabase gen types typescript --schema public` une fois Docker/Supabase CLI disponible. Cela retirera tous les `tenant_id` fantômes et ajoutera les colonnes manquantes. |
| Tester réception | UI Réception | Tenter de créer un client via "Nouveau contact" → vérifier que l'erreur `payment_method` n'apparaît plus. |
| Auditer email campaigns | Code FE | Vérifier que `.insert({ email_templates })` ne contient **pas** `tenant_id`. |

### Priorité MOYENNE (amélioration)

- Ajouter types TS pour `client_tasks`, `call_scripts`, `task_bundles`, `push_subscriptions`
- Corriger incohérence FE : ajouter permission `visits.edit` à reception si RLS l'autorise réellement
- Valider que `app_settings` est bien la table active (pas `tenant_settings`)

---

## 📋 Tables Auditées

**Single-tenant (OK) :**  
`clients`, `visits`, `reservations`, `sales`, `payment_schedules`, `charges`, `sale_amenities`, `sale_charges`, `history`, `documents`, `users`, `projects`, `units`

**Avec types TS manquantes :**  
`client_tasks`, `task_bundles`, `task_templates`, `call_scripts`, `call_responses`, `message_templates`, `sent_messages_log`, `push_subscriptions`, `permission_profiles`

**Avec types TS contenant `tenant_id` (obsolète) :**  
`email_templates`, `email_campaigns`, `email_campaign_recipients`, `email_events`, `email_logs`

---

## 🎓 Apprentissages

1. **Migrations archivées vs actives** : Le dossier `_archive/` contient l'ancien schéma. Les migrations 001-033 sont le schéma cible. Ne pas mélanger.
2. **CREATE TABLE IF NOT EXISTS** : Ne corrige jamais les colonnes manquantes. Utiliser `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` pour les ajouts après coup.
3. **Database.ts sync** : Régénérer régulièrement via `supabase gen types` pour éviter la dérive.
4. **Enum évolution** : PostgreSQL `ALTER TYPE ... ADD VALUE` est irrévocable. Tester avant d'ajouter à la main.

---

## Commit

```
f74fd85 fix: add payment_method column + missing enum values (migrations 034-035)
```

**Branch :** `claude/fix-payment-method-error-IgHNL`  
**Push :** ✅ Effectué

---

**Prochain pas :** Tester la création de client par la réception pour confirmer que l'erreur est résolue. Puis régénérer les types TypeScript quand Supabase CLI sera disponible.
