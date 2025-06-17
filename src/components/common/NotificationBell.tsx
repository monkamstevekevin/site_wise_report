
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
import { markNotificationAsRead, markAllNotificationsAsRead } from '@/services/notificationService';
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
      // Note: Messages are generated in French in notificationService.ts now.
      // This logic for icons can remain.
      if (notification.message.toLowerCase().includes('validé')) return { icon: FileCheck2, iconClass: 'text-green-500' };
      if (notification.message.toLowerCase().includes('rejeté')) return { icon: FileX2, iconClass: 'text-red-500' };
      return { icon: FileText, iconClass: 'text-orange-500' }; // Default for other report updates
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
      15 // Fetch last 15 notifications
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
        <div className="max-h-[300px] overflow-y-auto">
            {notifications.length === 0 ? (
            <DropdownMenuItem disabled className="p-2 text-center text-muted-foreground">Aucune nouvelle notification</DropdownMenuItem>
            ) : (
            notifications.map((notification) => (
                <DropdownMenuItem
                key={notification.id}
                className={cn(
                    "flex items-start gap-3 p-2.5 cursor-pointer focus:bg-accent/80",
                    !notification.isRead && "bg-accent/50 hover:bg-accent/60"
                )}
                onClick={() => handleNotificationClick(notification)}
                >
                <div className={cn("mt-0.5", notification.iconClass || 'text-muted-foreground')}>
                    <notification.icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                    <p className={cn("text-sm", !notification.isRead && "font-semibold")}>{notification.message}</p>
                    <p className="text-xs text-muted-foreground">{notification.displayTime}</p>
                </div>
                {!notification.isRead && (
                    <div className="w-2 h-2 rounded-full bg-primary mt-1 self-center" title="Non lue"></div>
                )}
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
