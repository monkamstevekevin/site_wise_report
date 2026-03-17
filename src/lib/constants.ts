
import type { LucideIcon } from 'lucide-react';
import { LayoutDashboard, FileText, Users, HardHat, TestTube2, Settings, UserCircle, Briefcase, CalendarDays, BarChart3, Settings2, FlaskConical } from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles?: ('ADMIN' | 'SUPERVISOR' | 'TECHNICIAN')[];
  children?: NavItem[];
  isProfileLink?: boolean; // To identify the profile link for different handling if needed
}

export const ALL_NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Tableau de Bord', icon: LayoutDashboard, roles: ['ADMIN', 'SUPERVISOR', 'TECHNICIAN'] },
  { href: '/reports', label: 'Rapports de Terrain', icon: FileText, roles: ['ADMIN', 'SUPERVISOR', 'TECHNICIAN'] },
  { href: '/reports/create', label: 'Créer un Rapport', icon: FileText, roles: ['ADMIN', 'SUPERVISOR', 'TECHNICIAN'] },
  { href: '/my-projects', label: 'Mes Projets', icon: Briefcase, roles: ['TECHNICIAN', 'SUPERVISOR'] },
  { href: '/analytics', label: 'Analyses & Performance', icon: BarChart3, roles: ['ADMIN', 'SUPERVISOR'] },
  {
    href: '/admin',
    label: 'Panneau Admin',
    icon: Settings,
    roles: ['ADMIN'],
    children: [
      { href: '/admin/users', label: 'Gestion Utilisateurs', icon: Users, roles: ['ADMIN'] },
      { href: '/admin/projects', label: 'Gestion Projets', icon: HardHat, roles: ['ADMIN'] },
      { href: '/admin/materials', label: 'Gestion Matériaux', icon: TestTube2, roles: ['ADMIN'] },
      { href: '/admin/test-types', label: 'Types de Tests', icon: FlaskConical, roles: ['ADMIN'] },
    ]
  },
  { href: '/settings', label: 'Paramètres', icon: Settings2, roles: ['ADMIN'] },
  { href: '/settings/profile', label: 'Mon Profil', icon: UserCircle, roles: ['ADMIN', 'SUPERVISOR', 'TECHNICIAN'] },
];

export const APP_NAME = "SiteWise Reports";

// Helper function to get navigation items based on user role
export const getNavItemsForRole = (role: UserRole): NavItem[] => {
  const filterItems = (items: NavItem[]): NavItem[] => {
    return items.reduce((acc, item) => {
      if (item.roles && !item.roles.includes(role)) {
        return acc;
      }
      if (item.children) {
        const filteredChildren = filterItems(item.children);
        if (filteredChildren.length > 0) {
          acc.push({ ...item, children: filteredChildren });
        } else if (!item.children.some(child => child.roles && child.roles.includes(role)) && item.roles && item.roles.includes(role) && item.href !== '/admin') { // Keep parent if it's accessible and not Admin group itself without children
          acc.push({ ...item, children: undefined });
        }
      } else {
        acc.push(item);
      }
      return acc;
    }, [] as NavItem[]);
  };
  return filterItems(ALL_NAV_ITEMS);
};

export type UserRole = 'ADMIN' | 'SUPERVISOR' | 'TECHNICIAN';

// Mock technician identity for data population
export const MOCK_TECHNICIAN_EMAIL = 'tech@example.com';
export const MOCK_TECHNICIAN_REPORTS_ID = 'tech001';

// ─── Helper partagé role/id ───────────────────────────────────────────────────

export interface MappedUserRoleAndId {
  role: UserRole;
  effectiveTechnicianId: string | null;
}

export function mapUserToRoleAndId(
  appUser: { id: string; role: string } | null
): MappedUserRoleAndId {
  if (!appUser) return { role: 'TECHNICIAN', effectiveTechnicianId: null };
  const role = appUser.role as UserRole;
  return { role, effectiveTechnicianId: role === 'TECHNICIAN' ? appUser.id : null };
}
