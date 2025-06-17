
'use client';

import { Bell, MessageSquare, FileText, Briefcase, Settings, UserCheck, AlertCircle, UserCog, FileCheck2, FileX2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import React, { useState, useEffect } from 'react';
import type { Notification, NotificationType, UserRole } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { getNotificationsSubscription } from '@/lib/notificationClientService';
import { markNotificationAsRead, markAllNotificationsAsRead, deleteNotification } from '@/services/notificationService'; // Import deleteNotification
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale'; // For French relative time

interface DisplayNotification extends Notification {
  displayTime: string;
  icon: LucideIcon;
  iconClass: string;
}

const getNotificationDisplayProps = (notification: Notification): { icon: LucideIcon, iconClass: string } => {
  switch (notification.type) {
    case 'report_update':
      if (notification.message.toLowerCase().includes('validé')) return { icon: FileCheck2, iconClass: 'text-green-500' };
      if (notification.message.toLowerCase().includes('rejeté')) return { icon: FileX2, iconClass: 'text-red-500' };
      return { icon: FileText, iconClass: 'text-orange-500' };
    case 'project_assignment':
      return { icon: Briefcase, iconClass: 'text-purple-500' };
    case 'new_chat_message':
      return { icon: MessageSquare, iconClass: 'text-blue-500' };
    case 'system_update':
      return { icon: Settings, iconClass: 'text-gray-500' };
    default:
      return { icon: Bell, iconClass: 'text-muted-foreground' };
  }
};

export function NotificationBell() {
  const [notifications, setNotifications] = useState<DisplayNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!user || authLoading) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const unsubscribe = getNotificationsSubscription(
      user.uid,
      (fetchedNotifications) => {
        const displayNotifications = fetchedNotifications.map(n => ({
          ...n,
          displayTime: formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: fr }),
          ...getNotificationDisplayProps(n),
        })).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        setNotifications(displayNotifications);
        setUnreadCount(displayNotifications.filter(n => !n.isRead).length);
      },
      15
    );

    return () => unsubscribe();
  }, [user, authLoading]);


  const handleNotificationClick = async (notification: DisplayNotification) => {
    if (!user) return;
    try {
      if (!notification.isRead) {
        await markNotificationAsRead(user.uid, notification.id);
      }
      if (notification.link) {
        router.push(notification.link);
      } else {
        toast({ title: 'Notification', description: notification.message });
      }
    } catch (error) {
      console.error("Error marking notification as read or navigating:", error);
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de traiter la notification." });
    }
  };

  const handleMarkAllAsReadClick = async () => {
    if (!user || unreadCount === 0) return;
    try {
      await markAllNotificationsAsRead(user.uid);
      toast({ title: "Notifications mises à jour", description: "Toutes les notifications ont été marquées comme lues." });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de marquer toutes les notifications comme lues." });
    }
  };

  const handleDeleteNotification = async (userIdToDeleteFor: string, notificationId: string) => {
    if (!user || userIdToDeleteFor !== user.uid) {
        toast({ variant: "destructive", title: "Erreur", description: "Action non autorisée." });
        return;
    }
    try {
      await deleteNotification(userIdToDeleteFor, notificationId);
      toast({ title: "Notification Supprimée", description: "La notification a été retirée de votre liste." });
      // The onSnapshot listener should automatically update the notifications list
    } catch (error) {
      console.error("Error deleting notification:", error);
      toast({ variant: "destructive", title: "Erreur de Suppression", description: (error as Error).message || "Impossible de supprimer la notification." });
    }
  };

  if (!mounted || authLoading) {
    return (
      <Button variant="ghost" size="icon" className="relative rounded-full">
        <Bell className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 md:w-96">
         <DropdownMenuLabel className="flex justify-between items-center p-2">
          <span className="font-semibold">Notifications</span>
          {unreadCount > 0 && (
            <Button variant="link" size="sm" className="p-0 h-auto text-xs text-primary hover:underline" onClick={handleMarkAllAsReadClick}>
              Tout marquer comme lu
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-[300px] overflow-y-auto group"> {/* Added group class for group-hover */}
            {notifications.length === 0 ? (
            <DropdownMenuItem disabled className="p-2 text-center text-muted-foreground">Aucune nouvelle notification</DropdownMenuItem>
            ) : (
            notifications.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className={cn(
                      "flex items-start gap-2 p-2.5 group/item", // Added group/item for finer control
                      !notification.isRead && "bg-accent/50 hover:bg-accent/60 focus:bg-accent/80"
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  {/* Icon */}
                  <div className={cn("mt-0.5 flex-shrink-0", notification.iconClass || 'text-muted-foreground')}>
                      <notification.icon className="h-5 w-5" />
                  </div>
                  {/* Message and Time */}
                  <div className="flex-1 min-w-0">
                      <p className={cn("text-sm break-words", !notification.isRead && "font-semibold")}>{notification.message}</p>
                      <p className="text-xs text-muted-foreground">{notification.displayTime}</p>
                  </div>
                  {/* Unread Dot */}
                  {!notification.isRead && (
                      <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1 self-center" title="Non lue"></div>
                  )}
                  {/* Delete Button */}
                  <Button
                      variant="ghost"
                      size="icon"
                      className="ml-1 p-0 h-5 w-5 text-muted-foreground hover:text-destructive flex-shrink-0 self-center opacity-0 group-hover/item:opacity-100 focus:opacity-100 transition-opacity duration-150"
                      onClick={(e) => {
                          e.stopPropagation();
                          if (user) { // Ensure user is not null
                            handleDeleteNotification(user.uid, notification.id);
                          }
                      }}
                      title="Supprimer cette notification"
                  >
                      <X className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuItem>
            ))
            )}
        </div>
         {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="justify-center text-sm text-primary hover:underline p-2 cursor-pointer" 
                            onClick={() => toast({title: "Voir toutes les notifications", description:"Affichage de toutes les notifications (fonctionnalité à venir). Une page dédiée aux notifications pourrait être implémentée ici."})}>
              Voir toutes les notifications
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
