
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, type AuthError } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Separator } from '@/components/ui/separator';

const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24px" height="24px">
    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l0.001-0.001l6.19,5.238C39.909,34.437,44,29.891,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
  </svg>
);

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoadingEmail, setIsLoadingEmail] = useState(false);
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { signInWithGoogle, loading: authLoading } = useAuth();

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ variant: 'destructive', title: 'Signup Failed', description: 'Passwords do not match.' });
      return;
    }
    setIsLoadingEmail(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      toast({ title: 'Signup Successful', description: 'Redirecting to dashboard...' });
      // router.push('/dashboard'); // AuthProvider will handle redirect
    } catch (error) {
      const authError = error as AuthError;
      console.error('Signup error:', authError);
      toast({
        variant: 'destructive',
        title: 'Signup Failed',
        description: authError.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsLoadingEmail(false);
    }
  };

  const handleGoogleSignup = async () => {
    setIsLoadingGoogle(true);
    try {
        await signInWithGoogle();
        // Toast and redirect are handled by AuthContext or onAuthStateChanged
    } catch (error) {
        // Error is already handled and toasted by signInWithGoogle in AuthContext
    } finally {
        setIsLoadingGoogle(false);
    }
  };

  const isLoading = isLoadingEmail || isLoadingGoogle || authLoading;

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader className="text-center">
         <div className="flex justify-center mb-2">
            <UserPlus className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl font-headline">Create Account</CardTitle>
        <CardDescription>Sign up to start using SiteWise Reports.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleEmailSignup} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="•••••••• (min. 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          <Button type="submit" className="w-full rounded-lg" disabled={isLoading}>
            {isLoadingEmail ? <Loader2 className="animate-spin" /> : 'Sign Up with Email'}
          </Button>
        </form>
        <Separator className="my-6" />
        <Button variant="outline" className="w-full rounded-lg" onClick={handleGoogleSignup} disabled={isLoading}>
          {isLoadingGoogle ? <Loader2 className="animate-spin" /> : <GoogleIcon />}
           <span className="ml-2">Sign up with Google</span>
        </Button>
      </CardContent>
      <CardFooter className="flex flex-col items-center text-sm">
        <p>
          Already have an account?{' '}
          <Button variant="link" asChild className="p-0 h-auto">
            <Link href="/auth/login">Log in</Link>
          </Button>
        </p>
      </CardFooter>
    </Card>
  );
}
