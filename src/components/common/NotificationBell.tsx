
'use client';

import { Bell, MessageSquare, FileText, Briefcase, Settings, UserCheck, AlertCircle, UserCog, FileCheck2, FileX2 } from 'lucide-react';
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
import type { Notification, UserRole } from '@/lib/types'; // Assuming UserRole is in types
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext'; // For a more realistic role determination

// Helper to map Firebase user to app's UserRole type
const mapFirebaseUserToAppRole = (firebaseUser: any): UserRole => {
  if (!firebaseUser || !firebaseUser.email) return 'TECHNICIAN';
  if (firebaseUser.email === 'janesteve237@gmail.com') return 'ADMIN';
  if (firebaseUser.email?.includes('admin@example.com')) return 'ADMIN';
  if (firebaseUser.email?.includes('supervisor@example.com')) return 'SUPERVISOR';
  return 'TECHNICIAN';
};


// --- Mock Notifications ---
const allMockNotifications: Notification[] = [
  // For Technicians
  {
    id: 'notif_tech_1',
    type: 'report_update',
    message: 'Votre rapport #RPT001 pour PJT001 a été VALIDÉ.',
    targetId: 'RPT001',
    isRead: false,
    displayTime: '15m ago',
    createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
    icon: FileCheck2,
    iconClass: 'text-green-500',
    roles: ['TECHNICIAN'],
  },
  {
    id: 'notif_tech_2',
    type: 'report_update',
    message: 'Rapport #RPT003 pour PJT001 REJETÉ. Raison: Données incomplètes.',
    targetId: 'RPT003',
    isRead: false,
    displayTime: '1h ago',
    createdAt: new Date(Date.now() - 60 * 60000).toISOString(),
    icon: FileX2,
    iconClass: 'text-red-500',
    roles: ['TECHNICIAN'],
  },
  {
    id: 'notif_tech_3',
    type: 'project_assignment',
    message: 'Vous avez été assigné au projet: "Expansion Autoroute Verte" (PJT002).',
    targetId: 'PJT002',
    isRead: true,
    displayTime: '4h ago',
    createdAt: new Date(Date.now() - 4 * 60 * 60000).toISOString(),
    icon: Briefcase,
    iconClass: 'text-purple-500',
    roles: ['TECHNICIAN'],
  },
  {
    id: 'notif_tech_4',
    type: 'new_chat_message',
    message: 'Message du superviseur dans "Tour Centre-Ville" (PJT001)',
    targetId: 'PJT001',
    isRead: false,
    displayTime: 'Hier',
    createdAt: new Date(Date.now() - 24 * 60 * 60000).toISOString(),
    icon: MessageSquare,
    iconClass: 'text-blue-500',
    roles: ['TECHNICIAN', 'SUPERVISOR'], // Supervisors might also get chat notifs
  },
  // For Admins/Supervisors
  {
    id: 'notif_admin_1',
    type: 'report_update',
    message: 'Rapport #RPT002 (Tech: David L.) soumis pour validation.',
    targetId: 'RPT002',
    isRead: false,
    displayTime: '30m ago',
    createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
    icon: FileText,
    iconClass: 'text-orange-500',
    roles: ['ADMIN', 'SUPERVISOR'],
  },
   {
    id: 'notif_admin_2',
    type: 'system_update',
    message: 'Utilisateur Aisha K. a mis à jour son profil.',
    targetId: 'USR003',
    isRead: true,
    displayTime: '2h ago',
    createdAt: new Date(Date.now() - 2 * 60 * 60000).toISOString(),
    icon: UserCog,
    iconClass: 'text-gray-500',
    roles: ['ADMIN'],
  },
  {
    id: 'notif_admin_3',
    type: 'system_update',
    message: 'Nouvelle définition de matériau "Béton haute performance C50" ajoutée.',
    targetId: 'MAT007',
    isRead: true,
    displayTime: '3 jours',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60000).toISOString(),
    icon: Settings,
    iconClass: 'text-indigo-500',
    roles: ['ADMIN'],
  }
];
// --- End Mock Notifications ---


export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth(); // Get current user

  useEffect(() => {
    setMounted(true);
    // In a real app, you would fetch notifications for the current user here.
    // For now, we'll filter the mock data based on a determined role.
    if (!authLoading) {
      const currentRole = mapFirebaseUserToAppRole(user);
      const relevantNotifications = allMockNotifications.filter(n => 
        n.roles ? n.roles.includes(currentRole) : true // Show if no roles specified or if role matches
      );
      setNotifications(relevantNotifications);
      setUnreadCount(relevantNotifications.filter(n => !n.isRead).length);
    }
  }, [user, authLoading]);


  const handleNotificationClick = (notification: Notification) => {
    setNotifications(prev =>
      prev.map(n => (n.id === notification.id ? { ...n, isRead: true } : n))
    );
    setUnreadCount(prev => Math.max(0, prev - (notification.isRead ? 0 : 1)));


    // Basic navigation, can be expanded
    if (notification.link) {
      router.push(notification.link);
    } else if (notification.type === 'new_chat_message' && notification.targetId) {
      router.push(`/project/${notification.targetId}/chat`);
    } else if (notification.type === 'report_update' && notification.targetId) {
      router.push(`/reports/view/${notification.targetId}`);
    } else if (notification.type === 'project_assignment' && notification.targetId) {
      // For a technician, this might link to /my-projects or /project/{targetId}
      // For an admin, this might be less relevant or link to /admin/projects/{targetId}
      router.push(`/my-projects`); // Generic link for now
      toast({ title: 'Assignation de Projet', description: notification.message });
    } else {
      toast({ title: 'Notification', description: notification.message });
    }
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
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
