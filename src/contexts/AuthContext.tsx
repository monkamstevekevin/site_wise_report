
'use client';

import type { User as FirebaseUser, AuthError } from 'firebase/auth';
import { onAuthStateChanged, signOut as firebaseSignOut, GoogleAuthProvider, signInWithPopup, updateProfile } from 'firebase/auth';
import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { auth } from '@/lib/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  logout: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  updateUserProfile: (data: { displayName?: string; photoURL?: string }) => Promise<void>; // Added this
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
      // setLoading(false) will be handled by onAuthStateChanged effect
    }
  };

  const updateUserProfile = async (data: { displayName?: string; photoURL?: string }) => {
    if (!auth.currentUser) {
      throw new Error("User not authenticated.");
    }
    try {
      const updateData: { displayName?: string; photoURL?: string } = {};
      if (data.displayName !== undefined) {
        updateData.displayName = data.displayName;
      }
      if (data.photoURL !== undefined) {
        // Send empty string to Firebase Auth if photoURL is meant to be cleared,
        // or the new URL (which could be a data URI or an external URL).
        updateData.photoURL = data.photoURL === null ? '' : data.photoURL;
      }
      
      await updateProfile(auth.currentUser, updateData);
      // onAuthStateChanged should pick up the changes and update the user state.
      // Forcing a local update for quicker UI response if needed, but usually not necessary:
      // setUser({ ...auth.currentUser, ...updateData } as FirebaseUser) 
      // However, it's better to rely on onAuthStateChanged to provide the canonical user object.
      // A simple way to ensure the user object is fresh after an update:
      if (auth.currentUser) { // Check again as it might have been updated
        setUser(Object.assign({}, auth.currentUser)); // Create a new object reference to trigger re-renders
      }

    } catch (error) {
      const authError = error as AuthError;
      console.error("Error updating Firebase user profile:", authError);
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
