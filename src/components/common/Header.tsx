'use client';

import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NotificationBell } from './NotificationBell';
import { LogOut, Settings, UserCircle } from 'lucide-react';
import React, { useState, useEffect } from 'react';


export function Header() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true); // Ensure client-side rendering for dropdown
  }, []);

  if (!mounted) {
    // Render a placeholder or null during SSR to avoid hydration mismatch for DropdownMenu
    return (
      <header className="h-16 bg-card text-card-foreground border-b border-border flex items-center justify-between px-6 shadow-sm sticky top-0 z-40">
        <div>{/* Placeholder for breadcrumbs or page title */}</div>
        <div className="flex items-center space-x-4">
          <div className="h-8 w-8 bg-muted rounded-full animate-pulse" />
          <div className="h-10 w-10 bg-muted rounded-full animate-pulse" />
        </div>
      </header>
    );
  }

  return (
    <header className="h-16 bg-card text-card-foreground border-b border-border flex items-center justify-end px-6 shadow-sm sticky top-0 z-40">
      {/* Placeholder for breadcrumbs or dynamic page title if needed */}
      {/* <h1 className="text-lg font-semibold font-headline">Dashboard</h1> */}
      <div className="flex items-center space-x-3">
        <NotificationBell />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarImage src="https://placehold.co/100x100.png" alt="User Avatar" data-ai-hint="user avatar" />
                <AvatarFallback>UR</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="font-medium">User Name</p>
              <p className="text-xs text-muted-foreground">user.email@example.com</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <UserCircle className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
