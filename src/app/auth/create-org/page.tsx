'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { setupGoogleUserOrg } from '@/actions/signup';
import { useToast } from '@/hooks/use-toast';

export default function CreateOrgPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [companyName, setCompanyName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !companyName.trim()) return;

    setIsLoading(true);
    try {
      const result = await setupGoogleUserOrg({ userId: user.id, companyName: companyName.trim() });
      if (!result.success) {
        toast({ variant: 'destructive', title: 'Erreur', description: result.error });
        return;
      }
      // Hard navigation forces AuthContext to re-fetch the profile from DB,
      // picking up the new organizationId set by setupGoogleUserOrg.
      window.location.href = '/dashboard';
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-2">
          <Building2 className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl font-headline">Créer votre organisation</CardTitle>
        <CardDescription>
          Dernière étape — donnez un nom à votre entreprise pour commencer.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="companyName">Nom de l&apos;entreprise</Label>
            <Input
              id="companyName"
              type="text"
              placeholder="Dupont Construction SARL"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
              disabled={isLoading}
              autoFocus
            />
          </div>
          <Button type="submit" className="w-full rounded-lg" disabled={isLoading || !companyName.trim()}>
            {isLoading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
            Commencer
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
