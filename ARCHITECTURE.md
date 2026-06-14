# Architecture — Ilannatek (multi-tenant)

Ce document décrit comment la plateforme passe d'**un seul studio** à un **SaaS multi-clients**, et pourquoi le découpage est fait ainsi.

## Le modèle mental

```
Account (le client qui nous paie)
  └── Studio (un lieu réservable, identifié par un slug)
        └── Sessions / Plans / Membres / Réglages  (les données métier)
```

- **Account** = une entreprise cliente (une marque). C'est l'entité de facturation côté SaaS (plan STARTER / PRO / SCALE).
- **Studio** = un lieu physique réservable, adressé par un `slug` unique (`/studio/ilannatek-paris`). Un Account peut en avoir **plusieurs**.
- **SUPERADMIN** = nous (le propriétaire de la plateforme). Voit tous les Accounts et Studios via `/superadmin`.
- **ADMIN** = le gérant d'un studio. Voit uniquement **son** studio via `/admin`.

## Les rôles

| Rôle | Périmètre | Espace |
|---|---|---|
| `SUPERADMIN` | Toute la plateforme, tous les clients | `/superadmin` |
| `ADMIN` | Un studio (son studio) | `/admin` |
| `INSTRUCTOR` | Ses cours | `/instructor` |
| `USER` | Membre d'un studio | `/welcome` |

`requireSuperAdmin()` et `requireAdmin()` (qui accepte aussi SUPERADMIN) sont dans `src/lib/auth.ts`.

## Routage par slug (cible)

```
/                         → site vitrine de la plateforme (marketing SaaS)
/studio/[slug]            → page publique d'un studio (planning, tarifs)
/studio/[slug]/schedule   → réservation pour ce studio
/welcome                  → espace membre (scopé à son studio)
/admin                    → admin du studio courant
/superadmin               → console plateforme (tous les clients)
```

Le slug du studio est résolu en `Studio` → `studioId`, injecté dans toutes les requêtes métier.

## Phasage (important)

L'architecture est introduite **sans casser l'app existante**, en deux temps.

### Phase 1 — FAIT (cette itération)
- Modèles `Account` + `Studio` ajoutés au schéma (additifs, non bloquants).
- Rôle `SUPERADMIN` + `requireSuperAdmin()`.
- Console `/superadmin` : liste des comptes, studios, et KPIs plateforme (MRR, revenu, membres, séances).
- Seed : compte `ilannatek` + studio `ilannatek-paris` + utilisateur superadmin.
- Les données métier (Session, Plan, User…) restent **globales** : il n'y a qu'un studio, donc tout lui appartient implicitement.

### Phase 2 — À FAIRE (scoping des données)
Quand on signe le 2ᵉ client, on scope les données par studio :

1. Ajouter `studioId String` (FK → Studio) sur : `User`, `Session`, `Location`, `ClassType`, `Plan`, `PromoCode`, `Settings`, `RecurringRule`.
   - Migration : `UPDATE … SET "studioId" = 'stu_ilannatek'` pour l'existant, puis passer la colonne en `NOT NULL`.
2. Centraliser la résolution du studio courant dans un helper `getStudioContext()` (depuis le slug d'URL pour le public, depuis `user.studioId` pour les espaces connectés).
3. Ajouter `where: { studioId }` à **toutes** les requêtes Prisma métier. Un wrapper `scopedDb(studioId)` ou un middleware Prisma garantit qu'on n'oublie aucune requête.
4. `Settings` devient **par studio** (aujourd'hui singleton) : la PK passe de `'singleton'` à `studioId`.
5. Le widget public (`/api/widget/sessions`) prend un paramètre `?studio=slug`.

### Phase 3 — Confort SaaS
- Onboarding self-service : un Account crée son Studio, choisit son slug, importe ses cours.
- Domaines personnalisés (`reserver.monstudio.fr` → résout vers le bon studio).
- Facturation Stripe au niveau Account (abonnement SaaS), distincte des paiements membres.
- Rôles fins : un ADMIN multi-studios (chaîne) vs un ADMIN mono-studio.

## Pourquoi ce découpage

- **Account ≠ Studio** dès le départ : une chaîne (plusieurs lieux, une facturation) est un cas réel ; les fusionner obligerait à tout refondre plus tard.
- **Slug porté par le Studio** (pas l'Account) : c'est le lieu qu'on réserve, donc l'URL publique s'articule autour du studio.
- **Scoping additif** : on ne réécrit pas 100 requêtes d'un coup. On introduit la structure, on migre l'existant vers un studio par défaut, puis on scope progressivement — l'app reste en production à chaque étape.
- **SUPERADMIN séparé d'ADMIN** : un gérant de studio ne doit jamais voir les données d'un autre client. La frontière est un rôle, pas une convention.

## Fichiers clés

| Fichier | Rôle |
|---|---|
| `prisma/schema.prisma` | Modèles `Account`, `Studio` |
| `src/lib/auth.ts` | `requireSuperAdmin()`, `requireAdmin()` |
| `src/app/superadmin/` | Console plateforme |
| `prisma/seed.ts` | Seed compte + studio + superadmin |
| `prisma/migrations/fix_missing_columns.sql` | Rattrapage prod (inclut Account/Studio) |
