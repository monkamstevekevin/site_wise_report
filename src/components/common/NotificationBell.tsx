
'use client';

import { Bell, MessageSquare, FileText, Briefcase, Settings, UserCheck, AlertCircle } from 'lucide-react';
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

// Mock notifications - tailored for a technician
const technicianNotifications: Notification[] = [
  {
    id: 'notif_tech_1',
    type: 'report_update',
    message: 'Your report #RPT001 for PJT001 has been VALIDATED.',
    targetId: 'RPT001', // Report ID
    isRead: false,
    displayTime: '15m ago',
    createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
    icon: UserCheck,
    iconClass: 'text-green-500',
  },
  {
    id: 'notif_tech_2',
    type: 'report_update',
    message: 'Report #RPT003 for PJT001 was REJECTED. Reason: Incomplete data.',
    targetId: 'RPT003', // Report ID
    isRead: false,
    displayTime: '1h ago',
    createdAt: new Date(Date.now() - 60 * 60000).toISOString(),
    icon: AlertCircle,
    iconClass: 'text-red-500',
  },
  {
    id: 'notif_tech_3',
    type: 'project_assignment',
    message: 'You have been assigned to a new project: "Greenfield Highway Expansion" (PJT002).',
    targetId: 'PJT002', // Project ID
    isRead: true,
    displayTime: '4h ago',
    createdAt: new Date(Date.now() - 4 * 60 * 60000).toISOString(),
    icon: Briefcase,
    iconClass: 'text-purple-500',
  },
  {
    id: 'notif_tech_4',
    type: 'new_chat_message',
    message: 'Supervisor message in "Downtown Tower Renovation" (PJT001)',
    targetId: 'PJT001', // Project ID for chat
    isRead: false,
    displayTime: 'Yesterday',
    createdAt: new Date(Date.now() - 24 * 60 * 60000).toISOString(),
    icon: MessageSquare,
    iconClass: 'text-blue-500',
  },
];

// Admin/Supervisor notifications (can be expanded)
const adminSupervisorNotifications: Notification[] = [
    {
    id: 'notif_admin_1',
    type: 'report_update', // or a new type like 'report_submitted_for_validation'
    message: 'Report #RPT002 (Technician: David L.) submitted for validation.',
    targetId: 'RPT002',
    isRead: false,
    displayTime: '30m ago',
    createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
    icon: FileText,
    iconClass: 'text-orange-500',
  },
   {
    id: 'notif_admin_2',
    type: 'system_update',
    message: 'User Aisha K. updated their profile.',
    targetId: 'USR003', // User ID
    isRead: true,
    displayTime: '2h ago',
    createdAt: new Date(Date.now() - 2 * 60 * 60000).toISOString(),
    icon: Settings,
    iconClass: 'text-gray-500',
  }
];

// Combine notifications based on a mock role for now
// In a real app, this would be based on the logged-in user's role from AuthContext
const MOCK_CURRENT_USER_ROLE = 'TECHNICIAN'; // Change to 'ADMIN' or 'SUPERVISOR' to test

const initialNotifications = MOCK_CURRENT_USER_ROLE === 'TECHNICIAN'
  ? technicianNotifications
  : [...adminSupervisorNotifications, ...technicianNotifications.slice(0,2)]; // Admin sees some tech notifs too


export function NotificationBell() {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(0);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
    setUnreadCount(notifications.filter(n => !n.isRead).length);
  }, [notifications]);

  const handleNotificationClick = (notification: Notification) => {
    setNotifications(prev =>
      prev.map(n => (n.id === notification.id ? { ...n, isRead: true } : n))
    );

    if (notification.link) {
      router.push(notification.link);
    } else if (notification.type === 'new_chat_message' && notification.targetId) {
      router.push(`/project/${notification.targetId}/chat`);
    } else if (notification.type === 'report_update' && notification.targetId) {
      // For a technician, this could link to their /reports page, filtered or scrolled to that report.
      // For an admin/supervisor, this could link to a specific report view page.
      router.push(`/reports?highlight=${notification.targetId}`); // Simple nav for now
      toast({
        title: 'Report Notification',
        description: `Navigating to details for report ${notification.targetId}. (Full navigation to specific report TBD)`,
      });
    } else if (notification.type === 'project_assignment' && notification.targetId) {
      router.push(`/admin/projects`); // Or a specific project page if one exists: /projects/[id]
       toast({
        title: 'Project Assignment',
        description: `You were assigned to project ${notification.targetId}. View project details. (Full navigation TBD)`,
      });
    } else {
      toast({ title: 'Notification', description: notification.message });
    }
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
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

