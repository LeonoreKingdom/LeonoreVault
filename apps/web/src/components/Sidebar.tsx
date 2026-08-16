'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import ThemeToggle from './ThemeToggle';
import {
  Package,
  MapPin,
  Tag,
  Settings,
  LogOut,
  Home,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/items', label: 'Items', icon: Package },
  { href: '/categories', label: 'Categories', icon: Tag },
  { href: '/locations', label: 'Locations', icon: MapPin },
  { href: '/settings', label: 'Settings', icon: Settings },
];

const mockHouseholds = [
  { id: 'casa-leonore', name: 'Casa Leonore', detail: 'Personal home' },
  { id: 'studio-ops', name: 'Studio Ops', detail: 'Shared workspace' },
  { id: 'weekend-cabin', name: 'Weekend cabin', detail: 'Seasonal home' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const [householdOpen, setHouseholdOpen] = useState(false);
  const [activeHousehold, setActiveHousehold] = useState(mockHouseholds[0]);

  return (
    <aside
      className={`border-border bg-surface relative hidden flex-col border-r transition-all duration-300 md:flex ${
        collapsed ? 'w-[72px]' : 'w-[260px]'
      }`}
    >
      {/* Logo / Brand */}
      <div className="border-border flex items-center gap-3 border-b px-4 py-3">
        <div
          title={collapsed ? activeHousehold.name : undefined}
          className="from-primary to-accent flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-bold text-white"
        >
          LV
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <span className="from-primary to-accent block truncate bg-gradient-to-r bg-clip-text text-lg font-semibold text-transparent">
              LeonoreVault
            </span>
            <button
              type="button"
              aria-expanded={householdOpen}
              aria-haspopup="listbox"
              onClick={() => setHouseholdOpen((open) => !open)}
              className="text-muted hover:text-foreground mt-1 flex w-full items-center gap-1 text-left text-xs font-medium transition-colors"
            >
              <span className="truncate">{activeHousehold.name}</span>
              <ChevronDown size={14} className={householdOpen ? 'rotate-180' : ''} />
            </button>
          </div>
        )}
      </div>

      {!collapsed && householdOpen && (
        <div
          className="border-border bg-surface absolute left-3 right-3 top-[78px] z-20 rounded-xl border p-1.5 shadow-xl"
          role="listbox"
          aria-label="Households"
        >
          {mockHouseholds.map((household) => {
            const isActive = household.id === activeHousehold.id;
            return (
              <button
                key={household.id}
                type="button"
                role="option"
                aria-selected={isActive}
                onClick={() => {
                  setActiveHousehold(household);
                  setHouseholdOpen(false);
                }}
                className={`hover:bg-hover flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left transition-colors ${
                  isActive ? 'bg-primary/10' : ''
                }`}
              >
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    isActive ? 'bg-primary' : 'bg-muted-light'
                  }`}
                />
                <span className="min-w-0">
                  <span className="text-foreground block truncate text-sm font-semibold">
                    {household.name}
                  </span>
                  <span className="text-muted block truncate text-xs">{household.detail}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Nav Links */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-primary/10 text-primary shadow-sm'
                  : 'text-muted hover:text-foreground hover:bg-hover'
              } ${collapsed ? 'justify-center' : ''} `}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User Profile + Collapse Toggle */}
      <div className="border-border space-y-2 border-t p-3">
        {/* User */}
        {user && !collapsed && (
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="from-primary/60 to-accent/60 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white">
              {user.displayName?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user.displayName || 'User'}</p>
              <p className="text-muted truncate text-xs">{user.email}</p>
            </div>
          </div>
        )}

        {/* Sign Out */}
        <button
          type="button"
          onClick={signOut}
          className={`text-muted hover:text-danger hover:bg-danger/10 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${collapsed ? 'justify-center' : ''} `}
          title={collapsed ? 'Sign Out' : undefined}
        >
          <LogOut size={20} strokeWidth={1.8} />
          {!collapsed && <span>Sign Out</span>}
        </button>

        {/* Theme Toggle */}
        <ThemeToggle collapsed={collapsed} />

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-muted hover:text-foreground hover:bg-hover flex w-full items-center justify-center rounded-lg py-1.5 transition-all duration-200"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
    </aside>
  );
}
