'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import {
  Package,
  LayoutGrid,
  MapPin,
  Tag,
  Settings,
  LogOut,
  Home,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/items', label: 'Items', icon: Package },
  { href: '/categories', label: 'Categories', icon: Tag },
  { href: '/locations', label: 'Locations', icon: MapPin },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`border-border bg-surface hidden flex-col border-r transition-all duration-300 md:flex ${
        collapsed ? 'w-[72px]' : 'w-[260px]'
      }`}
    >
      {/* Logo / Brand */}
      <div className="border-border flex h-16 items-center gap-3 border-b px-5">
        <div className="from-primary to-accent flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-bold text-white">
          LV
        </div>
        {!collapsed && (
          <span className="from-primary to-accent truncate bg-gradient-to-r bg-clip-text text-lg font-semibold text-transparent">
            LeonoreVault
          </span>
        )}
      </div>

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
          onClick={signOut}
          className={`text-muted hover:text-danger hover:bg-danger/10 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${collapsed ? 'justify-center' : ''} `}
          title={collapsed ? 'Sign Out' : undefined}
        >
          <LogOut size={20} strokeWidth={1.8} />
          {!collapsed && <span>Sign Out</span>}
        </button>

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
