
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
  // SidebarGroupLabel, // Not currently used in this simplified version
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

interface NavItemDisplayProps {
  item: NavItem;
  currentRole: UserRole;
  isCollapsed: boolean;
  level?: number;
}

const NavItemDisplayRecursive: React.FC<NavItemDisplayProps> = ({ item, currentRole, isCollapsed, level = 0 }) => {
  const pathname = usePathname();
  const isActive = pathname === item.href || (item.href !== '/' && item.href !== '/admin' && pathname.startsWith(item.href));

  if (item.roles && !item.roles.includes(currentRole)) {
    return null;
  }

  const hasAccessibleChildren = item.children && item.children.some(child => !child.roles || child.roles.includes(currentRole));

  return (
    <SidebarMenuItem key={item.href || item.label} className={cn(level > 0 && 'ml-0')}>
      <SidebarMenuButton
        asChild // Allow Link to control the rendering
        isActive={isActive}
        className={cn(
          level > 0 && !isCollapsed && "pl-7", // Indent sub-items text
          level > 0 && isCollapsed && "pl-2"    // Standard padding for sub-items icons when collapsed
        )}
        tooltip={isCollapsed ? item.label : undefined}
        size={level > 0 ? "sm" : "default"} // Slightly smaller sub-items
      >
        <Link href={item.href}> {/* No legacyBehavior or passHref needed here */}
          <item.icon className={cn(
            isActive ? "text-sidebar-accent-foreground" : "text-sidebar-foreground/70 group-hover/menu-button:text-sidebar-accent-foreground",
            level > 0 ? "h-3.5 w-3.5" : "h-4 w-4" // Slightly smaller icon for sub-items
          )} />
          {!isCollapsed && <span className="truncate">{item.label}</span>}
        </Link>
      </SidebarMenuButton>
      {!isCollapsed && hasAccessibleChildren && item.children && (
        <SidebarMenu className={cn("pl-4 border-l border-sidebar-border/50 ml-3.5 my-1", level > 0 && "ml-3 pl-2")}> {/* Adjusted indentation for children list */}
          {item.children.map((child) => (
            <NavItemDisplayRecursive key={child.href || child.label} item={child} currentRole={currentRole} isCollapsed={isCollapsed} level={level + 1} />
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
  const { state: sidebarState } = useSidebar();
  const isCollapsed = sidebarState === 'collapsed';

  useEffect(() => {
    if (!loading && user) {
      const role = user.role as UserRole;
      setCurrentUserRole(role);
      setNavItems(getNavItemsForRole(role));
    } else if (!loading && !user) {
      setCurrentUserRole('TECHNICIAN');
      setNavItems(getNavItemsForRole('TECHNICIAN'));
    }
  }, [user, loading]);

  if (loading) {
    return (
      <>
        <SidebarHeader className="border-b border-sidebar-border h-16 flex items-center">
           <Skeleton className={cn("h-7 w-7 mr-2 bg-primary/30", isCollapsed && "mx-auto")} />
           {!isCollapsed && <Skeleton className="h-6 w-32 bg-primary/30" />}
        </SidebarHeader>
        <SidebarContent className="p-2">
          {[...Array(4)].map((_, i) => (
             <div key={i} className={cn("h-8 rounded animate-pulse mb-2 flex items-center gap-2 px-2", isCollapsed && "justify-center")}>
                <Skeleton className="h-5 w-5 bg-sidebar-accent/50 rounded-sm" />
                {!isCollapsed && <Skeleton className="h-4 flex-1 bg-sidebar-accent/50 rounded-sm" />}
            </div>
          ))}
        </SidebarContent>
        <SidebarFooter className="border-t border-sidebar-border p-3">
          {!isCollapsed ? (
            <>
              <Skeleton className="h-4 w-20 bg-sidebar-foreground/30 mb-1" />
              <Skeleton className="h-3 w-16 bg-sidebar-foreground/20" />
            </>
          ): (
            <Skeleton className="h-4 w-6 mx-auto bg-sidebar-foreground/30" />
          )}
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
            <NavItemDisplayRecursive key={item.href || item.label} item={item} currentRole={currentUserRole} isCollapsed={isCollapsed} />
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        {!isCollapsed ? (
          <>
            <p className="text-xs text-sidebar-foreground/60">© {new Date().getFullYear()} {APP_NAME}</p>
            <p className="text-xs text-sidebar-foreground/50">Rôle: {currentUserRole}</p>
          </>
        ) : (
          <p className="text-[10px] text-center text-sidebar-foreground/60">©</p>
        )}
      </SidebarFooter>
    </>
  );
}
