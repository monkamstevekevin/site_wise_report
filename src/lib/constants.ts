import type { LucideIcon } from 'lucide-react';
import { LayoutDashboard, FileText, Users, HardHat, TestTube2, Settings } from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles?: ('ADMIN' | 'SUPERVISOR' | 'TECHNICIAN')[];
  children?: NavItem[];
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'SUPERVISOR', 'TECHNICIAN'] },
  { href: '/reports', label: 'Field Reports', icon: FileText, roles: ['ADMIN', 'SUPERVISOR', 'TECHNICIAN'] },
  { 
    href: '/admin', 
    label: 'Admin', 
    icon: Settings, 
    roles: ['ADMIN'],
    children: [
      { href: '/admin/users', label: 'User Management', icon: Users, roles: ['ADMIN'] },
      { href: '/admin/projects', label: 'Project Management', icon: HardHat, roles: ['ADMIN'] },
      { href: '/admin/materials', label: 'Material Management', icon: TestTube2, roles: ['ADMIN'] },
    ]
  },
];

export const APP_NAME = "SiteWise Reports";
