'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import {
  ClipboardCheck, Zap, ShieldCheck, Bell, FileDown, Users,
  CheckCircle2, ArrowRight, Building2, ChevronRight,
} from 'lucide-react';

const FEATURES = [
  {
    icon: ClipboardCheck,
    title: 'Rapports digitaux sur le terrain',
    desc: 'Vos techniciens remplissent les rapports depuis leur téléphone. Fini le papier, les erreurs de saisie et les photos perdues.',
  },
  {
    icon: Zap,
    title: 'Analyse de conformité par IA',
    desc: "L'IA détecte automatiquement les anomalies sur chaque lot de matériau avant même que le superviseur ouvre le rapport.",
  },
  {
    icon: ShieldCheck,
    title: 'Workflow de validation en temps réel',
    desc: 'Soumission → Validation (ou rejet avec commentaire) → Notification instantanée. Tout le monde est informé, rien ne tombe entre les mailles.',
  },
  {
    icon: Bell,
    title: 'Alertes instantanées',
    desc: 'Les superviseurs et admins reçoivent un email dès qu\'un rapport est soumis ou qu\'une anomalie est détectée.',
  },
  {
    icon: FileDown,
    title: 'Export PDF & CSV',
    desc: 'Générez des rapports professionnels prêts pour vos clients ou pour les autorités de réglementation en un clic.',
  },
  {
    icon: Users,
    title: 'Gestion d\'équipe intégrée',
    desc: 'Invitez vos techniciens et superviseurs, assignez-les aux projets, gérez les rôles et les accès depuis un tableau de bord central.',
  },
];

const PLANS = [
  {
    name: 'Starter',
    price: 199,
    desc: 'Pour les petites équipes qui veulent se digitaliser rapidement.',
    features: ["Jusqu'à 5 utilisateurs", 'Projets illimités', 'Rapports illimités', 'Analyse IA', 'Export PDF & CSV', 'Support email'],
    cta: 'Démarrer l\'essai gratuit',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: 499,
    desc: 'Pour les entreprises qui gèrent plusieurs chantiers et de grandes équipes.',
    features: ['Utilisateurs illimités', 'Projets illimités', 'Rapports illimités', 'Analyse IA', 'Export PDF & CSV', 'Chat temps réel', 'Support prioritaire'],
    cta: 'Démarrer l\'essai gratuit',
    highlighted: true,
  },
];

const PAIN_POINTS = [
  { problem: 'Formulaires papier perdus ou illisibles', solution: 'Rapports digitaux remplis sur téléphone' },
  { problem: 'Superviseurs informés trop tard', solution: 'Notification instantanée à chaque soumission' },
  { problem: 'Anomalies détectées après livraison', solution: 'IA analyse chaque lot en temps réel' },
  { problem: 'Historique des rapports introuvable', solution: 'Tout centralisé, cherchable, exportable' },
];

export default function HomePage() {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen bg-white text-gray-900">

      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <Building2 className="h-6 w-6 text-blue-600" />
          <span className="font-bold text-lg">SiteWise Reports</span>
        </div>
        <div className="flex items-center gap-3">
          {!loading && (
            user ? (
              <Button asChild size="sm">
                <Link href="/dashboard">Tableau de bord <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/auth/login">Connexion</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/auth/signup">Essai gratuit</Link>
                </Button>
              </>
            )
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        <Badge variant="secondary" className="mb-6 text-sm font-medium">
          14 jours d'essai gratuit · Sans carte de crédit
        </Badge>
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
          Vos rapports de terrain,<br />
          <span className="text-blue-600">validés en minutes</span>
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10">
          SiteWise Reports digitalise le contrôle qualité des matériaux sur vos chantiers de construction.
          Fini les formulaires papier — vos équipes rapportent, l'IA analyse, vos superviseurs valident.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg" className="rounded-xl text-base px-8">
            <Link href="/auth/signup">
              Démarrer l'essai gratuit <ChevronRight className="ml-1 h-5 w-5" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-xl text-base px-8">
            <Link href="/auth/login">Se connecter</Link>
          </Button>
        </div>
        <p className="mt-4 text-sm text-gray-400">
          14 jours gratuits · Aucune carte de crédit requise · Annulation à tout moment
        </p>
      </section>

      {/* Pain points */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">
            Vous reconnaissez-vous dans ces situations ?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PAIN_POINTS.map(({ problem, solution }) => (
              <div key={problem} className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-red-500 text-lg">✗</span>
                  <p className="text-gray-500 line-through">{problem}</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  <p className="text-gray-800 font-medium">{solution}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 max-w-6xl mx-auto px-6">
        <h2 className="text-3xl font-bold text-center mb-4">Tout ce dont votre équipe a besoin</h2>
        <p className="text-center text-gray-500 mb-12 max-w-xl mx-auto">
          Une plateforme complète pensée pour les équipes de contrôle qualité en génie civil.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-xl border border-gray-200 p-6 hover:border-blue-200 hover:shadow-sm transition-all">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-4">
                <Icon className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-4">Tarifs simples et transparents</h2>
          <p className="text-center text-gray-500 mb-12">
            14 jours d'essai gratuit sur tous les plans. Aucune carte de crédit requise.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl border-2 p-8 bg-white ${plan.highlighted ? 'border-blue-600 shadow-lg shadow-blue-100' : 'border-gray-200'}`}
              >
                {plan.highlighted && (
                  <Badge className="mb-4 bg-blue-600">Recommandé</Badge>
                )}
                <h3 className="text-2xl font-bold mb-1">{plan.name}</h3>
                <p className="text-gray-500 text-sm mb-4">{plan.desc}</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold">{plan.price}$</span>
                  <span className="text-gray-400">/mois</span>
                </div>
                <ul className="space-y-2 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  className="w-full"
                  variant={plan.highlighted ? 'default' : 'outline'}
                >
                  <Link href="/auth/signup">{plan.cta}</Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 text-center px-6">
        <h2 className="text-4xl font-bold mb-4">
          Prêt à digitaliser vos chantiers ?
        </h2>
        <p className="text-gray-500 text-lg mb-8 max-w-xl mx-auto">
          Rejoignez les équipes de construction qui ont éliminé le papier et accéléré leur contrôle qualité.
        </p>
        <Button asChild size="lg" className="rounded-xl text-base px-10">
          <Link href="/auth/signup">
            Démarrer gratuitement — 14 jours d'essai <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </Button>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 text-center text-sm text-gray-400">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Building2 className="h-4 w-4" />
          <span className="font-medium text-gray-600">SiteWise Reports</span>
        </div>
        <p>© {new Date().getFullYear()} SiteWise Reports. Tous droits réservés.</p>
        <div className="flex items-center justify-center gap-4 mt-3">
          <Link href="/privacy" className="hover:text-gray-600 transition-colors">Politique de confidentialité</Link>
          <span>·</span>
          <Link href="/terms" className="hover:text-gray-600 transition-colors">Conditions d&apos;utilisation</Link>
        </div>
      </footer>

    </div>
  );
}
