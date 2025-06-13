
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ALL_NAV_ITEMS, APP_NAME, getNavItemsForRole } from '@/lib/constants';
import type { NavItem, UserRole } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight, Building } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth
import type { User as FirebaseUser } from 'firebase/auth';

// Helper to map Firebase user to app's UserRole type
// In a real app, user role would come from custom claims or Firestore
const mapFirebaseUserToAppRole = (firebaseUser: FirebaseUser | null): UserRole => {
  if (!firebaseUser) return 'TECHNICIAN'; // Default or guest role

  // This is a MOCK mapping. In a real app, get role from custom claims or database.
  // For example, if admin UIDs are known or based on email.
  if (firebaseUser.email?.includes('admin@example.com')) return 'ADMIN';
  if (firebaseUser.email?.includes('supervisor@example.com')) return 'SUPERVISOR';
  return 'TECHNICIAN';
};


const SidebarNavItem: React.FC<{ item: NavItem; isChild?: boolean; currentRole: UserRole }> = ({ item, isChild = false, currentRole }) => {
  const pathname = usePathname();
  const isActive = pathname === item.href || (item.href !== '/' && item.href !== '/admin' && pathname.startsWith(item.href));
  
  // Explicitly check if parent admin route is active if child is active
  const isAdminParentActive = item.href === '/admin' && pathname.startsWith('/admin/');

  if (item.roles && !item.roles.includes(currentRole)) {
    return null;
  }

  if (item.children && item.children.length > 0) {
    const accessibleChildren = item.children.filter(child => !child.roles || child.roles.includes(currentRole));
    if (accessibleChildren.length === 0) return null;

    // Determine if this accordion item should be open by default
    const isExpandedByDefault = accessibleChildren.some(child => pathname.startsWith(child.href)) || isAdminParentActive;


    return (
       <AccordionItem value={item.label} className="border-none">
        <AccordionTrigger 
          className={cn(
            "flex items-center w-full text-left px-3 py-2.5 rounded-md transition-colors duration-150 ease-in-out",
            "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            (isActive || isExpandedByDefault || isAdminParentActive) ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-sidebar-foreground",
            isChild ? "pl-8 text-sm" : "text-base"
          )}
        >
          <item.icon className={cn("mr-3 h-5 w-5 flex-shrink-0", (isActive || isExpandedByDefault || isAdminParentActive) ? "text-sidebar-accent-foreground" : "text-sidebar-foreground/80")} />
          <span className="flex-grow">{item.label}</span>
        </AccordionTrigger>
        <AccordionContent className="pl-4 pt-1 pb-0">
          <ul className="space-y-1">
            {accessibleChildren.map((child) => (
              <li key={child.href}>
                <SidebarNavItem item={child} isChild={true} currentRole={currentRole} />
              </li>
            ))}
          </ul>
        </AccordionContent>
      </AccordionItem>
    );
  }

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center px-3 py-2.5 rounded-md transition-colors duration-150 ease-in-out group",
        isActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        isChild ? "pl-11 text-sm py-2" : "text-base" 
      )}
    >
      {!isChild && <item.icon className={cn("mr-3 h-5 w-5 flex-shrink-0", isActive ? "text-sidebar-accent-foreground" : "text-sidebar-foreground/80 group-hover:text-sidebar-accent-foreground")} />}
      <span>{item.label}</span>
    </Link>
  );
};


export function Sidebar() {
  const { user, loading } = useAuth();
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('TECHNICIAN'); // Default
  const pathname = usePathname();


  useEffect(() => {
    if (!loading && user) {
      const role = mapFirebaseUserToAppRole(user); // Get role from user
      setCurrentUserRole(role);
      setNavItems(getNavItemsForRole(role));
    } else if (!loading && !user) {
      // Handle case where user is not logged in (e.g., show minimal nav or public nav)
      // For now, default to technician to show something if roles are not fully set up
      setNavItems(getNavItemsForRole('TECHNICIAN'));
    }
  }, [user, loading]);
  
  const defaultOpenAccordionItems = navItems
    .filter(item => item.children && item.children.length > 0 && item.children.some(child => pathname.startsWith(child.href)))
    .map(item => item.label);
  
  if (pathname.startsWith('/admin/')) {
      const adminParent = navItems.find(item => item.href === '/admin');
      if (adminParent && !defaultOpenAccordionItems.includes(adminParent.label)) {
          defaultOpenAccordionItems.push(adminParent.label);
      }
  }


  if (loading) {
    return (
      <aside className="w-64 h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col fixed left-0 top-0 shadow-lg">
        <div className="h-16 flex items-center px-4 border-b border-sidebar-border">
          <Building className="h-7 w-7 mr-2 text-primary animate-pulse" />
          <h1 className="text-xl font-headline font-semibold text-primary">{APP_NAME}</h1>
        </div>
        <div className="flex-grow p-2 space-y-2 overflow-y-auto">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-10 bg-sidebar-accent/50 rounded animate-pulse" />
          ))}
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-64 h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col fixed left-0 top-0 shadow-lg">
      <div className="h-16 flex items-center px-4 border-b border-sidebar-border">
        <Building className="h-7 w-7 mr-2 text-primary" />
        <h1 className="text-xl font-headline font-semibold text-primary">{APP_NAME}</h1>
      </div>
      <nav className="flex-grow p-2 space-y-1 overflow-y-auto">
       <Accordion type="multiple" defaultValue={defaultOpenAccordionItems} className="w-full">
          {navItems.map((item) => (
            item.children && item.children.length > 0 ? (
              <SidebarNavItem key={item.label} item={item} currentRole={currentUserRole} />
            ) : (
               <li key={item.href} className="list-none">
                <SidebarNavItem item={item} currentRole={currentUserRole} />
              </li>
            )
          ))}
        </Accordion>
      </nav>
      <div className="p-4 border-t border-sidebar-border">
        <p className="text-xs text-sidebar-foreground/60">© {new Date().getFullYear()} {APP_NAME}</p>
        <p className="text-xs text-sidebar-foreground/50">Role: {currentUserRole}</p>
      </div>
    </aside>
  );
}

