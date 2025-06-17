
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

// Données de simulation pour l'activité (à remplacer par des données réelles)
const mockActivities: ActivityItem[] = [
  {
    id: '1',
    icon: FileText,
    iconClass: 'text-blue-500',
    title: 'Nouveau Rapport Soumis',
    description: 'Rapport #PJT001-075 pour Béton Haute Résistance C40.',
    time: 'il y a 30m',
    user: { name: 'Aisha K.', avatar: 'https://placehold.co/40x40.png?text=AK' },
    type: 'report',
  },
  {
    id: '2',
    icon: CheckCircle,
    iconClass: 'text-green-500',
    title: 'Rapport Validé',
    description: 'Rapport #PJT002-032 (Liant Bitumineux PG 64-22) validé avec succès.',
    time: 'il y a 1h',
    user: { name: 'Marcus R.', avatar: 'https://placehold.co/40x40.png?text=MR' },
    type: 'validation',
  },
  {
    id: '3',
    icon: AlertTriangle,
    iconClass: 'text-orange-500',
    title: 'Anomalie Détectée',
    description: 'L\'IA a détecté une anomalie potentielle dans le Rapport #PJT001-074 (Densité hors plage).',
    time: 'il y a 2h',
    user: { name: 'IA Système' },
    type: 'report',
  },
  {
    id: '4',
    icon: User,
    iconClass: 'text-purple-500',
    title: 'Profil Utilisateur Mis à Jour',
    description: 'David Lee a mis à jour ses informations de contact.',
    time: 'il y a 5h',
    user: { name: 'David L.', avatar: 'https://placehold.co/40x40.png?text=DL' },
    type: 'user_update',
  },
  {
    id: '5',
    icon: Settings2,
    iconClass: 'text-gray-500',
    title: 'Définition Matériau Mise à Jour',
    description: 'Les règles de validation pour "Sable de Construction Lavé" ont été modifiées par l\'Admin.',
    time: 'il y a 1j',
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
          Journal d'Activité Hebdomadaire
        </CardTitle>
        <CardDescription>Activités récentes comme les soumissions de rapports, validations et mises à jour système.</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-80 pr-4">
          <div className="space-y-4">
            {mockActivities.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-2 sm:space-x-3 p-2 sm:p-3 rounded-md hover:bg-muted/50 transition-colors">
                <div className={`p-1.5 sm:p-2 bg-muted rounded-full ${activity.iconClass}`}>
                  <activity.icon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
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
                <p className="text-muted-foreground text-center py-4">Aucune activité récente.</p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
