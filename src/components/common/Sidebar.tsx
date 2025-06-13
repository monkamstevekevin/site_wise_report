'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS, APP_NAME } from '@/lib/constants';
import type { NavItem } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight, Building } from 'lucide-react';
import React, { useState } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"


// Mock user role, replace with actual auth context later
const currentUserRole = 'ADMIN' as 'ADMIN' | 'SUPERVISOR' | 'TECHNICIAN';


const SidebarNavItem: React.FC<{ item: NavItem; isChild?: boolean }> = ({ item, isChild = false }) => {
  const pathname = usePathname();
  const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
  const [isExpanded, setIsExpanded] = useState(isActive);

  if (item.roles && !item.roles.includes(currentUserRole)) {
    return null;
  }

  if (item.children && item.children.length > 0) {
    // Filter children based on role
    const accessibleChildren = item.children.filter(child => !child.roles || child.roles.includes(currentUserRole));
    if (accessibleChildren.length === 0) return null;

    return (
       <AccordionItem value={item.label} className="border-none">
        <AccordionTrigger className={cn(
          "flex items-center w-full text-left px-3 py-2.5 rounded-md transition-colors duration-150 ease-in-out",
          "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          isActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-sidebar-foreground",
          isChild ? "pl-8 text-sm" : "text-base"
        )}>
          <item.icon className={cn("mr-3 h-5 w-5 flex-shrink-0", isActive ? "text-sidebar-accent-foreground" : "text-sidebar-foreground/80")} />
          <span className="flex-grow">{item.label}</span>
        </AccordionTrigger>
        <AccordionContent className="pl-4 pt-1 pb-0">
          <ul className="space-y-1">
            {accessibleChildren.map((child) => (
              <li key={child.href}>
                <SidebarNavItem item={child} isChild={true} />
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
  return (
    <aside className="w-64 h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col fixed left-0 top-0 shadow-lg">
      <div className="h-16 flex items-center px-4 border-b border-sidebar-border">
        <Building className="h-7 w-7 mr-2 text-primary" />
        <h1 className="text-xl font-headline font-semibold text-primary">{APP_NAME}</h1>
      </div>
      <nav className="flex-grow p-2 space-y-1 overflow-y-auto">
       <Accordion type="multiple" defaultValue={NAV_ITEMS.filter(item => item.children && item.children.length > 0).map(item => item.label)} className="w-full">
          {NAV_ITEMS.map((item) => (
            item.children && item.children.length > 0 ? (
              <SidebarNavItem key={item.label} item={item} />
            ) : (
               <li key={item.href} className="list-none">
                <SidebarNavItem item={item} />
              </li>
            )
          ))}
        </Accordion>
      </nav>
      <div className="p-4 border-t border-sidebar-border">
        <p className="text-xs text-sidebar-foreground/60">© {new Date().getFullYear()} {APP_NAME}</p>
      </div>
    </aside>
  );
}
