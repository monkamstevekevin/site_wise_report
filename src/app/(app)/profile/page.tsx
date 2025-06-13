
'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { PageTitle } from '@/components/common/PageTitle';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { UserCircle, Edit3, Save, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const profileFormSchema = z.object({
  displayName: z.string().min(1, 'Display name is required').max(50, 'Display name is too long'),
  photoURL: z.string().url('Must be a valid URL').or(z.literal('')).optional(),
});

type ProfileFormData = z.infer<typeof profileFormSchema>;

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: '',
      photoURL: '',
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
      });
    }
  }, [user, form]);

  const onSubmit = async (data: ProfileFormData) => {
    setIsSubmitting(true);
    console.log('Profile update data:', data);
    // In a real app, you would call a function here to update the user's profile in Firebase Auth and/or your database
    // e.g., await updateUserProfile(data);
    // For Firebase Auth, you might use updateProfile from 'firebase/auth'
    // For database, you'd make an API call to your backend.
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    toast({
      title: 'Profile Updated (Simulated)',
      description: 'Your profile information has been "updated". In a real app, this would be saved.',
    });
    setIsEditing(false);
    setIsSubmitting(false);
    // Potentially re-fetch user or update AuthContext state if Firebase Auth was updated.
  };

  if (authLoading) {
    return (
      <div className="space-y-6">
        <PageTitle title="My Profile" icon={UserCircle} subtitle="View and manage your profile details." />
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center space-x-4">
              <Skeleton className="h-24 w-24 rounded-full" />
              <div>
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-32 mb-6" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-1/2" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-8 w-1/2" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <PageTitle title="My Profile" icon={UserCircle} subtitle="Please log in to view your profile." />
    );
  }

  return (
    <>
      <PageTitle 
        title="My Profile" 
        icon={UserCircle}
        subtitle="View and manage your profile details."
        actions={
          !isEditing && (
            <Button onClick={() => setIsEditing(true)} className="rounded-lg">
              <Edit3 className="mr-2 h-4 w-4" /> Edit Profile
            </Button>
          )
        }
      />

      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex items-start space-x-6">
            <Avatar className="h-24 w-24 border-2 border-primary shadow-md">
              <AvatarImage src={form.watch('photoURL') || user.photoURL || `https://placehold.co/100x100.png?text=${user.email?.[0]?.toUpperCase() || 'U'}`} alt={user.displayName || 'User'} data-ai-hint="user avatar" />
              <AvatarFallback className="text-3xl">{user.email?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-2xl">{form.watch('displayName') || user.displayName || 'User Name'}</CardTitle>
              <CardDescription className="text-base">{user.email}</CardDescription>
              <CardDescription className="text-sm mt-1">UID: {user.uid}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="photoURL"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Photo URL (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com/your-photo.jpg" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex space-x-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => {
                    setIsEditing(false);
                    form.reset({ displayName: user.displayName || '', photoURL: user.photoURL || '' });
                  }} disabled={isSubmitting}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="rounded-lg">
                    {isSubmitting ? <Loader2 className="animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save Changes
                  </Button>
                </div>
              </form>
            </Form>
          ) : (
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-sm text-muted-foreground">Display Name</Label>
                <p className="text-lg">{user.displayName || 'Not set'}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Photo URL</Label>
                <p className="text-lg break-all">{user.photoURL || 'Not set'}</p>
              </div>
              {/* Add more profile fields here if needed */}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
