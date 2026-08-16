'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell } from 'lucide-react';

const mockUnreadCount = 5;

export default function AppHeader() {
  const pathname = usePathname();
  const isNotificationsPage = pathname === '/notifications';

  return (
    <header className="flex min-w-0 items-center">
      <Link
        href="/notifications"
        aria-label={`Notifications${mockUnreadCount > 0 ? `, ${mockUnreadCount} unread` : ''}`}
        aria-current={isNotificationsPage ? 'page' : undefined}
        className={`relative flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
          isNotificationsPage
            ? 'bg-primary/10 text-primary'
            : 'text-muted hover:bg-hover hover:text-foreground'
        }`}
        title="Notifications"
      >
        <Bell size={20} strokeWidth={isNotificationsPage ? 2.2 : 1.8} />
        {mockUnreadCount > 0 && (
          <span className="bg-danger ring-background absolute -right-0.5 -top-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none text-white ring-2">
            {mockUnreadCount > 9 ? '9+' : mockUnreadCount}
          </span>
        )}
      </Link>
    </header>
  );
}
