
'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { PageTitle } from '@/components/common/PageTitle';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { UserCircle, Edit3, Save, Loader2, Camera as CameraIcon, Upload, XCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import Image from 'next/image'; // For previewing uploaded/captured image
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

const profileFormSchema = z.object({
  displayName: z.string().min(1, 'Display name is required').max(50, 'Display name is too long'),
  photoURL: z.string().optional(), // Can be URL or data URI
});

type ProfileFormData = z.infer<typeof profileFormSchema>;

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export default function ProfilePage() {
  const { user, loading: authLoading, updateUserProfile } = useAuth(); // Assuming updateUserProfile exists in AuthContext
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showCameraDialog, setShowCameraDialog] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);


  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: '',
      photoURL: '',
    },
  });

  useEffect(() => {
    if (user) {
      const currentPhoto = user.photoURL || '';
      form.reset({
        displayName: user.displayName || '',
        photoURL: currentPhoto,
      });
      setPhotoPreview(currentPhoto);
    }
  }, [user, form, isEditing]); // Re-run if isEditing changes to reset preview on cancel

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast({ variant: 'destructive', title: 'File too large', description: `Max image size is ${MAX_FILE_SIZE_MB}MB.` });
        return;
      }
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        toast({ variant: 'destructive', title: 'Invalid file type', description: 'Only .jpg, .jpeg, .png, and .webp are supported.' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUri = reader.result as string;
        setPhotoPreview(dataUri);
        form.setValue('photoURL', dataUri, { shouldValidate: true, shouldDirty: true });
      };
      reader.readAsDataURL(file);
    }
  };
  
  const openCamera = async () => {
    setShowCameraDialog(true);
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        setHasCameraPermission(true);
        setCameraStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings.',
        });
        setShowCameraDialog(false);
      }
    } else {
      setHasCameraPermission(false);
      toast({ variant: 'destructive', title: 'Camera Not Supported', description: 'Your browser does not support camera access.' });
      setShowCameraDialog(false);
    }
  };

  useEffect(() => {
    // Cleanup camera stream when dialog closes or component unmounts
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);


  const handleCapturePhoto = () => {
    if (videoRef.current && canvasRef.current && cameraStream) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUri = canvas.toDataURL('image/png');
        setPhotoPreview(dataUri);
        form.setValue('photoURL', dataUri, { shouldValidate: true, shouldDirty: true });
      }
      cameraStream.getTracks().forEach(track => track.stop()); // Stop stream after capture
      setCameraStream(null);
      setShowCameraDialog(false);
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    setIsSubmitting(true);
    // In a real app, if photoURL is a data URI, you'd upload it to Firebase Storage first,
    // get the storage URL, and then update the user's profile with that URL.
    // For this simulation, we'll directly use the data.photoURL (which could be a data URI or an external URL).
    
    // Simulating the update process
    // await updateUserProfile({ displayName: data.displayName, photoURL: data.photoURL }); // Hypothetical function in AuthContext
    
    // For now, just toast the "update"
    console.log('Simulating profile update with:', data);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    toast({
      title: 'Profile Updated (Simulated)',
      description: 'Your profile information has been "updated". If a new photo was provided as data, it would typically be uploaded to storage first.',
    });
    setIsEditing(false);
    setIsSubmitting(false);
    // If using Firebase Auth:
    // if (auth.currentUser) {
    //   await updateProfile(auth.currentUser, { displayName: data.displayName, photoURL: data.photoURL });
    //   // Force re-fetch or update context user
    // }
  };
  
  const currentPhotoForAvatar = photoPreview || user?.photoURL || `https://placehold.co/100x100.png?text=${user?.email?.[0]?.toUpperCase() || 'U'}`;

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
          <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
            <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-2 border-primary shadow-md">
              <AvatarImage src={currentPhotoForAvatar} alt={form.watch('displayName') || user.displayName || 'User'} data-ai-hint="user avatar" />
              <AvatarFallback className="text-3xl sm:text-4xl">{user.email?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
            <div className="text-center sm:text-left">
              <CardTitle className="text-2xl sm:text-3xl">{form.watch('displayName') || user.displayName || 'User Name'}</CardTitle>
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
                        <Input placeholder="Your full name" {...field} disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Photo Upload and Camera Options */}
                <div className="space-y-2">
                    <FormLabel>Profile Photo</FormLabel>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isSubmitting}>
                            <Upload className="mr-2 h-4 w-4" /> Upload Photo
                        </Button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*"
                            className="hidden"
                        />
                        <Button type="button" variant="outline" onClick={openCamera} disabled={isSubmitting}>
                            <CameraIcon className="mr-2 h-4 w-4" /> Take Photo
                        </Button>
                    </div>
                </div>

                <FormField
                  control={form.control}
                  name="photoURL"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Photo URL</FormLabel>
                      <FormControl>
                        <Input placeholder="Or paste an image URL" {...field} disabled={isSubmitting} />
                      </FormControl>
                      <FormDescription>
                        The URL will be used if no photo is uploaded or taken.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {photoPreview && (
                  <div className="space-y-2">
                    <Label>Current Photo Preview:</Label>
                    <div className="relative w-fit border p-2 rounded-md">
                      <Image src={photoPreview} alt="Profile preview" width={150} height={150} className="rounded-md object-cover max-h-48 w-auto" data-ai-hint="profile preview" />
                       <Button variant="ghost" size="icon" className="absolute -top-3 -right-3 h-7 w-7 bg-background rounded-full text-destructive hover:bg-destructive/10" onClick={() => { setPhotoPreview(user.photoURL || null); form.setValue('photoURL', user.photoURL || ''); if(fileInputRef.current) fileInputRef.current.value = ''; }} title="Clear new photo selection" type="button" disabled={isSubmitting}>
                          <XCircle className="h-5 w-5"/>
                       </Button>
                    </div>
                  </div>
                )}

                <div className="flex space-x-2 justify-end pt-4">
                  <Button type="button" variant="outline" onClick={() => {
                    setIsEditing(false);
                    const currentPhoto = user.photoURL || '';
                    form.reset({ displayName: user.displayName || '', photoURL: currentPhoto });
                    setPhotoPreview(currentPhoto);
                    if (fileInputRef.current) fileInputRef.current.value = '';
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Camera Dialog */}
      <Dialog open={showCameraDialog} onOpenChange={(isOpen) => {
        setShowCameraDialog(isOpen);
        if (!isOpen && cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            setCameraStream(null);
        }
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Take a Profile Photo</DialogTitle>
          </DialogHeader>
          {hasCameraPermission === false && (
             <Alert variant="destructive">
                <CameraIcon className="h-4 w-4" />
                <AlertTitle>Camera Access Denied</AlertTitle>
                <AlertDescription>
                    Please enable camera permissions in your browser settings to use this feature. You may need to reload the page after granting permission.
                </AlertDescription>
            </Alert>
          )}
           {hasCameraPermission === null && (
             <div className="flex items-center justify-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2">Requesting camera access...</p>
            </div>
          )}
          {hasCameraPermission && (
            <div className="space-y-4">
                <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay playsInline muted />
                <canvas ref={canvasRef} className="hidden"></canvas>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="outline" onClick={() => {
                    if (cameraStream) {
                        cameraStream.getTracks().forEach(track => track.stop());
                        setCameraStream(null);
                    }
                }}>
                Cancel
                </Button>
            </DialogClose>
            <Button onClick={handleCapturePhoto} disabled={!hasCameraPermission || !cameraStream} className="rounded-lg">
              <CameraIcon className="mr-2 h-4 w-4" /> Capture
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
