
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
import Image from 'next/image';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

const profileFormSchema = z.object({
  displayName: z.string().min(1, 'Le nom d\'affichage est requis').max(50, 'Le nom d\'affichage est trop long'),
  photoURL: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileFormSchema>;

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export default function ProfilePage() {
  const { user, loading: authLoading, updateUserProfile } = useAuth();
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
    if (user && !isEditing) {
      const currentPhoto = user.photoURL || '';
      form.reset({
        displayName: user.displayName || '',
        photoURL: currentPhoto,
      });
      setPhotoPreview(currentPhoto);
    }
  }, [user, form, isEditing]);
  
  const initializeFormForEditing = () => {
    if (user) {
      const currentPhoto = user.photoURL || '';
      form.reset({
        displayName: user.displayName || '',
        photoURL: currentPhoto,
      });
      setPhotoPreview(currentPhoto);
    }
  };


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast({ variant: 'destructive', title: 'Fichier trop volumineux', description: `La taille maximale de l'image est de ${MAX_FILE_SIZE_MB}Mo.` });
        return;
      }
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        toast({ variant: 'destructive', title: 'Type de fichier invalide', description: 'Seuls les formats .jpg, .jpeg, .png et .webp sont pris en charge.' });
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
        console.error('Erreur d\'accès à la caméra:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Accès Caméra Refusé',
          description: 'Veuillez activer les permissions de la caméra dans les paramètres de votre navigateur.',
        });
        setShowCameraDialog(false);
      }
    } else {
      setHasCameraPermission(false);
      toast({ variant: 'destructive', title: 'Caméra Non Supportée', description: 'Votre navigateur ne supporte pas l\'accès à la caméra.' });
      setShowCameraDialog(false);
    }
  };

  useEffect(() => {
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
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
      setShowCameraDialog(false);
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    setIsSubmitting(true);
    if (!user) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Utilisateur non trouvé.' });
      setIsSubmitting(false);
      return;
    }

    try {
      const finalSavedPhotoURL = await updateUserProfile({ 
        displayName: data.displayName, 
        photoURL: data.photoURL 
      });
      
      toast({
        title: 'Profil Mis à Jour',
        description: 'Vos informations de profil ont été mises à jour avec succès.',
      });
      
      form.reset({
        displayName: data.displayName, 
        photoURL: finalSavedPhotoURL || '',
      });
      setPhotoPreview(finalSavedPhotoURL || '');
      setIsEditing(false);

    } catch (error) {
      console.error('Erreur de mise à jour du profil:', error);
      toast({
        variant: 'destructive',
        title: 'Échec de la Mise à Jour',
        description: (error as Error).message || 'Impossible de mettre à jour le profil.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const currentAvatarSrc = isEditing 
                           ? (photoPreview || user?.photoURL || `https://placehold.co/100x100.png?text=${user?.email?.[0]?.toUpperCase() || 'U'}`) 
                           : (user?.photoURL || `https://placehold.co/100x100.png?text=${user?.email?.[0]?.toUpperCase() || 'U'}`);


  if (authLoading) {
    return (
      <div className="space-y-6">
        <PageTitle title="Mon Profil" icon={UserCircle} subtitle="Afficher et gérer les détails de votre profil." />
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
      <PageTitle title="Mon Profil" icon={UserCircle} subtitle="Veuillez vous connecter pour voir votre profil." />
    );
  }

  return (
    <>
      <PageTitle 
        title="Mon Profil" 
        icon={UserCircle}
        subtitle="Afficher et gérer les détails de votre profil."
        actions={
          !isEditing && (
            <Button onClick={() => {
              setIsEditing(true);
              initializeFormForEditing();
            }} className="rounded-lg">
              <Edit3 className="mr-2 h-4 w-4" /> Modifier le Profil
            </Button>
          )
        }
      />

      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
            <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-2 border-primary shadow-md">
              <AvatarImage src={currentAvatarSrc} alt={form.watch('displayName') || user.displayName || 'Utilisateur'} data-ai-hint="user avatar" />
              <AvatarFallback className="text-3xl sm:text-4xl">{user.email?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
            <div className="text-center sm:text-left">
              <CardTitle className="text-2xl sm:text-3xl">{isEditing ? form.watch('displayName') : (user.displayName || 'Nom d\'utilisateur')}</CardTitle>
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
                      <FormLabel>Nom d'affichage</FormLabel>
                      <FormControl>
                        <Input placeholder="Votre nom complet" {...field} disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="space-y-2">
                    <FormLabel>Photo de Profil</FormLabel>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isSubmitting}>
                            <Upload className="mr-2 h-4 w-4" /> Télécharger une Photo
                        </Button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*"
                            className="hidden"
                        />
                        <Button type="button" variant="outline" onClick={openCamera} disabled={isSubmitting}>
                            <CameraIcon className="mr-2 h-4 w-4" /> Prendre une Photo
                        </Button>
                    </div>
                </div>

                <FormField
                  control={form.control}
                  name="photoURL"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL de la Photo (ou laisser vide pour effacer)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Collez une URL d'image ou laissez vide pour effacer. Affichera l'URL de stockage après téléversement." 
                          {...field} 
                          value={field.value || ''} 
                          disabled={isSubmitting} 
                          onChange={(e) => { 
                            field.onChange(e);
                            setPhotoPreview(e.target.value);
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Après avoir téléchargé ou pris une photo, ses données apparaîtront ici temporairement. Après sauvegarde, si réussie, une URL Firebase Storage apparaîtra ici.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {photoPreview && (
                  <div className="space-y-2">
                    <Label>Aperçu de la photo actuelle :</Label>
                    <div className="relative w-fit border p-2 rounded-md">
                      <Image src={photoPreview} alt="Aperçu du profil" width={150} height={150} className="rounded-md object-cover max-h-48 w-auto" data-ai-hint="profile preview" />
                       <Button variant="ghost" size="icon" className="absolute -top-3 -right-3 h-7 w-7 bg-background rounded-full text-destructive hover:bg-destructive/10" 
                         onClick={() => { 
                            setPhotoPreview(null); 
                            form.setValue('photoURL', ''); 
                            if(fileInputRef.current) fileInputRef.current.value = ''; 
                         }} 
                         title="Effacer la sélection de photo" type="button" disabled={isSubmitting}>
                          <XCircle className="h-5 w-5"/>
                       </Button>
                    </div>
                  </div>
                )}

                <div className="flex space-x-2 justify-end pt-4">
                  <Button type="button" variant="outline" onClick={() => {
                    setIsEditing(false); 
                    if (user) {
                        const currentPhoto = user.photoURL || '';
                        form.reset({ displayName: user.displayName || '', photoURL: currentPhoto });
                        setPhotoPreview(currentPhoto);
                    }
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }} disabled={isSubmitting}>
                    Annuler
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="rounded-lg">
                    {isSubmitting ? <Loader2 className="animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Enregistrer les Modifications
                  </Button>
                </div>
              </form>
            </Form>
          ) : (
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-sm text-muted-foreground">Nom d'affichage</Label>
                <p className="text-lg">{user.displayName || 'Non défini'}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Photo URL</Label>
                {user.photoURL ? (
                  (user.photoURL.startsWith('data:image') || user.photoURL.startsWith('http')) ? (
                     <Image src={user.photoURL} alt="Profil" width={100} height={100} className="rounded-md mt-1" data-ai-hint="profile image" />
                  ) : (
                     <p className="text-lg break-all">{user.photoURL}</p>
                  )
                ) : (
                  <p className="text-lg">Non définie</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCameraDialog} onOpenChange={(isOpen) => {
        setShowCameraDialog(isOpen);
        if (!isOpen && cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            setCameraStream(null);
        }
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Prendre une Photo de Profil</DialogTitle>
          </DialogHeader>
          {hasCameraPermission === false && (
             <Alert variant="destructive">
                <CameraIcon className="h-4 w-4" />
                <AlertTitle>Accès Caméra Refusé</AlertTitle>
                <AlertDescription>
                    Veuillez activer les permissions de la caméra dans les paramètres de votre navigateur pour utiliser cette fonctionnalité. Vous devrez peut-être recharger la page après avoir accordé la permission.
                </AlertDescription>
            </Alert>
          )}
           {hasCameraPermission === null && (
             <div className="flex items-center justify-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2">Demande d'accès à la caméra...</p>
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
                Annuler
                </Button>
            </DialogClose>
            <Button onClick={handleCapturePhoto} disabled={!hasCameraPermission || !cameraStream} className="rounded-lg">
              <CameraIcon className="mr-2 h-4 w-4" /> Capturer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

