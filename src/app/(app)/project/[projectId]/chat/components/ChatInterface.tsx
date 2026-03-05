
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Image as ImageIcon, X, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { ChatMessage, NewChatMessagePayload } from '@/lib/types';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { addChatMessage } from '@/services/chatService';
import { getChatMessagesSubscription } from '@/lib/chatClientService';
import { useToast } from '@/hooks/use-toast';


interface ChatInterfaceProps {
  projectId: string;
}

export function ChatInterface({ projectId }: ChatInterfaceProps) {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user || !projectId) {
      setIsLoadingMessages(false);
      setMessages([]);
      return;
    }

    setIsLoadingMessages(true);
    const unsubscribe = getChatMessagesSubscription(
      projectId,
      (fetchedMessages) => {
        setMessages(fetchedMessages.map(msg => ({
            ...msg,
            isOwnMessage: msg.senderId === user.id
        })));
        setIsLoadingMessages(false);
      },
      user.id
    );

    return () => unsubscribe();
  }, [projectId, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!user || (!newMessage.trim() && !imageFile )) return;
    if (!newMessage.trim()) {
        toast({ variant: "destructive", title: "Message Vide", description: "Impossible d'envoyer un message vide."});
        return;
    }

    setIsSending(true);

    const messagePayload: NewChatMessagePayload = {
      projectId,
      senderId: user.id,
      senderName: user.name || user.email || 'Utilisateur Actuel',
      senderAvatar: user.avatarUrl || undefined,
      text: newMessage.trim(),
      imageUrl: null,
    };
    
    try {
      await addChatMessage(projectId, messagePayload);
      setNewMessage('');
    } catch (error) {
      console.error("Erreur d'envoi du message:", error);
      toast({ variant: "destructive", title: "Échec de l'Envoi", description: (error as Error).message });
    } finally {
      setIsSending(false);
    }
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file); 
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      toast({ title: "Image Sélectionnée", description: "Aperçu de l'image affiché. L'envoi d'images n'est pas encore implémenté.", duration: 5000});
    }
  };

  const removeImagePreview = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  }

  if (authLoading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!user) {
    return <p className="p-4 text-center text-muted-foreground">Veuillez vous connecter pour utiliser le chat.</p>;
  }

  return (
    <Card className="flex flex-col h-[calc(100vh-200px)] shadow-lg rounded-lg overflow-hidden">
      <ScrollArea className="flex-grow p-4 space-y-4 bg-muted/30">
        {isLoadingMessages && (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="ml-2 text-muted-foreground">Chargement des messages...</p>
          </div>
        )}
        {!isLoadingMessages && messages.length === 0 && (
          <p className="text-center text-muted-foreground py-10">Aucun message dans ce chat. Commencez la conversation !</p>
        )}
        {!isLoadingMessages && messages.map(msg => (
          <div
            key={msg.id}
            className={cn(
              'flex items-end gap-2 max-w-[75%] mb-3',
              msg.isOwnMessage ? 'ml-auto flex-row-reverse' : 'mr-auto'
            )}
          >
            <Avatar className="h-8 w-8 border">
              <AvatarImage src={msg.senderAvatar || `https://placehold.co/40x40.png?text=${msg.senderName[0]}`} alt={msg.senderName} data-ai-hint="user avatar" />
              <AvatarFallback>{msg.senderName.substring(0, 1).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div
              className={cn(
                'p-3 rounded-xl shadow break-words',
                msg.isOwnMessage
                  ? 'bg-primary text-primary-foreground rounded-br-none'
                  : 'bg-card text-card-foreground rounded-bl-none'
              )}
            >
              <p className="text-xs font-semibold mb-0.5">{msg.isOwnMessage ? 'Vous' : msg.senderName}</p>
              {msg.text && <p className="text-sm whitespace-pre-wrap">{msg.text}</p>}
              <p className="text-xs opacity-70 mt-1 text-right">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </ScrollArea>
      <div className="p-4 border-t bg-background">
        {imagePreview && (
          <div className="mb-2 p-2 border rounded-md relative max-w-[150px]">
            <Image src={imagePreview} alt="Aperçu" width={100} height={100} className="rounded object-contain max-h-24 w-auto" data-ai-hint="image preview" />
            <Button variant="ghost" size="icon" className="absolute top-0 right-0 h-6 w-6 text-destructive hover:bg-destructive/10" onClick={removeImagePreview} title="Retirer l'image">
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Input
            type="text"
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder="Écrivez un message..."
            className="flex-grow"
            onKeyPress={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
            disabled={isSending || isLoadingMessages}
          />
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
            id="chat-image-upload"
            disabled={isSending || isLoadingMessages}
          />
          <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} title="Joindre une image (prévisualisation seulement)" disabled={isSending || isLoadingMessages}>
            <ImageIcon className="h-5 w-5" />
          </Button>
          <Button onClick={handleSendMessage} disabled={isSending || isLoadingMessages || !newMessage.trim()} className="rounded-lg">
            {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        </div>
      </div>
    </Card>
  );
}

