
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
import { UserCircle, Edit3, Save, Loader2, Camera as CameraIcon, Upload, XCircle, KeyRound } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import Image from 'next/image';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { uploadProfileImage } from '@/services/storageService';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

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

  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      toast({ variant: 'destructive', title: 'Mot de passe trop court', description: 'Minimum 8 caractères requis.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ variant: 'destructive', title: 'Mots de passe différents', description: 'Les deux mots de passe ne correspondent pas.' });
      return;
    }
    setIsChangingPassword(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: 'Mot de passe mis à jour', description: 'Votre mot de passe a été changé avec succès.' });
      setShowPasswordDialog(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erreur', description: (err as Error).message });
    } finally {
      setIsChangingPassword(false);
    }
  };

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
      const currentPhoto = user.avatarUrl || '';
      form.reset({
        displayName: user.name || '',
        photoURL: currentPhoto,
      });
      setPhotoPreview(currentPhoto);
    }
  }, [user, form, isEditing]);
  
  const initializeFormForEditing = () => {
    if (user) {
      const currentPhoto = user.avatarUrl || '';
      form.reset({
        displayName: user.name || '',
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
      // Si c'est un data URI, on l'upload dans Supabase Storage d'abord
      let avatarUrl: string | null = data.photoURL || null;
      if (avatarUrl && avatarUrl.startsWith('data:image')) {
        avatarUrl = await uploadProfileImage(user.id, avatarUrl, user.avatarUrl);
      }

      const finalSavedPhotoURL = await updateUserProfile({
        name: data.displayName,
        avatarUrl,
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
                           ? (photoPreview || user?.avatarUrl || `https://placehold.co/100x100.png?text=${user?.email?.[0]?.toUpperCase() || 'U'}`)
                           : (user?.avatarUrl || `https://placehold.co/100x100.png?text=${user?.email?.[0]?.toUpperCase() || 'U'}`);


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
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowPasswordDialog(true)} className="rounded-lg">
                <KeyRound className="mr-2 h-4 w-4" /> Changer le mot de passe
              </Button>
              <Button onClick={() => { setIsEditing(true); initializeFormForEditing(); }} className="rounded-lg">
                <Edit3 className="mr-2 h-4 w-4" /> Modifier le Profil
              </Button>
            </div>
          )
        }
      />

      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
            <div className="relative">
              <Avatar className="h-32 w-32 sm:h-44 sm:w-44 ring-4 ring-primary/30 shadow-xl">
                <AvatarImage src={currentAvatarSrc} alt={form.watch('displayName') || user.name || 'Utilisateur'} className="object-cover" data-ai-hint="user avatar" />
                <AvatarFallback className="text-4xl sm:text-5xl">{user.email?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
              </Avatar>
              {isEditing && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-1 right-1 bg-primary text-primary-foreground rounded-full p-2 shadow-md hover:bg-primary/90 transition-colors"
                  title="Changer la photo"
                >
                  <CameraIcon className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="text-center sm:text-left">
              <CardTitle className="text-2xl sm:text-3xl">{isEditing ? form.watch('displayName') : (user.name || 'Nom d\'utilisateur')}</CardTitle>
              <CardDescription className="text-base">{user.email}</CardDescription>
              <CardDescription className="text-sm mt-1">ID: {user.id}</CardDescription>
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
                    <div className="relative w-fit">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photoPreview} alt="Aperçu du profil" className="h-32 w-32 rounded-full object-cover ring-4 ring-primary/30 shadow-md" />
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
                        const currentPhoto = user.avatarUrl || '';
                        form.reset({ displayName: user.name || '', photoURL: currentPhoto });
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
                <p className="text-lg">{user.name || 'Non défini'}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Photo URL</Label>
                {user.avatarUrl ? (
                  user.avatarUrl.startsWith('http') ? (
                    <Image src={user.avatarUrl} alt="Profil" width={128} height={128} className="rounded-full mt-1 object-cover ring-4 ring-primary/20 shadow-md" data-ai-hint="profile image" />
                  ) : user.avatarUrl.startsWith('data:image') ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.avatarUrl} alt="Profil" className="h-32 w-32 rounded-full mt-1 object-cover ring-4 ring-primary/20 shadow-md" />
                  ) : (
                     <p className="text-lg break-all">{user.avatarUrl}</p>
                  )
                ) : (
                  <p className="text-lg">Non définie</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Password change dialog ────────────────────────────────────── */}
      <Dialog open={showPasswordDialog} onOpenChange={(open) => { setShowPasswordDialog(open); if (!open) { setNewPassword(''); setConfirmPassword(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5" /> Changer le mot de passe</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nouveau mot de passe</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Minimum 8 caractères"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                disabled={isChangingPassword}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Répétez le nouveau mot de passe"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                disabled={isChangingPassword}
                onKeyDown={e => e.key === 'Enter' && handleChangePassword()}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={isChangingPassword}>Annuler</Button>
            </DialogClose>
            <Button onClick={handleChangePassword} disabled={isChangingPassword} className="rounded-lg">
              {isChangingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
              Mettre à jour
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

