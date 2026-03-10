'use client';

import { useState } from 'react';
import { Building2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { setupGoogleUserOrg } from '@/actions/signup';
import { useToast } from '@/hooks/use-toast';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function CreateOrgPage() {
  const { toast } = useToast();
  const [companyName, setCompanyName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) return;

    setIsLoading(true);
    try {
      // Get the current user directly from Supabase — don't rely on AuthContext
      // which may not have finished initializing after the hard navigation.
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast({ variant: 'destructive', title: 'Session expirée', description: 'Reconnectez-vous.' });
        window.location.href = '/auth/login';
        return;
      }

      const result = await setupGoogleUserOrg({ userId: user.id, companyName: companyName.trim() });
      if (!result.success) {
        toast({ variant: 'destructive', title: 'Erreur', description: result.error });
        return;
      }

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
