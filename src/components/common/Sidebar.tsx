
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ALL_NAV_ITEMS, APP_NAME, getNavItemsForRole } from '@/lib/constants';
import type { NavItem, UserRole } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Building } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import {
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroupLabel,
  useSidebar, // Import useSidebar to check collapsed state
} from "@/components/ui/sidebar";
import { useAuth } from '@/contexts/AuthContext';
import type { User as FirebaseUser } from 'firebase/auth';
import { Skeleton } from '@/components/ui/skeleton';


const mapFirebaseUserToAppRole = (firebaseUser: FirebaseUser | null): UserRole => {
  if (!firebaseUser) return 'TECHNICIAN';
  if (firebaseUser.email === 'janesteve237@gmail.com') return 'ADMIN';
  if (firebaseUser.email?.includes('admin@example.com')) return 'ADMIN';
  if (firebaseUser.email?.includes('supervisor@example.com')) return 'SUPERVISOR';
  return 'TECHNICIAN';
};

interface NavItemProps {
  item: NavItem;
  currentRole: UserRole;
  isCollapsed: boolean; // Pass collapsed state
  level?: number; // For indentation
}

const NavItemDisplay: React.FC<NavItemProps> = ({ item, currentRole, isCollapsed, level = 0 }) => {
  const pathname = usePathname();
  const isActive = pathname === item.href || (item.href !== '/' && item.href !== '/admin' && pathname.startsWith(item.href));

  if (item.roles && !item.roles.includes(currentRole)) {
    return null;
  }

  const hasAccessibleChildren = item.children && item.children.some(child => !child.roles || child.roles.includes(currentRole));

  return (
    <SidebarMenuItem key={item.href || item.label}>
      <Link href={item.href} passHref legacyBehavior>
        <SidebarMenuButton
          isActive={isActive}
          className={cn(
            level > 0 && !isCollapsed && "pl-7", // Indent children only if not collapsed
            level > 0 && isCollapsed && "pl-2" // Standard padding for icons if collapsed
          )}
          tooltip={isCollapsed ? item.label : undefined}
        >
          <item.icon className={cn(isActive ? "text-sidebar-accent-foreground" : "text-sidebar-foreground/70 group-hover/menu-button:text-sidebar-accent-foreground")} />
          {!isCollapsed && <span className="truncate">{item.label}</span>}
        </SidebarMenuButton>
      </Link>
      {!isCollapsed && hasAccessibleChildren && item.children && (
        <SidebarMenu className="pl-4 border-l border-sidebar-border/50 ml-3.5 my-1">
          {item.children.map((child) => (
            <NavItemDisplay key={child.href || child.label} item={child} currentRole={currentRole} isCollapsed={isCollapsed} level={level + 1} />
          ))}
        </SidebarMenu>
      )}
    </SidebarMenuItem>
  );
};


export function SiteWiseSidebar() {
  const { user, loading } = useAuth();
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('TECHNICIAN');
  const { state: sidebarState } = useSidebar(); // Get collapsed state
  const isCollapsed = sidebarState === 'collapsed';


  useEffect(() => {
    if (!loading && user) {
      const role = mapFirebaseUserToAppRole(user);
      setCurrentUserRole(role);
      setNavItems(getNavItemsForRole(role));
    } else if (!loading && !user) {
      const role = mapFirebaseUserToAppRole(null);
      setCurrentUserRole(role);
      setNavItems(getNavItemsForRole(role));
    }
  }, [user, loading]);

  if (loading) {
    return (
      <>
        <SidebarHeader className="border-b border-sidebar-border">
           <Skeleton className="h-7 w-7 mr-2 bg-primary/30" />
           <Skeleton className="h-6 w-32 bg-primary/30" />
        </SidebarHeader>
        <SidebarContent className="p-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 bg-sidebar-accent/50 rounded animate-pulse mb-2" />
          ))}
        </SidebarContent>
        <SidebarFooter className="border-t border-sidebar-border">
          <Skeleton className="h-4 w-20 bg-sidebar-foreground/30" />
          <Skeleton className="h-3 w-16 bg-sidebar-foreground/20" />
        </SidebarFooter>
      </>
    );
  }


  return (
    <>
      <SidebarHeader className="border-b border-sidebar-border h-16 flex items-center">
        <Building className={cn("h-7 w-7 mr-2 text-primary", isCollapsed && "mx-auto")} />
        {!isCollapsed && <h1 className="text-xl font-headline font-semibold text-primary">{APP_NAME}</h1>}
      </SidebarHeader>

      <SidebarContent className="p-2">
        <SidebarMenu>
          {navItems.map((item) => (
            <NavItemDisplay key={item.href || item.label} item={item} currentRole={currentUserRole} isCollapsed={isCollapsed} />
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        {!isCollapsed ? (
          <>
            <p className="text-xs text-sidebar-foreground/60">© {new Date().getFullYear()} {APP_NAME}</p>
            <p className="text-xs text-sidebar-foreground/50">Role: {currentUserRole}</p>
          </>
        ) : (
          <p className="text-xs text-center text-sidebar-foreground/60">©</p>
        )}
      </SidebarFooter>
    </>
  );
}
