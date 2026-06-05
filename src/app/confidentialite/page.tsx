import Link from "next/link";

export const metadata = {
  title: "Politique de confidentialité — Ilannatek",
};

export default function ConfidentialitePage() {
  return (
    <div className="max-w-2xl mx-auto space-y-10 py-8 px-4">
      <div>
        <p className="section-title mb-3">Légal</p>
        <h1 className="font-serif text-4xl font-medium text-brand-600 leading-tight">
          Politique de confidentialité
        </h1>
        <p className="text-sm text-stone2-500 mt-2">Conforme au RGPD — Règlement (UE) 2016/679</p>
      </div>

      <section className="space-y-3">
        <h2 className="font-serif text-2xl text-brand-600 font-medium">1. Responsable du traitement</h2>
        <p className="text-sm text-stone2-600 leading-relaxed">
          [NOM DE LA SOCIÉTÉ], [ADRESSE], France — [EMAIL DE CONTACT].
          Pour toute question : <a href="mailto:[EMAIL]" className="underline hover:text-brand-600">[EMAIL DPO ou CONTACT]</a>.
        </p>
      </section>

      <div className="divider" />

      <section className="space-y-4">
        <h2 className="font-serif text-2xl text-brand-600 font-medium">2. Données collectées</h2>

        <div className="bg-white border border-stone2-100 divide-y divide-stone2-100">
          {[
            {
              category: "Données d'identité",
              data: "Prénom, nom, adresse email, numéro de téléphone (optionnel)",
              purpose: "Création et gestion du compte membre",
              basis: "Exécution du contrat",
            },
            {
              category: "Données de connexion",
              data: "Adresse IP, logs de connexion, version de session",
              purpose: "Sécurité, détection de fraude, rate limiting",
              basis: "Intérêt légitime",
            },
            {
              category: "Données de réservation",
              data: "Historique des cours réservés, présences, statut liste d'attente",
              purpose: "Gestion des réservations, suivi de l'activité",
              basis: "Exécution du contrat",
            },
            {
              category: "Données financières",
              data: "Solde de crédits, historique des transactions, plan d'abonnement",
              purpose: "Facturation et gestion des paiements",
              basis: "Obligation légale / Exécution du contrat",
            },
            {
              category: "Données de paiement",
              data: "Référence de transaction Stripe (aucune donnée de carte stockée)",
              purpose: "Traitement des paiements",
              basis: "Exécution du contrat",
            },
          ].map((row) => (
            <div key={row.category} className="px-4 py-4">
              <p className="text-[10px] uppercase tracking-widest text-stone2-400 mb-1">{row.category}</p>
              <p className="text-sm text-brand-600 font-medium mb-0.5">{row.data}</p>
              <p className="text-xs text-stone2-500">{row.purpose} · <span className="text-accent-600">{row.basis}</span></p>
            </div>
          ))}
        </div>
      </section>

      <div className="divider" />

      <section className="space-y-3">
        <h2 className="font-serif text-2xl text-brand-600 font-medium">3. Destinataires des données</h2>
        <p className="text-sm text-stone2-600 leading-relaxed">Vos données sont transmises uniquement aux sous-traitants suivants, dans le cadre strict de la prestation :</p>
        <ul className="text-sm text-stone2-600 space-y-2">
          <li className="flex gap-3 items-start">
            <span className="text-accent-500 mt-0.5">·</span>
            <span><strong className="text-brand-600">Stripe, Inc.</strong> (USA) — paiement en ligne. Certifié PCI DSS niveau 1. Clause contractuelle standard UE-USA applicable.</span>
          </li>
          <li className="flex gap-3 items-start">
            <span className="text-accent-500 mt-0.5">·</span>
            <span><strong className="text-brand-600">Resend, Inc.</strong> (USA) — envoi d'emails transactionnels (confirmations, rappels). Données transmises : email, prénom.</span>
          </li>
          <li className="flex gap-3 items-start">
            <span className="text-accent-500 mt-0.5">·</span>
            <span><strong className="text-brand-600">Railway Corp.</strong> (USA) — hébergement de l'application. Certifié SOC 2 Type II.</span>
          </li>
          <li className="flex gap-3 items-start">
            <span className="text-accent-500 mt-0.5">·</span>
            <span><strong className="text-brand-600">Neon, Inc.</strong> (USA) — hébergement de la base de données. Chiffrement au repos et en transit.</span>
          </li>
        </ul>
        <p className="text-sm text-stone2-600 leading-relaxed">Aucune donnée n'est vendue ou cédée à des tiers à des fins commerciales.</p>
      </section>

      <div className="divider" />

      <section className="space-y-3">
        <h2 className="font-serif text-2xl text-brand-600 font-medium">4. Durée de conservation</h2>
        <div className="text-sm text-stone2-600 space-y-2 leading-relaxed">
          <p>· Données de compte actif : conservées pendant toute la durée du contrat, puis 3 ans après la dernière activité.</p>
          <p>· Données de facturation : 10 ans (obligation légale comptable).</p>
          <p>· Logs de sécurité : 1 an.</p>
          <p>· En cas de demande de suppression : anonymisation immédiate des données personnelles identifiantes, conservation des données agrégées à des fins comptables.</p>
        </div>
      </section>

      <div className="divider" />

      <section className="space-y-3">
        <h2 className="font-serif text-2xl text-brand-600 font-medium">5. Cookies et traceurs</h2>
        <p className="text-sm text-stone2-600 leading-relaxed">
          Ce site n'utilise que des cookies strictement nécessaires à son fonctionnement :
        </p>
        <div className="bg-white border border-stone2-100 divide-y divide-stone2-100">
          {[
            { name: "session", purpose: "Cookie d'authentification (httpOnly, Secure, SameSite=Lax)", duration: "Session + 7 jours", consent: "Non requis" },
          ].map((c) => (
            <div key={c.name} className="px-4 py-3">
              <p className="text-sm font-medium text-brand-600 font-mono">{c.name}</p>
              <p className="text-xs text-stone2-500 mt-0.5">{c.purpose}</p>
              <p className="text-xs text-stone2-400 mt-0.5">Durée : {c.duration} · Consentement : <span className="text-emerald-700">{c.consent}</span></p>
            </div>
          ))}
        </div>
        <p className="text-sm text-stone2-600">Aucun cookie publicitaire, de mesure d'audience ou de profilage n'est utilisé.</p>
      </section>

      <div className="divider" />

      <section className="space-y-3">
        <h2 className="font-serif text-2xl text-brand-600 font-medium">6. Vos droits (RGPD)</h2>
        <p className="text-sm text-stone2-600 leading-relaxed">Conformément au RGPD et à la loi Informatique et Libertés, vous disposez des droits suivants :</p>
        <ul className="text-sm text-stone2-600 space-y-2">
          {[
            ["Accès", "Obtenir une copie de vos données personnelles"],
            ["Rectification", "Corriger vos données inexactes ou incomplètes"],
            ["Effacement", "Supprimer votre compte et anonymiser vos données (sauf obligations légales)"],
            ["Portabilité", "Recevoir vos données dans un format structuré et lisible par machine"],
            ["Opposition", "Vous opposer à certains traitements basés sur l'intérêt légitime"],
            ["Limitation", "Demander la suspension temporaire d'un traitement"],
          ].map(([droit, desc]) => (
            <li key={droit} className="flex gap-3 items-start">
              <span className="text-accent-500 mt-0.5">·</span>
              <span><strong className="text-brand-600">{droit} :</strong> {desc}</span>
            </li>
          ))}
        </ul>
        <p className="text-sm text-stone2-600 leading-relaxed mt-3">
          Pour exercer vos droits, connectez-vous à votre compte et utilisez la section{" "}
          <Link href="/account/profile" className="underline hover:text-brand-600">Mon profil → Supprimer mon compte</Link>,
          ou contactez-nous à <a href="mailto:[EMAIL]" className="underline hover:text-brand-600">[EMAIL DE CONTACT]</a>.
          Vous disposez également du droit de déposer une réclamation auprès de la{" "}
          <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="underline hover:text-brand-600">CNIL</a>.
        </p>
      </section>

      <div className="divider" />

      <section className="space-y-3">
        <h2 className="font-serif text-2xl text-brand-600 font-medium">7. Sécurité</h2>
        <p className="text-sm text-stone2-600 leading-relaxed">
          Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger
          vos données : chiffrement des mots de passe (bcrypt), cookies httpOnly et Secure, connexion
          TLS/HTTPS, en-têtes de sécurité (CSP, HSTS, X-Frame-Options), rate limiting, versionnage
          des sessions pour invalidation en cas de compromission.
        </p>
      </section>

      <div className="divider" />

      <p className="text-xs text-stone2-400">Dernière mise à jour : {new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
    </div>
  );
}
