import Link from 'next/link';
import { Building2, ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Politique de confidentialité — SiteWise Reports',
  description: 'Comment nous collectons, utilisons et protégeons vos données personnelles.',
};

export default function PrivacyPage() {
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
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Politique de confidentialité</h1>
          <p className="text-gray-500 text-sm">Dernière mise à jour : {lastUpdated}</p>
        </div>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Introduction</h2>
            <p>
              SiteWise Reports (« nous », « notre ») est exploité par une entreprise québécoise.
              Cette politique de confidentialité explique comment nous collectons, utilisons, divulguons
              et protégeons vos informations personnelles lorsque vous utilisez notre plateforme de
              gestion de rapports de chantier accessible à l&apos;adresse{' '}
              <strong>site-wise-report.vercel.app</strong>.
            </p>
            <p className="mt-3">
              Nous respectons les exigences de la <strong>Loi 25 (Loi modernisant des dispositions législatives en matière de protection des renseignements personnels)</strong> du Québec ainsi que les principes du <strong>Règlement général sur la protection des données (RGPD)</strong> de l&apos;Union européenne.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Données collectées</h2>
            <p>Nous collectons les informations suivantes :</p>
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li><strong>Informations de compte :</strong> nom, adresse courriel, mot de passe (haché), nom de l&apos;entreprise.</li>
              <li><strong>Données professionnelles :</strong> projets de construction, rapports d&apos;inspection, photos de chantier, matériaux, signatures.</li>
              <li><strong>Données de facturation :</strong> informations de paiement traitées par Stripe (nous ne stockons pas vos numéros de carte).</li>
              <li><strong>Données d&apos;utilisation :</strong> journaux de connexion, adresse IP, type d&apos;appareil, pages visitées.</li>
              <li><strong>Communications :</strong> messages envoyés via la fonctionnalité de chat de projet.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Utilisation des données</h2>
            <p>Vos données sont utilisées pour :</p>
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li>Fournir et améliorer les fonctionnalités de la plateforme.</li>
              <li>Gérer votre compte et votre abonnement.</li>
              <li>Vous envoyer des notifications liées à votre activité (rapports, approbations, alertes).</li>
              <li>Assurer la sécurité et prévenir les abus.</li>
              <li>Respecter nos obligations légales.</li>
            </ul>
            <p className="mt-3">
              Nous ne vendons jamais vos données personnelles à des tiers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Partage des données</h2>
            <p>Vos données peuvent être partagées uniquement avec :</p>
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li><strong>Supabase</strong> — hébergement de la base de données et authentification (serveurs aux États-Unis, conforme SOC 2).</li>
              <li><strong>Stripe</strong> — traitement des paiements (conforme PCI DSS).</li>
              <li><strong>Sentry</strong> — surveillance des erreurs techniques, sans données personnelles identifiables.</li>
              <li><strong>Vercel</strong> — hébergement de l&apos;application (serveurs en Amérique du Nord).</li>
            </ul>
            <p className="mt-3">
              Tous nos sous-traitants sont liés par des accords de traitement de données conformes aux lois applicables.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Conservation des données</h2>
            <p>
              Vos données sont conservées aussi longtemps que votre compte est actif. Si vous résiliez votre abonnement,
              vos données sont conservées pendant <strong>90 jours</strong> avant suppression définitive,
              sauf obligation légale contraire.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Sécurité</h2>
            <p>Nous mettons en œuvre les mesures suivantes pour protéger vos données :</p>
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li>Chiffrement en transit (HTTPS / TLS 1.3).</li>
              <li>Chiffrement au repos dans la base de données Supabase.</li>
              <li>Isolation des données par organisation (aucun client ne peut accéder aux données d&apos;un autre).</li>
              <li>Authentification sécurisée avec gestion des sessions et renouvellement automatique des tokens.</li>
              <li>En-têtes de sécurité HTTP (Content Security Policy, X-Frame-Options, etc.).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Vos droits</h2>
            <p>Conformément à la Loi 25 et au RGPD, vous avez le droit de :</p>
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li><strong>Accéder</strong> à vos données personnelles.</li>
              <li><strong>Corriger</strong> des informations inexactes.</li>
              <li><strong>Supprimer</strong> votre compte et vos données.</li>
              <li><strong>Exporter</strong> vos données dans un format lisible.</li>
              <li><strong>Retirer votre consentement</strong> à tout moment.</li>
            </ul>
            <p className="mt-3">
              Pour exercer ces droits, contactez-nous à{' '}
              <a href="mailto:privacy@sitewise.app" className="text-blue-600 hover:underline">
                privacy@sitewise.app
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Témoins (cookies)</h2>
            <p>
              Nous utilisons uniquement des témoins essentiels au fonctionnement de l&apos;application
              (gestion de session d&apos;authentification). Nous n&apos;utilisons pas de témoins publicitaires
              ou de traçage tiers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Modifications</h2>
            <p>
              Nous pouvons mettre à jour cette politique. Toute modification substantielle sera
              notifiée par courriel ou via l&apos;application au moins <strong>30 jours</strong> avant son entrée en vigueur.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Contact</h2>
            <p>
              Pour toute question relative à cette politique ou à vos données personnelles :
            </p>
            <div className="mt-3 p-4 bg-gray-50 rounded-lg text-sm">
              <p><strong>SiteWise Reports</strong></p>
              <p>Québec, Canada</p>
              <p>
                Courriel :{' '}
                <a href="mailto:privacy@sitewise.app" className="text-blue-600 hover:underline">
                  privacy@sitewise.app
                </a>
              </p>
            </div>
          </section>

        </div>

        {/* Footer links */}
        <div className="mt-12 pt-8 border-t border-gray-100 flex gap-4 text-sm text-gray-400">
          <Link href="/terms" className="hover:text-gray-600">Conditions d&apos;utilisation</Link>
          <Link href="/" className="hover:text-gray-600">Retour à l&apos;accueil</Link>
        </div>
      </main>
    </div>
  );
}
