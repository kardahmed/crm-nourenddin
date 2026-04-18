# CRM Noureddine

CRM single-tenant pour agence immobilière, basé sur React + Vite + Supabase.

## Stack

- **Frontend** : React 19, TypeScript, Vite, Tailwind 4, React Router 7, TanStack Query, Zustand
- **Backend** : Supabase (Postgres, Auth, Edge Functions, Storage)
- **PDF** : @react-pdf/renderer
- **i18n** : i18next (FR / AR)
- **Email** : Resend (via edge function)

## Démarrage local

```bash
npm install
cp .env.example .env  # puis renseigner les valeurs Supabase
npm run dev
```

## Configuration de la base de données

Les migrations vivent dans `supabase/migrations/`. Pour les appliquer sur une nouvelle base :

```bash
supabase login
supabase link --project-ref <YOUR_PROJECT_REF>
supabase db push
supabase gen types typescript --project-id <YOUR_PROJECT_REF> > src/types/database.generated.ts
```

## Créer le premier admin

1. Dans Supabase Dashboard → **Authentication → Users → Add user** (cocher *Auto Confirm User*)
2. Copier l'UID de l'utilisateur créé
3. Dans **SQL Editor** :

```sql
INSERT INTO users (id, first_name, last_name, email, role, status)
VALUES ('<UID>', '<Prénom>', '<Nom>', '<email>', 'admin', 'active');
```

## Edge functions

Déployer les fonctions :

```bash
supabase functions deploy
supabase functions deploy create-user --no-verify-jwt
```

Configurer les secrets nécessaires :

```bash
supabase secrets set RESEND_API_KEY=re_xxx
supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxx   # optionnel (scripts d'appel IA)
```

## Architecture des permissions

- **Admin** : accès complet (création projets, gestion agents, settings, marketing).
- **Agent** : voit uniquement ses propres clients / visites / réservations / ventes (RLS Postgres).
  Les permissions sont accordées par défaut (création/édition de ses clients, etc.) et peuvent être
  restreintes via les *Profils de permissions* depuis `/agents`.

## Structure

```
src/
├── App.tsx              # routes (lazy loaded)
├── components/          # UI partagée
├── hooks/               # data hooks (TanStack Query)
├── lib/                 # supabase client, helpers
├── pages/               # une route = un dossier
├── store/               # Zustand (auth)
└── types/               # types DB + permissions

supabase/
├── config.toml          # config CLI
├── migrations/          # 001 → 007 (single-tenant clean schema)
└── functions/           # edge functions Deno
```

## Déploiement (Vercel)

1. Push la branche sur GitHub
2. Importer le repo dans Vercel
3. Configurer les variables d'environnement :
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Build command : `npm run build` — output : `dist`

## Backups

Supabase Pro fait des snapshots quotidiens. Sur le plan gratuit, exporter manuellement via :

```bash
supabase db dump --data-only > backup.sql
```
