
import type { LucideIcon } from 'lucide-react';
import { LayoutDashboard, FileText, Users, HardHat, TestTube2, Settings, UserCircle } from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles?: ('ADMIN' | 'SUPERVISOR' | 'TECHNICIAN')[];
  children?: NavItem[];
  isProfileLink?: boolean; // To identify the profile link for different handling if needed
}

export const ALL_NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'SUPERVISOR', 'TECHNICIAN'] },
  { href: '/reports', label: 'Field Reports', icon: FileText, roles: ['ADMIN', 'SUPERVISOR', 'TECHNICIAN'] },
  { href: '/reports/create', label: 'Create Report', icon: FileText, roles: ['ADMIN', 'SUPERVISOR', 'TECHNICIAN'] },
  {
    href: '/admin',
    label: 'Admin Panel',
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

