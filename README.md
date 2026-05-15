# ilannatek

Plateforme open-source de réservation pour studio boutique — alternative à Mariana Tek.
Conçue pour un studio recevant jusqu'à ~300 visites physiques / 1000 visites web par jour.

## Stack

- **Next.js 14** (App Router, Server Actions, TypeScript)
- **Prisma** + **SQLite** en dev, prêt pour **PostgreSQL** en prod
- **Tailwind CSS**
- Auth maison : JWT en cookie `httpOnly`, `bcryptjs`, session versionning pour révocation
- Paiement : **Stripe Checkout** (HMAC webhook, fallback simulé hors prod)
- Email : **Resend** (fallback console en dev)
- Rate limiting in-memory (swap Redis/Upstash en horizontal scale)
- Validation : **Zod**

## Démarrage rapide

```bash
cp .env.example .env
npm install
npm run db:reset   # crée la DB + seed
npm run dev
```

Ouvre http://localhost:3000

## Comptes de démo

- **Admin** : `admin@ilannatek.fr` / `admin1234`
- **Membre** : `membre@ilannatek.fr` / `member1234`
- **Instructeur** : `camille@ilannatek.fr` / `instructor1234`

Code promo de test : `BIENVENUE10` (10% sur premier achat)

## Fonctionnalités

### Espace client
- Inscription / connexion (rate-limit 5/15min par email, 20/15min par IP)
- Compte personnel : prochaines réservations, abonnements, historique des transactions
- Planning : vue **jour** (par défaut) ou **semaine**, filtre par studio, navigation rapide
- Réservation avec débit de crédits
- Liste d'attente automatique si complet, promotion auto à l'annulation d'un autre
- Annulation avec remboursement intégral si dans les délais, **frais d'annulation tardive** sinon
- Achat de packs et abonnements via **Stripe Checkout**
- Codes promo (% / montant fixe / crédits offerts)
- Self check-in via URL/QR : `/check-in/{sessionId}`

### Espace instructeur (`/instructor`)
- Vue de ses propres cours à venir et historique
- Pointage : marquer Présent / Absent / annuler
- **Frais d'absence** automatiquement débités sur NO_SHOW
- Page check-in : cours dans la fenêtre ±1h

### Espace administrateur (`/admin`)
- Tableau de bord (membres, cours du jour, CA du mois)
- **Reporting** : revenus, top instructeurs, top cours, taux de remplissage, no-shows, churn signals
- CRUD séances + bulk **séances récurrentes** (jours de la semaine sur intervalle)
- Gestion des réservations, présences, listes d'attente
- CRUD types de cours, studios, instructeurs, plans, codes promo
- Membres : ajustement de crédits, changement de rôle, ban
- **Paramètres** du studio : cancellation cutoff, frais, fenêtre de réservation, crédits de bienvenue, expéditeur email
- **Journal d'audit** complet (toutes les actions admin + login + checkout)

### Automation
- `GET /api/cron/subscriptions?key=...` (horaire) : renouvelle / expire les abonnements
- `GET /api/cron/reminders?key=...` (horaire) : email J-1 pour chaque cours confirmé
- `POST /api/stripe/webhook` : checkout completed, payment failed, subscription deleted
- `GET /api/health` : ping DB pour monitoring uptime

## Déploiement production

### 1. Base de données

Migre vers PostgreSQL :

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Puis `npx prisma migrate deploy`.

> SQLite peut tenir 1000 visites/jour en single-process mais bloque dès qu'on
> passe en multi-instance (Vercel, Fly, Cloud Run). PostgreSQL est obligatoire
> dès qu'on déploie en serverless.

### 2. Variables d'environnement

```
DATABASE_URL=postgresql://...
AUTH_SECRET=$(openssl rand -hex 32)
NEXT_PUBLIC_SITE_URL=https://votre-domaine.fr
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_API_KEY=re_...
CRON_SECRET=$(openssl rand -hex 32)
```

### 3. Stripe

1. Crée un compte Stripe, récupère `STRIPE_SECRET_KEY` (live ou test).
2. Crée tes produits et prix dans le dashboard Stripe.
3. Renseigne `stripePriceId` sur chaque `Plan` (page admin/plans, ou directement
   en base) — sinon Stripe créera un prix ad-hoc.
4. Configure le webhook Stripe sur `https://votre-domaine.fr/api/stripe/webhook`
   en écoutant : `checkout.session.completed`, `invoice.payment_failed`,
   `customer.subscription.deleted`.
5. Colle le `whsec_...` dans `STRIPE_WEBHOOK_SECRET`.

### 4. Crons

Avec **Vercel Cron** (`vercel.json`) :

```json
{
  "crons": [
    { "path": "/api/cron/subscriptions?key=YOUR_CRON_SECRET", "schedule": "0 * * * *" },
    { "path": "/api/cron/reminders?key=YOUR_CRON_SECRET", "schedule": "0 9 * * *" }
  ]
}
```

Avec un cron Unix classique :

