import Link from "next/link";

export const metadata = {
  title: "Conditions générales de vente — Ilannatek",
};

export default function CgvPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-10 py-8 px-4">
      <div>
        <p className="section-title mb-3">Légal</p>
        <h1 className="font-serif text-4xl font-medium text-brand-600 leading-tight">
          Conditions générales de vente
        </h1>
        <p className="text-sm text-stone2-500 mt-2">En vigueur au [DATE D&apos;ENTRÉE EN VIGUEUR]</p>
      </div>

      <section className="space-y-3">
        <h2 className="font-serif text-2xl text-brand-600 font-medium">1. Objet et champ d'application</h2>
        <p className="text-sm text-stone2-600 leading-relaxed">
          Les présentes Conditions Générales de Vente (CGV) régissent les relations contractuelles entre
          [NOM DE LA SOCIÉTÉ] (ci-après &ldquo;le Studio&rdquo;) et toute personne physique (ci-après &ldquo;le Membre&rdquo;)
          souhaitant procéder à l'achat de crédits ou d'abonnements via la plateforme Ilannatek.
          Toute commande implique l'acceptation sans réserve des présentes CGV.
        </p>
      </section>

      <div className="divider" />

      <section className="space-y-3">
        <h2 className="font-serif text-2xl text-brand-600 font-medium">2. Produits et services</h2>
        <div className="text-sm text-stone2-600 space-y-2 leading-relaxed">
          <p><strong className="text-brand-600">Packs de crédits :</strong> Les crédits permettent de réserver des cours au sein du Studio. Chaque crédit correspond à une séance selon la grille tarifaire en vigueur. Les crédits n'ont pas de date d'expiration sauf mention contraire lors de l'achat.</p>
          <p><strong className="text-brand-600">Abonnements :</strong> L'abonnement donne droit à un nombre de crédits renouvelés automatiquement à chaque période. L'abonnement est sans engagement de durée et peut être résilié à tout moment avec effet à la fin de la période en cours.</p>
        </div>
      </section>

      <div className="divider" />

      <section className="space-y-3">
        <h2 className="font-serif text-2xl text-brand-600 font-medium">3. Prix et paiement</h2>
        <div className="text-sm text-stone2-600 space-y-2 leading-relaxed">
          <p>Les prix sont indiqués en euros TTC. Le Studio se réserve le droit de modifier ses tarifs à tout moment. Les prix applicables sont ceux en vigueur au moment de la validation de la commande.</p>
          <p>Le paiement s'effectue exclusivement en ligne, par carte bancaire (Visa, Mastercard, American Express) via la plateforme sécurisée Stripe. Le débit intervient au moment de la validation de la commande.</p>
          <p>En achetant un abonnement, vous autorisez le Studio à prélever automatiquement le montant dû à chaque renouvellement, jusqu'à résiliation de votre part.</p>
        </div>
      </section>

      <div className="divider" />

      <section className="space-y-3">
        <h2 className="font-serif text-2xl text-brand-600 font-medium">4. Droit de rétractation</h2>
        <div className="text-sm text-stone2-600 space-y-2 leading-relaxed">
          <p>
            Conformément à l'article L.221-28 du Code de la consommation, le droit de rétractation de 14 jours
            <strong> ne s'applique pas</strong> aux services pleinement exécutés avant la fin du délai de rétractation,
            avec l'accord préalable du consommateur. En utilisant vos crédits, vous reconnaissez avoir expressément
            renoncé à votre droit de rétractation.
          </p>
          <p>
            Toutefois, si vous n'avez pas utilisé vos crédits dans les 14 jours suivant l'achat,
            vous pouvez exercer votre droit de rétractation en contactant le Studio à{" "}
            <a href="mailto:[EMAIL]" className="underline hover:text-brand-600">[EMAIL DE CONTACT]</a>.
          </p>
        </div>
      </section>

      <div className="divider" />

      <section className="space-y-3">
        <h2 className="font-serif text-2xl text-brand-600 font-medium">5. Annulation et remboursement des cours</h2>
        <div className="text-sm text-stone2-600 space-y-2 leading-relaxed">
          <p><strong className="text-brand-600">Annulation par le Membre :</strong> Le Membre peut annuler sa réservation sans frais jusqu'à 2 heures avant le début du cours. En cas d'annulation tardive (moins de 2h) ou d'absence non justifiée, un crédit peut être retenu selon la politique du Studio.</p>
          <p><strong className="text-brand-600">Annulation par le Studio :</strong> En cas d'annulation d'un cours par le Studio (raisons exceptionnelles, force majeure, etc.), les crédits correspondants sont automatiquement recrédités sur le compte du Membre, et une notification par email est envoyée.</p>
          <p><strong className="text-brand-600">Liste d'attente :</strong> L'inscription sur liste d'attente ne débite aucun crédit. Le crédit est uniquement prélevé si une place se libère et que le Membre confirme sa participation.</p>
        </div>
      </section>

      <div className="divider" />

      <section className="space-y-3">
        <h2 className="font-serif text-2xl text-brand-600 font-medium">6. Responsabilité</h2>
        <div className="text-sm text-stone2-600 space-y-2 leading-relaxed">
          <p>Le Membre s'engage à participer aux cours en bonne santé et sous sa propre responsabilité. Il déclare ne pas avoir de contre-indication médicale à la pratique des activités proposées. Le Studio ne saurait être tenu responsable de tout incident lié à la pratique sportive.</p>
          <p>Le Studio met tout en œuvre pour assurer la disponibilité de la plateforme. En cas d'indisponibilité technique empêchant une réservation, aucune pénalité ne sera appliquée et les délais d'annulation seront ajustés.</p>
        </div>
      </section>

      <div className="divider" />

      <section className="space-y-3">
        <h2 className="font-serif text-2xl text-brand-600 font-medium">7. Résiliation</h2>
        <div className="text-sm text-stone2-600 space-y-2 leading-relaxed">
          <p><strong className="text-brand-600">Par le Membre :</strong> Le Membre peut résilier son abonnement à tout moment depuis son espace compte. La résiliation prend effet à la fin de la période de facturation en cours. Les crédits déjà crédités restent disponibles.</p>
          <p><strong className="text-brand-600">Par le Studio :</strong> Le Studio se réserve le droit de suspendre ou résilier l'accès d'un Membre en cas de comportement inapproprié, de tentative de fraude ou de violation des présentes CGV, sans remboursement des crédits non utilisés.</p>
        </div>
      </section>

      <div className="divider" />

      <section className="space-y-3">
        <h2 className="font-serif text-2xl text-brand-600 font-medium">8. Données personnelles</h2>
        <p className="text-sm text-stone2-600 leading-relaxed">
          Le traitement des données personnelles dans le cadre des présentes CGV est régi par notre{" "}
          <Link href="/confidentialite" className="underline hover:text-brand-600">politique de confidentialité</Link>.
        </p>
      </section>

      <div className="divider" />

      <section className="space-y-3">
        <h2 className="font-serif text-2xl text-brand-600 font-medium">9. Litiges et droit applicable</h2>
        <div className="text-sm text-stone2-600 space-y-2 leading-relaxed">
          <p>Les présentes CGV sont régies par le droit français. En cas de litige, une solution amiable sera recherchée en priorité. À défaut, le litige sera soumis aux tribunaux compétents.</p>
          <p>Conformément à l'article L.616-1 du Code de la consommation, le Membre peut recourir gratuitement au médiateur de la consommation : [NOM DU MÉDIATEUR] — [LIEN OU ADRESSE].</p>
        </div>
      </section>

      <div className="divider" />

      <p className="text-xs text-stone2-400">Dernière mise à jour : {new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
    </div>
  );
}
