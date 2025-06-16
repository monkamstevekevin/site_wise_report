
'use client';

import type { User as FirebaseUser, AuthError } from 'firebase/auth';
import { onAuthStateChanged, signOut as firebaseSignOut, GoogleAuthProvider, signInWithPopup, updateProfile } from 'firebase/auth';
import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { auth } from '@/lib/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { updateUser as updateUserInFirestore } from '@/services/userService';
// Firebase Storage related imports are removed as Storage is not set up.
// import { uploadProfileImage, deleteProfileImage } from '@/services/storageService';

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
      toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
      if (!pathname.startsWith('/auth')) {
        router.push('/auth/login');
      }
    } catch (error) {
      console.error('Error signing out:', error);
      const authError = error as AuthError;
      toast({ variant: 'destructive', title: 'Logout Error', description: authError.message || 'Could not log out.' });
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      toast({ title: 'Sign In Successful', description: 'Welcome!' });
    } catch (error) {
      const authError = error as AuthError;
      console.error('Google Sign-In error:', authError);
      toast({
        variant: 'destructive',
        title: 'Google Sign-In Failed',
        description: authError.message || 'An unexpected error occurred during Google Sign-In.',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserProfile = async (data: { displayName?: string; photoURL?: string | null }): Promise<string | null> => {
    if (!auth.currentUser) {
      throw new Error("User not authenticated.");
    }

    const currentUserAuth = auth.currentUser;
    const updatesForAuth: { displayName?: string; photoURL?: string } = {};
    const updatesForFirestore: { name?: string; avatarUrl?: string | null } = {};

    let finalPhotoURLForContext: string | null = data.photoURL === undefined ? currentUserAuth.photoURL : data.photoURL;

    // Handle displayName update
    if (data.displayName !== undefined && data.displayName !== (currentUserAuth.displayName || '')) {
      updatesForAuth.displayName = data.displayName;
      updatesForFirestore.name = data.displayName;
    }

    // Handle photoURL update
    // Only update Firebase Auth photoURL if it's not a data URI (i.e., it's an http/https URL or null)
    if (data.photoURL !== undefined) {
      if (data.photoURL === null || data.photoURL === '' || data.photoURL.startsWith('http')) {
        updatesForAuth.photoURL = data.photoURL || undefined; // Firebase Auth expects undefined or string for photoURL, not null.
      }
      // For Firestore, always update avatarUrl with the provided photoURL (data URI, http, or null)
      updatesForFirestore.avatarUrl = data.photoURL;
    }


    try {
      // Update Firebase Authentication profile (only displayName and non-dataURI photoURL)
      if (Object.keys(updatesForAuth).length > 0) {
        await updateProfile(currentUserAuth, updatesForAuth);
      }

      // Update Firestore user document (name and avatarUrl which can be data URI)
      if (updatesForFirestore.name || updatesForFirestore.avatarUrl !== undefined) {
         await updateUserInFirestore(currentUserAuth.uid, updatesForFirestore);
      }
      
      // Update context user state
      // Create a new user object for the context state update
      const updatedUserContextData = { ...currentUserAuth } as FirebaseUser; // Create a new object copy
      if (updatesForAuth.displayName) {
        (updatedUserContextData as any).displayName = updatesForAuth.displayName;
      }
      // The photoURL in the context should reflect what was intended to be saved,
      // which is the photoURL from the input form (data.photoURL).
      // This could be a data URI (stored in Firestore) or an HTTP URL (stored in Auth & Firestore).
      (updatedUserContextData as any).photoURL = finalPhotoURLForContext;
      
      setUser(updatedUserContextData);

      return finalPhotoURLForContext;

    } catch (error) {
      const authError = error as AuthError;
      console.error("Error updating user profile in Auth/Firestore:", authError);
      toast({
          variant: 'destructive',
          title: 'Profile Update Error',
          description: authError.message || "Failed to update profile.",
      });
      throw new Error(authError.message || "Failed to update profile.");
    }
  };
  
  const value = { user, loading, logout, signInWithGoogle, updateUserProfile };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