```cron
0 * * * * curl -s "https://votre-domaine.fr/api/cron/subscriptions?key=$CRON_SECRET"
0 9 * * * curl -s "https://votre-domaine.fr/api/cron/reminders?key=$CRON_SECRET"
```

### 5. Rate limiting

Le module `src/lib/rate-limit.ts` utilise une Map en mémoire. C'est suffisant pour
une seule instance. Si tu déploies en multi-instance ou en serverless, remplace
l'implémentation par Upstash Redis (interface identique).

### 6. Monitoring

- `/api/health` : check DB, à brancher sur UptimeRobot / Better Stack
- `AuditLog` : conserve toutes les actions sensibles, à interroger pour les
  incidents
- `LoginAttempt` : trace tous les essais de connexion

## Structure

```
src/
  app/
    (auth)/                  login, register, logout
    schedule/                planning (vue jour/semaine)
    packs/                   packs de crédits + checkout
    subscriptions/           abonnements
    account/                 espace membre
    checkout/{success,cancel}
    check-in/[sessionId]/    self check-in (client final)
    instructor/              espace instructeur
    admin/                   back-office complet
    api/
      stripe/webhook         webhook Stripe
      cron/subscriptions     renouvellement abonnements
      cron/reminders         rappels J-1
      health                 health check
  components/
  lib/
    db.ts          Prisma singleton
    auth.ts        JWT cookies, sessionVersion, rôles
    booking.ts     réservation, waitlist, annulation, fees
    checkout.ts    flow Stripe + idempotence
    promo.ts       codes promo
    stripe.ts      client REST Stripe + HMAC webhook verification
    email.ts       service email (Resend / console)
    settings.ts    config studio cachée 30s
    rate-limit.ts  sliding window in-memory
    audit.ts       journal d'événements
    enums.ts       Zod enums (SQLite n'a pas les enums natifs)
    utils.ts       date/prix
  middleware.ts    security headers (HSTS, CSP, X-Frame-Options...)
prisma/
  schema.prisma
  seed.ts
```

## Modèle de données

### Entités principales
- `User` (rôle USER/INSTRUCTOR/ADMIN, solde, sessionVersion pour révocation, stripeCustomerId)
- `Session` (séance planifiée, capacité, cutoff personnalisable)
- `Booking` (CONFIRMED/WAITLIST/CANCELLED/ATTENDED/NO_SHOW, feeApplied, promotedFromWaitlistAt)
- `Plan` (CREDIT_PACK ou SUBSCRIPTION, introOnly, maxPerUser, stripePriceId)
- `Subscription` (ACTIVE/CANCELLED/EXPIRED/FROZEN, autoRenew)
- `Transaction` (journal financier, paymentStatus, stripeRef pour idempotence)
- `PromoCode` + `PromoRedemption`
- `Settings` singleton studio-wide
- `RecurringRule` (génération bulk de séances)

### Sécurité
- `AuditLog` : qui a fait quoi, quand, depuis quelle IP
- `LoginAttempt` : tentatives de connexion (réussies et échouées) avec IP
- `CheckIn` : trace les pointages avec source (QR/MANUAL/SELF)

## Décisions techniques

- **Stripe sans le SDK** : on hit l'API REST directement (3 endpoints) pour ne
  pas charger le SDK officiel qui pèse lourd. Si tu ajoutes Refunds, Customer
  Portal, etc., installe le package `stripe`.
- **Idempotence** : chaque achat crée un `Transaction` PENDING avec `stripeRef`
  unique ; le webhook le passe à PAID. Un webhook reçu deux fois est no-op grâce
  à la contrainte unique.
- **Promotion liste d'attente** : à l'annulation d'un CONFIRMED, on promeut le
  premier WAITLIST si son solde le permet ; sinon on saute. Email envoyé.
- **Annulation tardive** : `cancellationCutoffMin` par session ou par défaut
  studio. Au-delà, on retient `lateCancelFee` crédits sur le remboursement.
- **JWT révocable** : `User.sessionVersion` est inclus dans le JWT et comparé à
  chaque requête. Bump le champ → toutes les sessions du user sont invalides.
- **Rate limiting** : par email et par IP, sliding window 15min. Limite stricte
  côté login (5 essais / email / 15min) pour bloquer le brute-force.

## TODO

- [ ] Migrer vers PostgreSQL avec migrations Prisma versionnées
- [ ] Stocker la state de rate limiting dans Redis pour le multi-instance
- [ ] Customer Portal Stripe (gestion abonnement par le client)
- [ ] Freeze d'abonnement côté client (actuellement seulement champ DB)
- [ ] PWA / app mobile
- [ ] Génération de QR code visible côté admin pour le check-in physique
- [ ] Récurrence avancée (skip jours fériés, exceptions)
- [ ] Documents légaux (waiver/contrat signé électroniquement)
- [ ] Multi-tenant (plusieurs studios sur la même instance)
- [ ] Tests automatisés (Vitest + Playwright)
