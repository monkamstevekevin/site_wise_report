
'use client';

import type { User as FirebaseUser, AuthError } from 'firebase/auth';
import { onAuthStateChanged, signOut as firebaseSignOut, GoogleAuthProvider, signInWithPopup, updateProfile } from 'firebase/auth';
import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { auth } from '@/lib/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { updateUser as updateUserInFirestore } from '@/services/userService'; // Import Firestore update function

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  logout: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  updateUserProfile: (data: { displayName?: string; photoURL?: string | null }) => Promise<void>;
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
      // Firestore user document creation/update would happen here or via a trigger
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

  const updateUserProfile = async (data: { displayName?: string; photoURL?: string | null }) => {
    if (!auth.currentUser) {
      throw new Error("User not authenticated.");
    }
    
    const currentUserAuth = auth.currentUser;
    const updatesForAuth: { displayName?: string; photoURL?: string } = {};
    const updatesForFirestore: { displayName?: string; avatarUrl?: string | null } = {};
    let authProfileChanged = false;
    let firestoreProfileChanged = false;

    // Prepare displayName update
    if (data.displayName !== undefined && data.displayName !== (currentUserAuth.displayName || '')) {
      updatesForAuth.displayName = data.displayName;
      updatesForFirestore.displayName = data.displayName; // Using displayName for Firestore 'name' field
      authProfileChanged = true;
      firestoreProfileChanged = true;
    }

    // Prepare photoURL update
    if (data.photoURL !== undefined) { // If photoURL is explicitly passed (even if null or empty)
      const newPhotoVal = data.photoURL;
      const currentAuthPhoto = currentUserAuth.photoURL || null;

      // Always update Firestore avatarUrl with what was provided
      updatesForFirestore.avatarUrl = newPhotoVal;
      firestoreProfileChanged = true;

      // Only update Firebase Auth photoURL if it's a valid http/s URL or if clearing
      if (newPhotoVal === null || newPhotoVal === '' || (newPhotoVal && (newPhotoVal.startsWith('http://') || newPhotoVal.startsWith('https://')))) {
        if (newPhotoVal !== currentAuthPhoto) {
          updatesForAuth.photoURL = newPhotoVal === '' ? undefined : newPhotoVal; // Firebase updateProfile clears with undefined or null for photoURL
          authProfileChanged = true;
        }
      } else if (newPhotoVal && newPhotoVal.startsWith('data:')) {
        // It's a data URI. Don't send to Firebase Auth to avoid "URL too long" error.
        // Firestore will get it via updatesForFirestore.avatarUrl.
        toast({
          title: "Photo Preview Set",
          description: "Your new photo is set for display. It will be saved in the app's database. Firebase Auth profile photo remains unchanged for data URIs.",
          duration: 7000,
        });
      }
    }
    
    try {
      // Update Firebase Auth Profile if changes are present
      if (authProfileChanged) {
        await updateProfile(currentUserAuth, updatesForAuth);
      }

      // Update Firestore user document if changes are present
      if (firestoreProfileChanged) {
        await updateUserInFirestore(currentUserAuth.uid, {
          name: updatesForFirestore.displayName, // Pass name if displayName changed
          avatarUrl: updatesForFirestore.avatarUrl, // Pass avatarUrl
          // role is not updated here
        });
      }
      
      // Update local AuthContext state to reflect all intended changes immediately
      // This ensures UI consistency, especially for data URIs not sent to Firebase Auth.
      const updatedUser = { ...currentUserAuth } as FirebaseUser; // Create a mutable copy
      if (data.displayName !== undefined) {
        (updatedUser as any).displayName = data.displayName;
      }
      if (data.photoURL !== undefined) { // If photoURL was part of the input data
        (updatedUser as any).photoURL = data.photoURL; // Use the submitted photoURL (could be data URI)
      }
      setUser(updatedUser);

    } catch (error) {
      const authError = error as AuthError;
      console.error("Error updating user profile (Auth/Firestore):", authError);
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
