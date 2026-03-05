'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { signUpWithEmail, loading: authLoading } = useAuth();

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ variant: 'destructive', title: 'Échec de l\'Inscription', description: 'Les mots de passe ne correspondent pas.' });
      return;
    }
    setIsLoading(true);
    try {
      await signUpWithEmail(email, password, name, companyName);
    } catch {
      // Erreur déjà gérée dans AuthContext (toast)
    } finally {
      setIsLoading(false);
    }
  };

  const disabled = isLoading || authLoading;

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-2">
          <UserPlus className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl font-headline">Créer un Compte</CardTitle>
        <CardDescription>Inscrivez-vous pour commencer à utiliser SiteWise Reports.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleEmailSignup} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nom complet</Label>
            <Input
              id="name"
              type="text"
              placeholder="Jean Dupont"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={disabled}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="companyName">Nom de l&apos;entreprise</Label>
            <Input
              id="companyName"
              type="text"
              placeholder="Dupont Construction SARL"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
              disabled={disabled}
            />
          </div>
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
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              placeholder="•••••••• (min. 6 caractères)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={disabled}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={disabled}
            />
          </div>
          <Button type="submit" className="w-full rounded-lg" disabled={disabled}>
            {isLoading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
            S&apos;inscrire
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col items-center text-sm">
        <p>
          Vous avez déjà un compte ?{' '}
          <Button variant="link" asChild className="p-0 h-auto">
            <Link href="/auth/login">Se connecter</Link>
          </Button>
        </p>
      </CardFooter>
    </Card>
  );
}
