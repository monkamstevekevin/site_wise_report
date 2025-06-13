
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Paperclip, Send, Image as ImageIcon, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { ChatMessage } from '@/lib/types';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';


const mockInitialMessages = (projectId: string, currentUserId: string, currentUserName: string, currentUserAvatar?: string): ChatMessage[] => [
  {
    id: 'msg1',
    projectId,
    senderId: 'USR002',
    senderName: 'Marcus Rivera',
    senderAvatar: 'https://placehold.co/40x40.png?text=MR',
    text: 'Salut ! Comment avance le coulage du béton ?',
    timestamp: new Date(Date.now() - 5 * 60000).toISOString(), // 5 mins ago
  },
  {
    id: 'msg2',
    projectId,
    senderId: currentUserId,
    senderName: currentUserName,
    senderAvatar: currentUserAvatar,
    text: 'Ça avance bien, nous avons presque terminé la section A.',
    timestamp: new Date(Date.now() - 4 * 60000).toISOString(), // 4 mins ago
    isOwnMessage: true,
  },
  {
    id: 'msg3',
    projectId,
    senderId: 'USR002',
    senderName: 'Marcus Rivera',
    senderAvatar: 'https://placehold.co/40x40.png?text=MR',
    text: 'Parfait. Peux-tu m\'envoyer une photo une fois que c\'est fait ?',
    timestamp: new Date(Date.now() - 3 * 60000).toISOString(), // 3 mins ago
  },
  {
    id: 'msg4',
    projectId,
    senderId: currentUserId,
    senderName: currentUserName,
    senderAvatar: currentUserAvatar,
    imageUrl: 'https://placehold.co/300x200.png',
    text: 'Voilà la photo demandée.',
    timestamp: new Date(Date.now() - 1 * 60000).toISOString(), // 1 min ago
    isOwnMessage: true,
  },
];

interface ChatInterfaceProps {
  projectId: string;
}

export function ChatInterface({ projectId }: ChatInterfaceProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setMessages(mockInitialMessages(projectId, user.uid, user.displayName || user.email || 'Moi', user.photoURL || undefined));
    }
  }, [projectId, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!user || (!newMessage.trim() && !imageFile)) return;

    const messageId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    const messagePayload: ChatMessage = {
      id: messageId,
      projectId,
      senderId: user.uid,
      senderName: user.displayName || user.email || 'Utilisateur Actuel',
      senderAvatar: user.photoURL || undefined,
      timestamp,
      isOwnMessage: true,
    };

    if (imageFile && imagePreview) {
      messagePayload.imageUrl = imagePreview; // Use data URI from preview
      if (newMessage.trim()) {
        messagePayload.text = newMessage.trim();
      }
    } else {
      messagePayload.text = newMessage.trim();
    }
    
    setMessages(prevMessages => [...prevMessages, messagePayload]);
    setNewMessage('');
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Reset file input
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
    }
  };

  const removeImagePreview = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  }

  if (!user) {
    return <p>Veuillez vous connecter pour utiliser le chat.</p>;
  }

  return (
    <Card className="flex flex-col h-[calc(100vh-200px)] shadow-lg rounded-lg overflow-hidden">
      <ScrollArea className="flex-grow p-4 space-y-4 bg-muted/30">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={cn(
              'flex items-end gap-2 max-w-[75%] mb-3',
              msg.isOwnMessage ? 'ml-auto flex-row-reverse' : 'mr-auto'
            )}
          >
            <Avatar className="h-8 w-8 border">
              <AvatarImage src={msg.senderAvatar || `https://placehold.co/40x40.png?text=${msg.senderName[0]}`} alt={msg.senderName} data-ai-hint="user avatar" />
              <AvatarFallback>{msg.senderName.substring(0, 1)}</AvatarFallback>
            </Avatar>
            <div
              className={cn(
                'p-3 rounded-xl shadow',
                msg.isOwnMessage
                  ? 'bg-primary text-primary-foreground rounded-br-none'
                  : 'bg-card text-card-foreground rounded-bl-none'
              )}
            >
              <p className="text-xs font-semibold mb-0.5">{msg.isOwnMessage ? 'Vous' : msg.senderName}</p>
              {msg.imageUrl && (
                <Image
                  src={msg.imageUrl}
                  alt="Image envoyée"
                  width={200}
                  height={150}
                  className="rounded-md my-1 object-cover"
                  data-ai-hint="chat image"
                />
              )}
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
            <Image src={imagePreview} alt="Aperçu" width={100} height={100} className="rounded object-contain max-h-24 w-auto" />
            <Button variant="ghost" size="icon" className="absolute top-0 right-0 h-6 w-6 text-destructive hover:bg-destructive/10" onClick={removeImagePreview}>
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
          />
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
            id="chat-image-upload"
          />
          <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} title="Joindre une image">
            <ImageIcon className="h-5 w-5" />
          </Button>
          <Button onClick={handleSendMessage} disabled={!newMessage.trim() && !imageFile} className="rounded-lg">
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
