'use client';

import { useState, useEffect, useRef } from 'react';
import { PageTitle } from '@/components/common/PageTitle';
import { Settings2, Copy, RefreshCw, Loader2, ExternalLink, Send, Upload, X, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { regenerateInviteToken, getOrganizationById } from '@/services/organizationService';
import { sendInviteEmail } from '@/actions/invite';
import Link from 'next/link';
import Image from 'next/image';

const planLabels: Record<string, string> = {
  TRIAL: 'Essai gratuit', STARTER: 'Starter', PRO: 'Pro', ENTERPRISE: 'Enterprise',
};
const planVariants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  TRIAL: 'secondary', STARTER: 'default', PRO: 'default', ENTERPRISE: 'default',
};

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [isLoadingToken, setIsLoadingToken] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user?.organizationId) { setIsLoadingToken(false); return; }
    getOrganizationById(user.organizationId).then((org) => {
      setInviteToken(org?.inviteToken ?? null);
      setLogoUrl((org as { logoUrl?: string | null })?.logoUrl ?? null);
      setIsLoadingToken(false);
    });
  }, [user?.organizationId]);

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ variant: 'destructive', title: 'Format invalide', description: 'Veuillez sélectionner une image.' });
      return;
    }
    setIsUploadingLogo(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const imageDataURI = ev.target?.result as string;
      try {
        const res = await fetch('/api/admin/org-logo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageDataURI }),
        });
        if (!res.ok) throw new Error('Upload failed');
        const { logoUrl: newUrl } = await res.json();
        setLogoUrl(newUrl);
        toast({ title: 'Logo mis à jour', description: 'Le logo de votre organisation a été sauvegardé.' });
      } catch {
        toast({ variant: 'destructive', title: 'Erreur', description: "Impossible d'uploader le logo." });
      } finally {
        setIsUploadingLogo(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = async () => {
    setIsUploadingLogo(true);
    try {
      await fetch('/api/admin/org-logo', { method: 'DELETE' });
      setLogoUrl(null);
      toast({ title: 'Logo supprimé' });
    } catch {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de supprimer le logo.' });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Accès réservé aux administrateurs.
      </div>
    );
  }

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL ?? '';
  const inviteLink = inviteToken ? `${baseUrl}/auth/join?token=${inviteToken}` : null;

  const handleCopyLink = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    toast({ title: 'Lien copié', description: 'Le lien d\'invitation a été copié dans le presse-papiers.' });
  };

  const handleRegenerateToken = async () => {
    if (!user.organizationId) return;
    setIsRegenerating(true);
    try {
      const org = await regenerateInviteToken(user.organizationId);
      setInviteToken(org.inviteToken ?? null);
      toast({ title: 'Lien régénéré', description: 'Un nouveau lien d\'invitation a été créé.' });
    } catch {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de régénérer le lien.' });
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleSendInviteEmail = async () => {
    if (!inviteEmail || !inviteToken || !user.organizationId) return;
    setIsSendingEmail(true);
    try {
      const result = await sendInviteEmail({
        toEmail: inviteEmail,
        inviteToken,
        inviterName: user.name,
        organizationId: user.organizationId,
      });
      if (result.success) {
        toast({ title: 'Invitation envoyée !', description: `Un email d'invitation a été envoyé à ${inviteEmail}.` });
        setInviteEmail('');
      } else {
        toast({ variant: 'destructive', title: 'Erreur', description: result.error ?? 'Impossible d\'envoyer l\'email.' });
      }
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <>
      <PageTitle
        title="Paramètres de l'Organisation"
        icon={Settings2}
        subtitle="Gérez votre organisation, les invitations et l'abonnement."
      />

      <div className="space-y-6 max-w-2xl">
        {/* Org Info */}
        <Card>
          <CardHeader><CardTitle>Organisation</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Nom</p>
                <p className="text-base font-semibold">{user.organizationName ?? '—'}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-muted-foreground">Plan actuel</p>
                <Badge variant={planVariants[user.organizationPlan ?? 'TRIAL']}>
                  {planLabels[user.organizationPlan ?? 'TRIAL']}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logo */}
        <Card>
          <CardHeader>
            <CardTitle>Logo de l&apos;organisation</CardTitle>
            <CardDescription>Affiché dans les rapports. Sinon, le logo SiteWise Reports est utilisé par défaut.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50">
                {logoUrl ? (
                  <Image src={logoUrl} alt="Logo organisation" width={80} height={80} className="object-contain h-full w-full p-1" />
                ) : (
                  <Building2 className="h-8 w-8 text-gray-300" />
                )}
              </div>
              <div className="space-y-2">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoChange}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={isUploadingLogo}
                >
                  {isUploadingLogo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  {logoUrl ? 'Changer le logo' : 'Ajouter un logo'}
                </Button>
                {logoUrl && (
                  <Button variant="ghost" size="sm" onClick={handleRemoveLogo} disabled={isUploadingLogo} className="text-destructive hover:text-destructive">
                    <X className="mr-2 h-4 w-4" />
                    Supprimer
                  </Button>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Formats acceptés : PNG, JPG, SVG. Taille recommandée : 200×200px.</p>
          </CardContent>
        </Card>

        {/* Invite Link */}
        <Card>
          <CardHeader>
            <CardTitle>Inviter des membres</CardTitle>
            <CardDescription>Partagez le lien ou envoyez une invitation par email.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Lien */}
            {isLoadingToken ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Chargement...
              </div>
            ) : inviteLink ? (
              <div className="flex gap-2">
                <Input value={inviteLink} readOnly className="font-mono text-xs" />
                <Button variant="outline" size="icon" onClick={handleCopyLink}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            ) : null}

            <Button variant="outline" size="sm" onClick={handleRegenerateToken} disabled={isRegenerating || isLoadingToken}>
              {isRegenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              {inviteLink ? 'Régénérer le lien' : 'Générer un lien'}
            </Button>

            {/* Envoyer par email */}
            {inviteLink && (
              <div className="pt-2 border-t">
                <Label htmlFor="invite-email" className="text-sm font-medium mb-2 block">
                  Envoyer l&apos;invitation par email
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="collegue@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    disabled={isSendingEmail}
                  />
                  <Button onClick={handleSendInviteEmail} disabled={!inviteEmail || isSendingEmail}>
                    {isSendingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Billing */}
        <Card>
          <CardHeader>
            <CardTitle>Abonnement & Facturation</CardTitle>
            <CardDescription>Gérez votre abonnement et mettez à niveau votre plan.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/settings/billing">
                <ExternalLink className="mr-2 h-4 w-4" />
                Gérer l&apos;abonnement
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
