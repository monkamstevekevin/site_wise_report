import Link from 'next/link';
import { Building2, ArrowLeft } from 'lucide-react';

export const metadata = {
  title: "Conditions d'utilisation — SiteWise Reports",
  description: "Les conditions régissant l'utilisation de la plateforme SiteWise Reports.",
};

export default function TermsPage() {
  const lastUpdated = '7 avril 2026';

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 py-4 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <Building2 className="h-5 w-5 text-blue-600" />
            <span className="font-semibold text-gray-900">SiteWise Reports</span>
          </Link>
          <Link href="/" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-4 w-4" />
            Retour à l&apos;accueil
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Conditions d&apos;utilisation</h1>
          <p className="text-gray-500 text-sm">Dernière mise à jour : {lastUpdated}</p>
        </div>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Acceptation des conditions</h2>
            <p>
              En créant un compte ou en utilisant SiteWise Reports (la « Plateforme »), vous acceptez
              d&apos;être lié par les présentes Conditions d&apos;utilisation. Si vous n&apos;acceptez pas ces conditions,
              vous ne pouvez pas utiliser la Plateforme.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Description du service</h2>
            <p>
              SiteWise Reports est une plateforme SaaS (Software as a Service) de gestion de rapports
              de chantier permettant à des équipes de construction de créer, soumettre, approuver et
              archiver des rapports d&apos;inspection, gérer des projets, et assurer la traçabilité des
              travaux effectués sur le terrain.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Comptes et organisations</h2>
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li>Chaque compte est associé à une organisation (entreprise). L&apos;administrateur est responsable de la gestion des membres et de leurs accès.</li>
              <li>Vous êtes responsable de la confidentialité de vos identifiants de connexion.</li>
              <li>Vous devez fournir des informations exactes lors de l&apos;inscription.</li>
              <li>Un compte ne peut pas être partagé entre plusieurs individus.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Abonnements et facturation</h2>
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li><strong>Essai gratuit :</strong> 14 jours sans carte de crédit requise.</li>
              <li><strong>Facturation :</strong> Les abonnements sont facturés mensuellement via Stripe. Le renouvellement est automatique.</li>
              <li><strong>Annulation :</strong> Vous pouvez annuler à tout moment depuis les paramètres de votre compte. L&apos;accès reste actif jusqu&apos;à la fin de la période payée.</li>
              <li><strong>Remboursements :</strong> Aucun remboursement partiel pour les périodes entamées, sauf à notre discrétion.</li>
              <li><strong>Modification de prix :</strong> Tout changement de tarif sera communiqué 30 jours à l&apos;avance.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Propriété des données</h2>
            <p>
              <strong>Vos données vous appartiennent.</strong> Vous conservez tous les droits sur les rapports,
              photos, projets et informations que vous saisissez dans la Plateforme. Nous n&apos;utilisons pas
              votre contenu à des fins commerciales ou de formation de modèles d&apos;intelligence artificielle.
            </p>
            <p className="mt-3">
              Lors de la fermeture d&apos;un compte, vous pouvez exporter vos données sur demande dans un délai
              de 30 jours avant la suppression définitive.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Utilisation acceptable</h2>
            <p>Vous vous engagez à ne pas :</p>
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li>Utiliser la Plateforme à des fins illégales ou frauduleuses.</li>
              <li>Tenter d&apos;accéder aux données d&apos;autres organisations.</li>
              <li>Soumettre des contenus contenant des logiciels malveillants.</li>
              <li>Revendre ou redistribuer l&apos;accès à la Plateforme sans autorisation écrite.</li>
              <li>Utiliser des robots ou scripts automatisés pour accéder à la Plateforme de façon abusive.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Disponibilité du service</h2>
            <p>
              Nous visons une disponibilité de <strong>99,5 %</strong> par mois. Des interruptions
              planifiées pour maintenance seront annoncées à l&apos;avance dans la mesure du possible.
              Nous ne sommes pas responsables des interruptions causées par des tiers (hébergeurs, fournisseurs de services).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Limitation de responsabilité</h2>
            <p>
              La Plateforme est fournie « telle quelle ». Dans les limites permises par la loi,
              nous ne sommes pas responsables des dommages indirects, pertes de profits, ou pertes
              de données résultant de l&apos;utilisation ou de l&apos;impossibilité d&apos;utiliser la Plateforme.
            </p>
            <p className="mt-3">
              Notre responsabilité totale ne peut pas dépasser le montant payé par votre organisation
              au cours des <strong>3 derniers mois</strong> précédant l&apos;événement.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Résiliation</h2>
            <p>
              Nous nous réservons le droit de suspendre ou résilier tout compte qui violerait
              les présentes conditions, après notification préalable sauf en cas de violation grave.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Droit applicable</h2>
            <p>
              Les présentes conditions sont régies par les lois de la province de <strong>Québec</strong> et
              les lois fédérales du Canada applicables. Tout litige sera soumis à la juridiction exclusive
              des tribunaux du Québec.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Contact</h2>
            <p>Pour toute question relative aux présentes conditions :</p>
            <div className="mt-3 p-4 bg-gray-50 rounded-lg text-sm">
              <p><strong>SiteWise Reports</strong></p>
              <p>Québec, Canada</p>
              <p>
                Courriel :{' '}
                <a href="mailto:legal@sitewise.app" className="text-blue-600 hover:underline">
                  legal@sitewise.app
                </a>
              </p>
            </div>
          </section>

        </div>

        {/* Footer links */}
        <div className="mt-12 pt-8 border-t border-gray-100 flex gap-4 text-sm text-gray-400">
          <Link href="/privacy" className="hover:text-gray-600">Politique de confidentialité</Link>
          <Link href="/" className="hover:text-gray-600">Retour à l&apos;accueil</Link>
        </div>
      </main>
    </div>
  );
}
