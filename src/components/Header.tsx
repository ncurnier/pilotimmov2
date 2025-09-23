import React from 'react';
import { useState } from 'react';
import { PropertySwitcher } from './PropertySwitcher';
import { useSupabase } from '../hooks/useSupabase';
import { Bell, User, LogOut, Settings, HelpCircle } from 'lucide-react';

interface HeaderProps {
  user: { name: string; email: string } | null;
  onLogout: () => void;
  onPageChange?: (page: string) => void;
}

export function Header({ user, onLogout, onPageChange }: HeaderProps) {
  const { notifications, markAllNotificationsAsRead } = useSupabase();
  const unreadCount = notifications.length;
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="bg-bg-sidebar border-b border-gray-600 px-6 py-4 h-[70px] flex items-center">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <h1 className="text-title text-text-secondary font-playfair">Tableau de bord</h1>
          <div className="hidden lg:block">
            <PropertySwitcher />
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Property Switcher for mobile */}
          <div className="lg:hidden">
            <PropertySwitcher />
          </div>
          
        <div className="flex items-center space-x-4">
          <button 
            className="relative p-2 text-gray-300 hover:text-accent-gold transition-smooth"
            onClick={markAllNotificationsAsRead}
            title={`${unreadCount} notification(s) non lue(s)`}
          >
            <Bell className="h-6 w-6" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-accent-gold text-text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs font-semibold">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
          
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <div className="font-semibold text-text-secondary">{user?.name}</div>
              <div className="text-sm text-gray-400">{user?.email}</div>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-10 h-10 bg-accent-blue rounded-full flex items-center justify-center hover:bg-opacity-90 transition-smooth"
              >
                <User className="h-6 w-6 text-accent-gold" />
              </button>
              
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  <button
                    onClick={() => {
                      onPageChange?.('settings');
                      setShowUserMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                  >
                    <Settings className="h-4 w-4" />
                    <span>Paramètres</span>
                  </button>
                  <button
                    onClick={() => {
                      onPageChange?.('help');
                      setShowUserMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                  >
                    <HelpCircle className="h-4 w-4" />
                    <span>Aide</span>
                  </button>
                  <hr className="my-2" />
                  <button
                    onClick={() => {
                      onLogout();
                      setShowUserMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 flex items-center space-x-2"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Déconnexion</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        </div>
      </div>
    </header>
  );
}