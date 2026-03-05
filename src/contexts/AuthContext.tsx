'use client';

import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  getUserProfile,
  createUserProfile,
  updateUserProfile as updateUserProfileAction,
  type AppUser,
} from '@/actions/users';
import { createOrgAndSignUp } from '@/actions/signup';

export type { AppUser };

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  logout: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name?: string, companyName?: string) => Promise<void>;
  updateUserProfile: (data: { name?: string; avatarUrl?: string | null }) => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const supabase = createSupabaseBrowserClient();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  /**
   * Charge ou crée le profil PostgreSQL à partir d'un user Supabase Auth
   */
  const syncUserProfile = async (authUser: { id: string; email?: string | null; user_metadata?: Record<string, string> }) => {
    let profile = await getUserProfile(authUser.id);

    if (!profile) {
      const name =
        authUser.user_metadata?.full_name ||
        authUser.user_metadata?.name ||
        authUser.email?.split('@')[0] ||
        'Utilisateur';

      profile = await createUserProfile({
        id: authUser.id,
        email: authUser.email ?? '',
        name,
        avatarUrl: authUser.user_metadata?.avatar_url ?? null,
      });
    }

    setUser(profile);
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        await syncUserProfile(session.user);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await syncUserProfile(session.user);
        if (pathname.startsWith('/auth/')) {
          router.push('/dashboard');
        }
      } else {
        setUser(null);
        if (!pathname.startsWith('/auth') && pathname !== '/') {
          router.push('/auth/login');
        }
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      toast({ title: 'Déconnexion Réussie', description: 'Vous avez été déconnecté avec succès.' });
      router.push('/auth/login');
    } catch (error) {
      console.error('Erreur de déconnexion:', error);
      toast({ variant: 'destructive', title: 'Erreur de Déconnexion', description: 'Impossible de se déconnecter.' });
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      let message = error.message;
      if (error.message.includes('Invalid login credentials')) {
        message = 'Adresse e-mail ou mot de passe incorrect.';
      }
      toast({ variant: 'destructive', title: 'Échec de la Connexion', description: message });
      throw error;
    }
    toast({ title: 'Connexion Réussie', description: 'Redirection vers le tableau de bord...' });
  };

  const signUpWithEmail = async (email: string, password: string, name?: string, companyName?: string) => {
    if (companyName) {
      // Org signup flow via server action (atomic)
      const result = await createOrgAndSignUp({
        email,
        password,
        name: name ?? email.split('@')[0],
        companyName,
      });

      if (!result.success) {
        toast({ variant: 'destructive', title: 'Échec de l\'Inscription', description: result.error });
        throw new Error(result.error);
      }

      // Sign in immediately after account creation
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        toast({ variant: 'destructive', title: 'Compte créé, connexion échouée', description: signInError.message });
        throw signInError;
      }

      toast({ title: 'Inscription Réussie', description: `Bienvenue sur SiteWise Reports ! Votre organisation "${companyName}" a été créée.` });
      router.push('/dashboard');
    } else {
      // Legacy flow (invited users handled via join page)
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name ?? email.split('@')[0] },
        },
      });
      if (error) {
        let message = error.message;
        if (error.message.includes('already registered')) {
          message = 'Cette adresse e-mail est déjà utilisée par un autre compte.';
        }
        toast({ variant: 'destructive', title: 'Échec de l\'Inscription', description: message });
        throw error;
      }
      toast({ title: 'Inscription Réussie', description: 'Bienvenue sur SiteWise Reports !' });
    }
  };

  const updateUserProfile = async (data: { name?: string; avatarUrl?: string | null }): Promise<string | null> => {
    if (!user) throw new Error('Utilisateur non authentifié.');

    try {
      await supabase.auth.updateUser({
        data: {
          ...(data.name && { full_name: data.name }),
          ...(data.avatarUrl !== undefined && { avatar_url: data.avatarUrl }),
        },
      });

      const updated = await updateUserProfileAction(user.id, data);
      setUser(updated);

      return updated.avatarUrl;
    } catch (error) {
      console.error('Erreur de mise à jour du profil:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur de Mise à Jour du Profil',
        description: (error as Error).message || 'Échec de la mise à jour du profil.',
      });
      throw error;
    }
  };

  const value = { user, loading, logout, signInWithEmail, signUpWithEmail, updateUserProfile };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth doit être utilisé au sein d\'un AuthProvider');
  }
  return context;
}
