import Link from "next/link";

export const metadata = {
  title: "Mentions légales — Ilannatek",
};

export default function MentionsLegalesPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-10 py-8 px-4">
      <div>
        <p className="section-title mb-3">Légal</p>
        <h1 className="font-serif text-4xl font-medium text-brand-600 leading-tight">
          Mentions légales
        </h1>
      </div>

      <section className="space-y-3">
        <h2 className="font-serif text-2xl text-brand-600 font-medium">Éditeur du site</h2>
        <div className="text-sm text-stone2-600 space-y-1 leading-relaxed">
          <p><strong className="text-brand-600">Raison sociale :</strong> [NOM DE LA SOCIÉTÉ / NOM DU PROPRIÉTAIRE]</p>
          <p><strong className="text-brand-600">Statut juridique :</strong> [SAS / SARL / Auto-entrepreneur / etc.]</p>
          <p><strong className="text-brand-600">Capital social :</strong> [MONTANT] €</p>
          <p><strong className="text-brand-600">SIRET :</strong> [NUMÉRO SIRET]</p>
          <p><strong className="text-brand-600">APE/NAF :</strong> [CODE APE]</p>
          <p><strong className="text-brand-600">Siège social :</strong> [ADRESSE COMPLÈTE], [CODE POSTAL] [VILLE], France</p>
          <p><strong className="text-brand-600">Email :</strong> <a href="mailto:[EMAIL]" className="underline hover:text-brand-600">[EMAIL DE CONTACT]</a></p>
          <p><strong className="text-brand-600">Téléphone :</strong> [NUMÉRO]</p>
          <p><strong className="text-brand-600">Directeur de la publication :</strong> [PRÉNOM NOM]</p>
        </div>
      </section>

      <div className="divider" />

      <section className="space-y-3">
        <h2 className="font-serif text-2xl text-brand-600 font-medium">Hébergement</h2>
        <div className="text-sm text-stone2-600 space-y-1 leading-relaxed">
          <p><strong className="text-brand-600">Hébergeur :</strong> Railway Corp.</p>
          <p><strong className="text-brand-600">Adresse :</strong> 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis</p>
          <p><strong className="text-brand-600">Site :</strong> <a href="https://railway.app" target="_blank" rel="noopener noreferrer" className="underline hover:text-brand-600">railway.app</a></p>
        </div>
        <div className="text-sm text-stone2-600 space-y-1 leading-relaxed mt-3">
          <p><strong className="text-brand-600">Base de données :</strong> Neon, Inc.</p>
          <p><strong className="text-brand-600">Site :</strong> <a href="https://neon.tech" target="_blank" rel="noopener noreferrer" className="underline hover:text-brand-600">neon.tech</a></p>
        </div>
      </section>

      <div className="divider" />

      <section className="space-y-3">
        <h2 className="font-serif text-2xl text-brand-600 font-medium">Propriété intellectuelle</h2>
        <p className="text-sm text-stone2-600 leading-relaxed">
          L'ensemble des contenus présents sur le site ilannatek (textes, images, logos, graphismes, etc.)
          sont la propriété exclusive de [NOM DE LA SOCIÉTÉ] et sont protégés par les lois relatives au
          droit d'auteur et à la propriété intellectuelle. Toute reproduction, représentation, modification,
          publication ou adaptation, totale ou partielle, de l'un quelconque de ces éléments est interdite
          sans l'autorisation écrite préalable de [NOM DE LA SOCIÉTÉ].
        </p>
      </section>

      <div className="divider" />

      <section className="space-y-3">
        <h2 className="font-serif text-2xl text-brand-600 font-medium">Paiement sécurisé</h2>
        <p className="text-sm text-stone2-600 leading-relaxed">
          Les paiements en ligne sont traités par <strong>Stripe, Inc.</strong> (185 Berry Street, Suite 550,
          San Francisco, CA 94107, USA), certifié PCI DSS niveau 1. Ilannatek ne stocke à aucun moment
          vos données de carte bancaire. Pour plus d'informations sur la sécurité des paiements Stripe :
          <a href="https://stripe.com/fr/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-brand-600 ml-1">stripe.com/fr/privacy</a>.
        </p>
      </section>

      <div className="divider" />

      <section className="space-y-3">
        <h2 className="font-serif text-2xl text-brand-600 font-medium">Données personnelles</h2>
        <p className="text-sm text-stone2-600 leading-relaxed">
          Pour toute question relative au traitement de vos données personnelles, veuillez consulter notre{" "}
          <Link href="/confidentialite" className="underline hover:text-brand-600">politique de confidentialité</Link>.
          Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, d'effacement et de
          portabilité de vos données. Pour exercer ces droits, contactez-nous à{" "}
          <a href="mailto:[EMAIL]" className="underline hover:text-brand-600">[EMAIL DE CONTACT]</a>.
        </p>
      </section>

      <div className="divider" />

      <section className="space-y-3">
        <h2 className="font-serif text-2xl text-brand-600 font-medium">Cookies</h2>
        <p className="text-sm text-stone2-600 leading-relaxed">
          Ce site utilise uniquement des cookies strictement nécessaires à son fonctionnement (authentification,
          sécurité). Aucun cookie de suivi ou publicitaire n'est utilisé. Pour plus d'informations, consultez
          notre <Link href="/confidentialite" className="underline hover:text-brand-600">politique de confidentialité</Link>.
        </p>
      </section>

      <div className="divider" />

      <p className="text-xs text-stone2-400">Dernière mise à jour : {new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
    </div>
  );
}
