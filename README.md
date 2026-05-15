# ilannatek

Plateforme de réservation de cours pour studio boutique — alternative open-source à Mariana Tek.

## Stack

- **Next.js 14** (App Router, Server Actions, TypeScript)
- **Prisma** + **SQLite** (facilement remplaçable par Postgres)
- **Tailwind CSS**
- **Auth** : JWT en cookie httpOnly (`jose` + `bcryptjs`)
- **Zod** pour la validation

## Démarrage

```bash
npm install
npm run db:reset   # crée la DB et la peuple de données de démo
npm run dev
```

Ouvre http://localhost:3000

## Comptes de démo (après `db:seed`)

- **Admin** : `admin@ilannatek.fr` / `admin1234`
- **Membre** : `membre@ilannatek.fr` / `member1234`
- **Instructeur** : `camille@ilannatek.fr` / `instructor1234`

## Fonctionnalités

### Côté client
- Inscription / connexion / déconnexion (cookies sécurisés)
- Page d'accueil + planning sur 7 jours avec filtre par studio
- Réservation d'un cours (déduit les crédits)
- Inscription en liste d'attente si le cours est complet (promotion auto à l'annulation)
- Annulation avec remboursement automatique des crédits
- Achat de packs de crédits (paiement simulé)
- Souscription d'un abonnement (mensuel / annuel)
- Page compte : prochaines réservations, historique des transactions, abonnements actifs

### Côté admin (`/admin`)
- Tableau de bord (membres, cours, CA du mois)
- CRUD cours (création / édition / suppression / annulation)
- Gestion de la liste d'attente et marquage présence / absence
- CRUD types de cours (durée, coût en crédits, couleur)
- CRUD studios
- Gestion des instructeurs (création de compte, bascule de rôle)
- CRUD plans & packs (activation/désactivation)
- Liste des membres avec ajustement de crédits manuel et changement de rôle
- Vue globale de toutes les réservations avec filtre par statut

## Structure

```
src/
  app/
    (auth)/              login, register, logout
    schedule/            planning client
    packs/               achat de crédits
    subscriptions/       abonnements
    account/             espace membre
    admin/               back-office
  components/            Navbar, DeleteForm
  lib/
    db.ts                Prisma client
    auth.ts              JWT sessions
    booking.ts           logique de réservation + waitlist
    utils.ts             helpers (dates, prix)
prisma/
  schema.prisma          modèle de données
  seed.ts                données de démo
```

## Modèle de données

Voir `prisma/schema.prisma`. Entités principales :

- `User` (rôle USER / INSTRUCTOR / ADMIN, solde de crédits)
- `Location` (studio)
- `ClassType` (type de cours, coût, durée, couleur)
- `Session` (séance planifiée)
- `Booking` (status CONFIRMED / WAITLIST / CANCELLED / ATTENDED / NO_SHOW)
- `Plan` (CREDIT_PACK ou SUBSCRIPTION)
- `Subscription` (abonnement actif d'un user)
- `Transaction` (journal complet des mouvements de crédits + achats)

## Notes d'implémentation

- **Paiement** : flow simulé (clic = crédits ajoutés). Brancher Stripe via `purchasePackAction` et un webhook qui crée la `Transaction`.
- **Liste d'attente** : à l'annulation d'une `CONFIRMED`, la première personne `WAITLIST` est automatiquement promue si son solde le permet, et les positions sont réindexées.
- **Sécurité** : toutes les Server Actions admin passent par `requireAdmin()` ; sessions JWT signées HMAC-SHA256.

## TODO si on continue

- Emails transactionnels (confirmation, rappel J-1)
- Renouvellement automatique des abonnements (cron)
- Intégration Stripe réelle + webhooks
- Récurrence des séances ("tous les mardis 18h pendant 3 mois")
- Multi-studio / multi-tenant
- API publique pour widget embed
