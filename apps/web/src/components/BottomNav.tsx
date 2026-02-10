'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Package, Tag, MapPin, Settings } from 'lucide-react';

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/items', label: 'Items', icon: Package },
  { href: '/categories', label: 'Tags', icon: Tag },
  { href: '/locations', label: 'Places', icon: MapPin },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="border-border bg-surface/80 safe-area-bottom fixed bottom-0 left-0 right-0 z-50 border-t backdrop-blur-xl md:hidden">
      <div className="flex items-center justify-around px-2 py-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-2 transition-all duration-200 ${
                isActive ? 'text-primary' : 'text-muted hover:text-foreground'
              } `}
            >
              <div
                className={`relative ${isActive ? 'scale-110' : ''} transition-transform duration-200`}
              >
                <Icon size={22} strokeWidth={isActive ? 2.2 : 1.6} />
                {isActive && (
                  <div className="bg-primary absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full" />
                )}
              </div>
              <span className={`text-[10px] font-medium ${isActive ? 'font-semibold' : ''}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
