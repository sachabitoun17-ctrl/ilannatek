# Architecture — Ilannatek (plateforme multi-studios)

Revue d'architecture + plan de correction. Ce document fait foi.

---

## 1. Le problème actuel (ce qui est « n'importe quoi »)

Aujourd'hui l'app est **mono-studio déguisée** :

- `/` (la home) est la **landing du studio Ilannatek** (planning, tarifs, instructeurs). ❌
  → Or `/` devrait vendre **la plateforme** à des gérants de studios (nos clients).
- Les pages membres (`/schedule`, `/welcome`, `/packs`, `/account`…) sont **globales**, pas rattachées à un studio. ❌
  → Un membre devrait vivre **uniquement dans l'espace de SON studio**.
- Les données (Session, Plan, ClassType, Settings…) ne portent **aucun `studioId`**. ❌
  → Impossible d'avoir deux studios sans que leurs cours/membres se mélangent.

Conséquence : on ne peut pas onboarder un 2ᵉ client sans tout casser.

---

## 2. Le modèle cible (deux surfaces distinctes)

```
┌─────────────────────────────────────────────────────────────┐
│  SURFACE A — PLATEFORME (notre produit SaaS)                 │
│  Public : gérants de studios (= nos clients), prospects, nous│
│                                                              │
│   /                  landing SaaS « gérez votre studio »     │
│   /tarifs            les plans STARTER / PRO / SCALE          │
│   /demo, /signup     créer un compte studio                  │
│   /superadmin        NOUS : tous les comptes & studios       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  SURFACE B — STUDIO (l'espace d'un studio précis)           │
│  Public : les membres de CE studio uniquement                │
│                                                              │
│   /studio/[slug]              vitrine publique du studio      │
│   /studio/[slug]/schedule     planning + réservation          │
│   /studio/[slug]/login        connexion (scopée au studio)    │
│   /studio/[slug]/welcome      espace membre                   │
│   /studio/[slug]/account      compte, crédits, QR             │
│   /studio/[slug]/admin        admin DE CE studio              │
│   /studio/[slug]/instructor   espace instructeur de ce studio │
└─────────────────────────────────────────────────────────────┘
```

**Règle d'or :** un membre n'existe que dans **un** studio. Il ne peut ni voir,
ni réserver, ni se connecter à un autre studio.

---

## 3. Le modèle de données

```
Account (le client qui paie)
  └── Studio (slug)                ← l'unité de tenant
        ├── User (membres, admins, instructeurs)   .studioId
        ├── Session / ClassType / Location          .studioId
        ├── Plan / PromoCode                        .studioId
        └── Settings (1 par studio)                 .studioId
```

- **Account** : facturation SaaS (plan STARTER/PRO/SCALE). Peut posséder plusieurs Studios (une chaîne).
- **Studio** : l'unité de cloisonnement. Tout porte un `studioId`.
- **SUPERADMIN** : `studioId = null`, voit tout. **ADMIN/INSTRUCTOR/USER** : rattachés à un studio.

### Rôles & périmètre

| Rôle | studioId | Accès |
|---|---|---|
| `SUPERADMIN` | null | `/superadmin` — tous les studios |
| `ADMIN` | son studio | `/studio/[slug]/admin` — son studio seul |
| `INSTRUCTOR` | son studio | `/studio/[slug]/instructor` |
| `USER` | son studio | `/studio/[slug]/welcome` |

---

## 4. Résolution du studio courant

Un seul helper, `getStudioContext()`, source unique de vérité :

- **Surface B publique** (`/studio/[slug]/*`) → studio résolu depuis le **slug d'URL**.
- **Connecté** → studio résolu depuis **`user.studioId`** ; si le slug d'URL ≠ studio du user → 404/redirect. Un membre ne peut pas « sortir » de son studio en changeant l'URL.
- Toutes les requêtes métier passent par un wrapper `scopedDb(studioId)` qui injecte `where: { studioId }`. Aucune requête métier ne s'exécute sans studio.

---

## 5. Plan de migration (par étapes, sans casser la prod)

### ✅ Phase 0 — FAIT
- Modèles `Account` + `Studio` (slug).
- Rôle `SUPERADMIN` + `/superadmin` (console plateforme).
- **`User.studioId`** ajouté ; backfill SQL : tous les membres existants → `stu_ilannatek`.
- Seed : compte + studio + superadmin.

### ▶ Phase 1 — Routage (prochaine étape, la grosse)
1. Créer le groupe de routes `app/studio/[slug]/` et **y déplacer** les pages membres/admin/instructeur actuelles.
2. `app/page.tsx` devient la **landing SaaS** (vend la plateforme).
3. `getStudioContext()` + layout `studio/[slug]/layout.tsx` qui résout le studio et le passe en contexte.
4. Auth scopée : `register`/`login` sous `/studio/[slug]`, redirections vers `/studio/[slug]/welcome`. Garde : `user.studioId` doit matcher le slug.
5. Redirections de compat : anciens liens `/schedule` → `/studio/[defaultSlug]/schedule` tant qu'il n'y a qu'un studio.

### ▶ Phase 2 — Scoping des données
- Ajouter `studioId` (NOT NULL après backfill) sur `Session`, `Location`, `ClassType`, `Plan`, `PromoCode`, `RecurringRule`.
- `Settings` : passe de singleton à **1 ligne par studio** (PK = `studioId`).
- Injecter `where: { studioId }` dans **toutes** les requêtes (via `scopedDb`).
- Widget public : `/api/widget/sessions?studio=slug`.

### ▶ Phase 3 — Confort SaaS
- Onboarding self-service (un gérant crée son studio + slug + importe ses cours).
- Domaines personnalisés (`reserver.monstudio.fr`).
- Facturation Stripe au niveau Account (abonnement plateforme).

---

## 6. Décisions tranchées

- **Routage par chemin `/studio/[slug]`** (pas sous-domaine) : simple, déployable tout de suite, pas de DNS wildcard. Les sous-domaines viendront en Phase 3 sans rien casser (un middleware réécrira `slug.domaine` → `/studio/slug`).
- **Account ≠ Studio** dès le départ : une chaîne (plusieurs lieux, 1 facture) est un cas réel.
- **Slug porté par le Studio** (pas l'Account) : c'est le lieu qu'on réserve.
- **Migration additive** : on ne réécrit pas 100 requêtes d'un coup ; on déplace les routes, on backfill vers un studio par défaut, puis on scope progressivement. La prod reste en ligne à chaque étape.

---

## 7. Fichiers clés

| Fichier | Rôle |
|---|---|
| `prisma/schema.prisma` | `Account`, `Studio`, `User.studioId` |
| `src/lib/auth.ts` | `requireSuperAdmin()`, `requireAdmin()` |
| `src/lib/studio.ts` *(à créer)* | `getStudioContext()`, `scopedDb()` |
| `src/app/page.tsx` | → deviendra la landing SaaS |
| `src/app/studio/[slug]/` *(à créer)* | l'espace d'un studio |
| `src/app/superadmin/` | console plateforme |
| `prisma/migrations/fix_missing_columns.sql` | rattrapage prod (Account/Studio/studioId + backfill) |
