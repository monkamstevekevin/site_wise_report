
'use client';

import type { User as FirebaseUser, AuthError } from 'firebase/auth';
import { onAuthStateChanged, signOut as firebaseSignOut, GoogleAuthProvider, signInWithPopup, updateProfile } from 'firebase/auth';
import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { auth } from '@/lib/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { updateUser as updateUserInFirestore } from '@/services/userService';
import { uploadProfileImage, deleteProfileImage } from '@/services/storageService';

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  logout: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  updateUserProfile: (data: { displayName?: string; photoURL?: string | null }) => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (currentUser && (pathname.startsWith('/auth/login') || pathname.startsWith('/auth/signup'))) {
        router.push('/dashboard');
      }
    });
    return () => unsubscribe();
  }, [router, pathname]);

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      toast({ title: 'Déconnexion Réussie', description: 'Vous avez été déconnecté avec succès.' });
      if (!pathname.startsWith('/auth')) {
        router.push('/auth/login');
      }
    } catch (error) {
      console.error('Erreur de déconnexion:', error);
      const authError = error as AuthError;
      toast({ variant: 'destructive', title: 'Erreur de Déconnexion', description: authError.message || 'Impossible de se déconnecter.' });
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      toast({ title: 'Connexion Réussie', description: 'Bienvenue !' });
    } catch (error) {
      const authError = error as AuthError;
      console.error('Erreur de connexion Google:', authError);
      let errorMessage = authError.message || 'Une erreur inattendue s\'est produite lors de la connexion Google.';
      if (authError.code === 'auth/unauthorized-domain') {
        errorMessage = `Domaine non autorisé pour la connexion Google. Domaine actuel : ${typeof window !== 'undefined' ? window.location.origin : 'Inconnu'}. Veuillez l'ajouter dans votre console Firebase.`
      }
      toast({
        variant: 'destructive',
        title: 'Échec de la Connexion Google',
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserProfile = async (data: { displayName?: string; photoURL?: string | null }): Promise<string | null> => {
    if (!auth.currentUser) {
      throw new Error("Utilisateur non authentifié.");
    }
    const currentUserAuth = auth.currentUser;
    let finalPhotoURLForAuthAndFirestore: string | null = currentUserAuth.photoURL;
    const updatesForAuth: { displayName?: string; photoURL?: string } = {};
    const updatesForFirestore: { name?: string; avatarUrl?: string | null } = {};

    if (data.displayName !== undefined && data.displayName !== (currentUserAuth.displayName || '')) {
      updatesForAuth.displayName = data.displayName;
      updatesForFirestore.name = data.displayName;
    }

    if (data.photoURL !== undefined) {
      if (data.photoURL === null || data.photoURL === '') {
        if (currentUserAuth.photoURL) {
            await deleteProfileImage(currentUserAuth.photoURL);
        }
        finalPhotoURLForAuthAndFirestore = null;
      } else if (data.photoURL.startsWith('data:image')) {
        try {
          finalPhotoURLForAuthAndFirestore = await uploadProfileImage(currentUserAuth.uid, data.photoURL, currentUserAuth.photoURL);
        } catch (uploadError) {
          console.error("Erreur de téléversement de la nouvelle image de profil:", uploadError);
          toast({ variant: 'destructive', title: 'Échec du Téléversement de l\'Image', description: (uploadError as Error).message });
          throw uploadError;
        }
      } else {
        finalPhotoURLForAuthAndFirestore = data.photoURL;
      }
    }
    
    if (finalPhotoURLForAuthAndFirestore !== currentUserAuth.photoURL) {
        updatesForAuth.photoURL = finalPhotoURLForAuthAndFirestore || undefined;
    }
    if (finalPhotoURLForAuthAndFirestore !== (updatesForFirestore.avatarUrl !== undefined ? updatesForFirestore.avatarUrl : (await updateUserInFirestore(currentUserAuth.uid, {}) as any)?.avatarUrl)) {
        updatesForFirestore.avatarUrl = finalPhotoURLForAuthAndFirestore;
    }

    try {
      if (Object.keys(updatesForAuth).length > 0) {
        await updateProfile(currentUserAuth, updatesForAuth);
      }
      if (Object.keys(updatesForFirestore).length > 0) {
         await updateUserInFirestore(currentUserAuth.uid, updatesForFirestore);
      }
      
      const updatedUserContextData = { ...auth.currentUser } as FirebaseUser;
      setUser(updatedUserContextData);

      return updatedUserContextData.photoURL;

    } catch (error) {
      const authError = error as AuthError;
      console.error("Erreur de mise à jour du profil utilisateur dans Auth/Firestore:", authError);
      toast({
          variant: 'destructive',
          title: 'Erreur de Mise à Jour du Profil',
          description: authError.message || "Échec de la mise à jour du profil.",
      });
      throw new Error(authError.message || "Échec de la mise à jour du profil.");
    }
  };
  
  const value = { user, loading, logout, signInWithGoogle, updateUserProfile };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth doit être utilisé au sein d\'un AuthProvider');
  }
  return context;
}

