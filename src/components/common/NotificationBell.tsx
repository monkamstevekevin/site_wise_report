
'use client';

import { Bell, MessageSquare, FileText, Briefcase, Settings } from 'lucide-react';
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
import type { Notification } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Mock notifications
const initialNotifications: Notification[] = [
  {
    id: 'notif1',
    type: 'new_chat_message',
    message: 'Nouveau message de Marcus dans "Highway 7 Expansion"',
    targetId: 'PJT002', // Example Project ID
    isRead: false,
    displayTime: '5m ago',
    createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
    icon: MessageSquare,
    iconClass: 'text-blue-500',
  },
  {
    id: 'notif2',
    type: 'report_update',
    message: 'Rapport #RPT001 validé par le superviseur.',
    targetId: 'RPT001',
    isRead: false,
    displayTime: '1h ago',
    createdAt: new Date(Date.now() - 60 * 60000).toISOString(),
    icon: FileText,
    iconClass: 'text-green-500',
  },
  {
    id: 'notif3',
    type: 'project_assignment',
    message: 'Vous avez été assigné au projet "Coastal Bridge Repair".',
    targetId: 'PJT003',
    isRead: true,
    displayTime: '3h ago',
    createdAt: new Date(Date.now() - 3 * 60 * 60000).toISOString(),
    icon: Briefcase,
    iconClass: 'text-purple-500',
  },
  {
    id: 'notif4',
    type: 'system_update',
    message: 'Maintenance du système prévue ce soir à 23h00.',
    isRead: true,
    displayTime: '1d ago',
    createdAt: new Date(Date.now() - 24 * 60 * 60000).toISOString(),
    icon: Settings,
    iconClass: 'text-gray-500',
  },
   {
    id: 'notif5',
    type: 'new_chat_message',
    message: 'Aisha a répondu dans "Downtown Tower Renovation"',
    targetId: 'PJT001',
    isRead: false,
    displayTime: '10m ago',
    createdAt: new Date(Date.now() - 10 * 60000).toISOString(),
    icon: MessageSquare,
    iconClass: 'text-blue-500',
  },
];

export function NotificationBell() {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(0);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true); // Ensure client-side rendering for dropdown
    setUnreadCount(notifications.filter(n => !n.read).length);
  }, [notifications]);

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    setNotifications(prev =>
      prev.map(n => (n.id === notification.id ? { ...n, isRead: true } : n))
    );

    // Navigate or perform action
    if (notification.link) {
      router.push(notification.link);
    } else if (notification.type === 'new_chat_message' && notification.targetId) {
      router.push(`/project/${notification.targetId}/chat`);
    } else if (notification.type === 'report_update' && notification.targetId) {
      // In a real app, navigate to the report details page
      // router.push(`/reports/${notification.targetId}`);
      toast({
        title: 'Notification: Rapport',
        description: `Action pour le rapport ${notification.targetId}. (Navigation à implémenter)`,
      });
    } else if (notification.type === 'project_assignment' && notification.targetId) {
      // In a real app, navigate to the project details page
      // router.push(`/admin/projects/${notification.targetId}/details`); // Or similar
      router.push(`/admin/projects`); // Go to projects list for now
       toast({
        title: 'Notification: Projet',
        description: `Action pour le projet ${notification.targetId}. (Navigation à implémenter)`,
      });
    } else {
      // Generic notification, maybe show a toast or nothing
      toast({ title: 'Notification', description: notification.message });
    }
     // DropdownMenu typically closes on item click, if not, manage state to close it
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  if (!mounted) {
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
      <DropdownMenuContent align="end" className="w-80 md:w-96 max-h-[400px] overflow-y-auto">
        <DropdownMenuLabel className="flex justify-between items-center p-2">
          <span className="font-semibold">Notifications</span>
          {unreadCount > 0 && (
            <Button variant="link" size="sm" className="p-0 h-auto text-xs text-primary hover:underline" onClick={handleMarkAllAsRead}>
              Tout marquer comme lu
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <DropdownMenuItem disabled className="p-2 text-center text-muted-foreground">Aucune nouvelle notification</DropdownMenuItem>
        ) : (
          notifications.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className={cn(
                "flex items-start gap-3 p-2.5 cursor-pointer focus:bg-accent/80",
                !notification.isRead && "bg-accent/50 hover:bg-accent/60"
              )}
              onClick={() => handleNotificationClick(notification)}
              // Prevent dropdown from closing if an interactive element inside is clicked (not needed here as item is the trigger)
            >
              {notification.icon && (
                <div className={cn("mt-0.5", notification.iconClass || 'text-muted-foreground')}>
                  <notification.icon className="h-5 w-5" />
                </div>
              )}
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
         {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="justify-center text-sm text-primary hover:underline p-2 cursor-pointer" onClick={() => toast({title: "Voir toutes les notifications", description:"Fonctionnalité à venir"})}>
              Voir toutes les notifications
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
