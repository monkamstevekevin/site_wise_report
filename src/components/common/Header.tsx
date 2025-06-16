
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
import { LogOut, Settings, UserCircle, LogInIcon } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { SidebarTrigger } from '@/components/ui/sidebar'; // Importation du SidebarTrigger

export function Header() {
  const { user, loading, logout } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    await logout();
    // Router push is handled by AuthContext or AppLayout
  };

  if (!mounted || loading) {
    return (
      <header className="h-16 bg-card text-card-foreground border-b border-border flex items-center justify-between px-4 sm:px-6 shadow-sm sticky top-0 z-30">
        <Skeleton className="h-7 w-7 md:hidden" /> {/* SidebarTrigger placeholder for mobile */}
        <div className="flex items-center space-x-4 ml-auto"> {/* ml-auto to push to right */}
          <Skeleton className="h-8 w-8 rounded-full" /> {/* NotificationBell placeholder */}
          <Skeleton className="h-10 w-10 rounded-full" /> {/* Avatar placeholder */}
        </div>
      </header>
    );
  }

  return (
    <header className="h-16 bg-card text-card-foreground border-b border-border flex items-center justify-between px-4 sm:px-6 shadow-sm sticky top-0 z-30">
      {/* SidebarTrigger est visible sur mobile grâce à md:hidden dans sa définition */}
      <SidebarTrigger className="mr-2" /> 
      
      {/* Ce div prendra l'espace restant pour pousser les éléments suivants à droite */}
      <div className="flex-grow" /> 

      <div className="flex items-center space-x-3">
        <NotificationBell />
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarImage 
                    src={user.photoURL || `https://placehold.co/100x100.png?text=${user.email?.[0]?.toUpperCase() || 'U'}`} 
                    alt={user.displayName || user.email || "User Avatar"} 
                    data-ai-hint="user avatar" 
                  />
                  <AvatarFallback>{user.email?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <p className="font-medium">{user.displayName || 'User'}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile">
                  <UserCircle className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem disabled> {/* Replace with actual link or functionality */}
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button asChild variant="outline" className="rounded-lg">
            <Link href="/auth/login">
              <LogInIcon className="mr-2 h-4 w-4" />
              Login
            </Link>
          </Button>
        )}
      </div>
    </header>
  );
}
