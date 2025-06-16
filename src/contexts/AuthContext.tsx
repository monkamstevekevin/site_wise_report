
'use client';

import type { User as FirebaseUser, AuthError } from 'firebase/auth';
import { onAuthStateChanged, signOut as firebaseSignOut, GoogleAuthProvider, signInWithPopup, updateProfile } from 'firebase/auth';
import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { auth } from '@/lib/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { updateUser as updateUserInFirestore } from '@/services/userService';
import { uploadProfileImage, deleteProfileImage } from '@/services/storageService'; // Import storage services

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
    } catch (error) {
      const authError = error as AuthError;
      console.error('Google Sign-In error:', authError);
      toast({
        variant: 'destructive',
        title: 'Google Sign-In Failed',
        description: authError.message || 'An unexpected error occurred during Google Sign-In.',
      });
    }
  };

  const updateUserProfile = async (data: { displayName?: string; photoURL?: string | null }) => {
    if (!auth.currentUser) {
      throw new Error("User not authenticated.");
    }

    const currentUserAuth = auth.currentUser;
    const updatesForAuth: { displayName?: string; photoURL?: string } = {};
    const updatesForFirestore: { name?: string; avatarUrl?: string | null } = {};
    let finalPhotoURLForContext: string | null = currentUserAuth.photoURL; // Start with current photo

    // Handle displayName update
    if (data.displayName !== undefined && data.displayName !== (currentUserAuth.displayName || '')) {
      updatesForAuth.displayName = data.displayName;
      updatesForFirestore.name = data.displayName;
    }

    // Handle photoURL update
    if (data.photoURL !== undefined) { // photoURL is explicitly part of the input
      const newPhotoData = data.photoURL; // This could be data URI, http/s URL, or null/empty

      if (newPhotoData === null || newPhotoData === '') { // User wants to clear the photo
        if (currentUserAuth.photoURL) { // If there's an existing photo
          await deleteProfileImage(currentUserAuth.photoURL); // Attempt to delete from Storage
        }
        finalPhotoURLForContext = null;
        updatesForAuth.photoURL = undefined; // Send undefined to Firebase Auth to clear
        updatesForFirestore.avatarUrl = null;
      } else if (newPhotoData.startsWith('data:')) { // New image (data URI) provided
        try {
          const storageURL = await uploadProfileImage(currentUserAuth.uid, newPhotoData, currentUserAuth.photoURL);
          finalPhotoURLForContext = storageURL;
          updatesForAuth.photoURL = storageURL;
          updatesForFirestore.avatarUrl = storageURL;
        } catch (uploadError) {
          console.error("Error uploading new profile image to Firebase Storage:", uploadError);
          toast({
            variant: 'destructive',
            title: 'Photo Upload Failed',
            description: (uploadError as Error).message || "Could not upload new photo to storage. Name update (if any) will still be attempted.",
          });
          // Don't set photo updates for Auth/Firestore if upload failed
          // finalPhotoURLForContext will remain the original photo
        }
      } else if (newPhotoData.startsWith('http://') || newPhotoData.startsWith('https://')) { // External URL
        if (newPhotoData !== currentUserAuth.photoURL) {
             if (currentUserAuth.photoURL && currentUserAuth.photoURL.includes('firebasestorage.googleapis.com')) {
                await deleteProfileImage(currentUserAuth.photoURL); // Delete old if it was a storage image
            }
            finalPhotoURLForContext = newPhotoData;
            updatesForAuth.photoURL = newPhotoData;
            updatesForFirestore.avatarUrl = newPhotoData;
        } else {
            // External URL is same as current, no change
            finalPhotoURLForContext = currentUserAuth.photoURL;
        }
      }
    }

    try {
      // Update Firebase Auth Profile if changes are present
      if (Object.keys(updatesForAuth).length > 0) {
        await updateProfile(currentUserAuth, updatesForAuth);
      }

      // Update Firestore user document if name or avatarUrl changed
      if (updatesForFirestore.name || updatesForFirestore.avatarUrl !== undefined) {
         await updateUserInFirestore(currentUserAuth.uid, updatesForFirestore);
      }
      
      // Update local AuthContext state
      const updatedUser = { ...currentUserAuth } as FirebaseUser; // Create a mutable copy
      if (updatesForAuth.displayName) {
        (updatedUser as any).displayName = updatesForAuth.displayName;
      }
      // Update photoURL in context only if it was part of the input (data.photoURL !== undefined)
      // and use the finalPhotoURLForContext which reflects the outcome of storage upload/deletion.
      if (data.photoURL !== undefined) {
          (updatedUser as any).photoURL = finalPhotoURLForContext;
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
