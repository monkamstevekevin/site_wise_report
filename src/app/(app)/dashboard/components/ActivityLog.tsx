
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FileText, CheckCircle, AlertTriangle, User, Settings2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { LucideIcon } from 'lucide-react';

interface ActivityItem {
  id: string;
  icon: LucideIcon;
  iconClass: string;
  title: string;
  description: string;
  time: string;
  user?: { name: string; avatar?: string };
  type: 'report' | 'validation' | 'system' | 'user_update';
}

const mockActivities: ActivityItem[] = [
  {
    id: '1',
    icon: FileText,
    iconClass: 'text-blue-500',
    title: 'New Report Submitted',
    description: 'Report #PJT001-075 for High-Strength Concrete Mix C40.',
    time: '30m ago',
    user: { name: 'Aisha K.', avatar: 'https://placehold.co/40x40.png?text=AK' },
    type: 'report',
  },
  {
    id: '2',
    icon: CheckCircle,
    iconClass: 'text-green-500',
    title: 'Report Validated',
    description: 'Report #PJT002-032 (Asphalt Binder PG 64-22) validated successfully.',
    time: '1h ago',
    user: { name: 'Marcus R.', avatar: 'https://placehold.co/40x40.png?text=MR' },
    type: 'validation',
  },
  {
    id: '3',
    icon: AlertTriangle,
    iconClass: 'text-orange-500',
    title: 'Anomaly Detected',
    description: 'AI detected potential anomaly in Report #PJT001-074 (Density out of range).',
    time: '2h ago',
    user: { name: 'System AI' },
    type: 'report',
  },
  {
    id: '4',
    icon: User,
    iconClass: 'text-purple-500',
    title: 'User Profile Updated',
    description: 'David Lee updated their contact information.',
    time: '5h ago',
    user: { name: 'David L.', avatar: 'https://placehold.co/40x40.png?text=DL' },
    type: 'user_update',
  },
  {
    id: '5',
    icon: Settings2,
    iconClass: 'text-gray-500',
    title: 'Material Definition Updated',
    description: 'Validation rules for "Washed Construction Sand" were modified by Admin.',
    time: '1 day ago',
    user: { name: 'Dr. Vance', avatar: 'https://placehold.co/40x40.png?text=EV' },
    type: 'system',
  },
];

export function ActivityLog() {
  return (
    <Card className="shadow-lg rounded-lg lg:col-span-3">
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileText className="mr-2 h-5 w-5 text-primary" />
          Weekly Activity Log
        </CardTitle>
        <CardDescription>Recent activities like report submissions, validations, and system updates.</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-80 pr-4">
          <div className="space-y-4">
            {mockActivities.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-md hover:bg-muted/50 transition-colors">
                <div className={`p-2 bg-muted rounded-full ${activity.iconClass}`}>
                  <activity.icon className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">{activity.title}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{activity.description}</p>
                  {activity.user && (
                     <div className="flex items-center mt-1 space-x-1.5">
                        {activity.user.avatar && (
                            <Avatar className="h-5 w-5">
                                <AvatarImage src={activity.user.avatar} alt={activity.user.name} data-ai-hint="user avatar" />
                                <AvatarFallback>{activity.user.name.substring(0,1)}</AvatarFallback>
                            </Avatar>
                        )}
                        <span className="text-xs text-muted-foreground">{activity.user.name}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {mockActivities.length === 0 && (
                <p className="text-muted-foreground text-center py-4">No recent activities.</p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
