'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { LogIn, Loader2, Mail } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);

  const { signInWithEmail, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signInWithEmail(email, password);
    } catch {
      // Erreur déjà gérée dans AuthContext (toast)
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setIsSendingReset(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (error) throw error;
      toast({
        title: 'Email envoyé',
        description: `Un lien de réinitialisation a été envoyé à ${forgotEmail}.`,
      });
      setIsForgotOpen(false);
      setForgotEmail('');
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: (err as Error).message || "Impossible d'envoyer l'email de réinitialisation.",
      });
    } finally {
      setIsSendingReset(false);
    }
  };

  const disabled = isLoading || authLoading;

  return (
    <>
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <LogIn className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-headline">Bon Retour</CardTitle>
          <CardDescription>Connectez-vous à votre compte SiteWise Reports.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="vous@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={disabled}
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Mot de passe</Label>
                <button
                  type="button"
                  onClick={() => { setForgotEmail(email); setIsForgotOpen(true); }}
                  className="text-xs text-primary hover:underline"
                >
                  Mot de passe oublié ?
                </button>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={disabled}
              />
            </div>
            <Button type="submit" className="w-full rounded-lg" disabled={disabled}>
              {isLoading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
              Se Connecter
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-center text-sm">
          <p>
            Vous n&apos;avez pas de compte ?{' '}
            <Button variant="link" asChild className="p-0 h-auto">
              <Link href="/auth/signup">S&apos;inscrire</Link>
            </Button>
          </p>
        </CardFooter>
      </Card>

      <Dialog open={isForgotOpen} onOpenChange={setIsForgotOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" /> Réinitialiser le mot de passe
            </DialogTitle>
            <DialogDescription>
              Entrez votre adresse email. Vous recevrez un lien pour choisir un nouveau mot de passe.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleForgotPassword} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="forgot-email">Email</Label>
              <Input
                id="forgot-email"
                type="email"
                placeholder="vous@example.com"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
                disabled={isSendingReset}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsForgotOpen(false)} disabled={isSendingReset}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSendingReset || !forgotEmail}>
                {isSendingReset ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                Envoyer le lien
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
