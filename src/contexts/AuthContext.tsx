
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
  updateUserProfile: (data: { displayName?: string; photoURL?: string }) => Promise<void>;
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
      const updateDataForAuth: { displayName?: string; photoURL?: string } = {};
      
      if (data.displayName !== undefined) {
        updateDataForAuth.displayName = data.displayName;
      }

      if (data.photoURL !== undefined) {
        if (data.photoURL === null || data.photoURL === '') {
          updateDataForAuth.photoURL = ''; // Send empty string to Firebase to clear photo
        } else if (data.photoURL.startsWith('http://') || data.photoURL.startsWith('https://')) {
          updateDataForAuth.photoURL = data.photoURL;
        } else if (data.photoURL.startsWith('data:')) {
          // It's a data URI. Don't send to Firebase Auth directly to avoid "URL too long" error.
          // The UI preview on the profile page will still show the new image.
          // A full solution requires uploading to Firebase Storage and then using that URL.
          console.warn("Attempted to set a data URI as photoURL in Firebase Auth. This step is skipped to prevent errors. Firebase Storage integration is needed for persistence of uploaded/taken photos.");
          toast({
            title: "Photo Preview Updated",
            description: "Your photo preview is updated. To save new uploads/captures permanently, Firebase Storage integration is required. External URLs or clearing the photo will be saved in your profile.",
            duration: 8000,
          });
          // Importantly, we do *not* add data.photoURL to updateDataForAuth if it's a data URI.
        }
      }
      
      if (Object.keys(updateDataForAuth).length > 0) {
        await updateProfile(auth.currentUser, updateDataForAuth);
      }
      
      if (auth.currentUser) {
        setUser(Object.assign({}, auth.currentUser)); 
      }

    } catch (error) {
      const authError = error as AuthError;
      console.error("Error updating Firebase user profile:", authError);
      // The specific "Photo URL too long" error should be caught by the logic above for data URIs.
      // This catch block will handle other potential errors from updateProfile.
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
