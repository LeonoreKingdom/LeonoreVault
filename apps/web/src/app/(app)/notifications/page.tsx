'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Bell, Check, CheckCheck, Clock3, RotateCcw, SlidersHorizontal } from 'lucide-react';
import NotificationListItem, {
  type NotificationListItemData,
} from '@/components/notifications/NotificationListItem';

type NotificationFilter = 'All' | 'Unread' | 'Reminders' | 'Returns';

type MockNotification = NotificationListItemData & {
  group: 'Today' | 'Earlier';
};

const mockNotifications: MockNotification[] = [
  {
    id: 'notification-drill-due',
    kind: 'reminder',
    title: 'Cordless drill is due soon',
    description: 'Maya has had it for 11 days. A return is due tomorrow.',
    itemName: 'Cordless drill',
    itemId: 'item-drill',
    timestamp: '2 hours ago',
    group: 'Today',
  },
  {
    id: 'notification-camera-returned',
    kind: 'return',
    title: 'Mirrorless camera was returned',
    description: 'Rafi marked the item as returned to the media cabinet.',
    itemName: 'Mirrorless camera',
    itemId: 'item-camera',
    timestamp: '5 hours ago',
    group: 'Today',
  },
  {
    id: 'notification-projector-overdue',
    kind: 'reminder',
    title: 'Portable projector is overdue',
    description: 'The return date passed yesterday. Check in with the borrower.',
    itemName: 'Portable projector',
    itemId: 'item-projector',
    timestamp: 'Yesterday',
    group: 'Earlier',
  },
  {
    id: 'notification-linens-updated',
    kind: 'activity',
    title: 'Guest bed linens were updated',
    description: 'The item quantity changed from 1 to 2 units.',
    itemName: 'Guest bed linens',
    itemId: 'item-linens',
    timestamp: 'Yesterday',
    group: 'Earlier',
  },
  {
    id: 'notification-games-returned',
    kind: 'return',
    title: 'Board game collection was returned',
    description: 'Maya returned the collection to the bookcase.',
    itemName: 'Board game collection',
    itemId: 'item-board-games',
    timestamp: '2 days ago',
    group: 'Earlier',
  },
];

const filters: NotificationFilter[] = ['All', 'Unread', 'Reminders', 'Returns'];

export default function NotificationsPage() {
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>('All');
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const unreadCount = mockNotifications.filter(
    (notification) => !readIds.has(notification.id),
  ).length;

  const visibleNotifications = useMemo(() => {
    return mockNotifications.filter((notification) => {
      if (activeFilter === 'Unread') return !readIds.has(notification.id);
      if (activeFilter === 'Reminders') return notification.kind === 'reminder';
      if (activeFilter === 'Returns') return notification.kind === 'return';
      return true;
    });
  }, [activeFilter, readIds]);

  const markAsRead = (notificationId: string) => {
    setReadIds((current) => {
      const next = new Set(current);
      next.add(notificationId);
      return next;
    });
  };

  const markAsUnread = (notificationId: string) => {
    setReadIds((current) => {
      const next = new Set(current);
      next.delete(notificationId);
      return next;
    });
  };

  const markAllAsRead = () => {
    setReadIds(new Set(mockNotifications.map((notification) => notification.id)));
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-primary mb-2 flex items-center gap-2 text-sm font-semibold">
            <Bell size={16} />
            <span>Our Home</span>
            <span className="text-muted-light">/</span>
            <span className="text-muted font-normal">Notifications</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Keep up with your home</h1>
          <p className="text-muted mt-1">
            Returns, reminders, and recent household activity in one place.
          </p>
        </div>
        <div className="flex flex-col gap-2 self-start sm:flex-row sm:self-auto">
          <Link
            href="/notifications/preferences"
            className="border-border text-muted hover:border-primary/30 hover:text-primary inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors"
          >
            <SlidersHorizontal size={17} />
            Preferences
          </Link>
          <button
            type="button"
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
            className="border-border text-muted hover:border-primary/30 hover:text-primary inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCheck size={17} />
            Mark all as read
          </button>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Notification summary">
        <SummaryCard
          icon={Bell}
          label="Unread"
          value={unreadCount}
          detail={unreadCount === 1 ? 'needs your attention' : 'need your attention'}
          tone="primary"
        />
        <SummaryCard
          icon={Clock3}
          label="Reminders"
          value={
            mockNotifications.filter((notification) => notification.kind === 'reminder').length
          }
          detail="return dates"
          tone="warning"
        />
        <SummaryCard
          icon={RotateCcw}
          label="Recent returns"
          value={mockNotifications.filter((notification) => notification.kind === 'return').length}
          detail="in your activity"
          tone="success"
        />
      </section>

      <section className="space-y-4" aria-labelledby="notification-inbox-heading">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 id="notification-inbox-heading" className="text-lg font-bold">
              Notification inbox
            </h2>
            <p className="text-muted mt-0.5 text-sm">
              A quiet record of what changed around your home.
            </p>
          </div>
          <span className="text-muted text-xs font-medium">
            {visibleNotifications.length}{' '}
            {visibleNotifications.length === 1 ? 'notification' : 'notifications'}
          </span>
        </div>

        <div className="border-border bg-surface rounded-2xl border p-2 shadow-sm">
          <div
            className="scrollbar-none flex gap-1 overflow-x-auto"
            role="tablist"
            aria-label="Filter notifications"
          >
            {filters.map((filter) => {
              const isActive = activeFilter === filter;
              const count =
                filter === 'Unread'
                  ? unreadCount
                  : filter === 'Reminders'
                    ? mockNotifications.filter((notification) => notification.kind === 'reminder')
                        .length
                    : filter === 'Returns'
                      ? mockNotifications.filter((notification) => notification.kind === 'return')
                          .length
                      : mockNotifications.length;

              return (
                <button
                  key={filter}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveFilter(filter)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors sm:px-4 sm:text-sm ${
                    isActive
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-muted hover:bg-hover hover:text-foreground'
                  }`}
                >
                  {filter}
                  <span className={isActive ? 'text-white/75' : 'text-muted-light'}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {visibleNotifications.length > 0 ? (
          <div className="space-y-6">
            {(['Today', 'Earlier'] as const).map((group) => {
              const groupNotifications = visibleNotifications.filter(
                (notification) => notification.group === group,
              );
              if (groupNotifications.length === 0) return null;

              return (
                <div key={group} className="space-y-2">
                  <h3 className="text-muted px-1 text-xs font-semibold uppercase tracking-[0.16em]">
                    {group}
                  </h3>
                  <div className="border-border bg-surface divide-border divide-y overflow-hidden rounded-2xl border shadow-sm">
                    {groupNotifications.map((notification) => (
                      <NotificationListItem
                        key={notification.id}
                        notification={notification}
                        isRead={readIds.has(notification.id)}
                        onMarkRead={markAsRead}
                        onMarkUnread={markAsUnread}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="border-border bg-surface flex flex-col items-center rounded-2xl border px-6 py-16 text-center shadow-sm">
            <div className="bg-primary/10 text-primary mb-4 flex h-12 w-12 items-center justify-center rounded-2xl">
              <Check size={23} />
            </div>
            <h3 className="font-semibold">You&apos;re all caught up</h3>
            <p className="text-muted mt-1 max-w-xs text-sm">
              There are no notifications in this view right now.
            </p>
            {activeFilter !== 'All' && (
              <button
                type="button"
                onClick={() => setActiveFilter('All')}
                className="text-primary mt-4 text-sm font-semibold hover:opacity-75"
              >
                View all notifications
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  detail: string;
  tone: 'primary' | 'warning' | 'success';
}) {
  const toneStyles = {
    primary: 'bg-primary/10 text-primary',
    warning: 'bg-warning/10 text-warning',
    success: 'bg-success/10 text-success',
  };

  return (
    <div className="border-border bg-surface min-w-0 rounded-2xl border p-4 shadow-sm sm:p-5">
      <div
        className={`mb-4 flex h-9 w-9 items-center justify-center rounded-xl ${toneStyles[tone]}`}
      >
        <Icon size={18} />
      </div>
      <p className="text-muted truncate text-xs font-medium sm:text-sm">{label}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        <p className="text-muted-light hidden text-xs sm:block">{detail}</p>
      </div>
    </div>
  );
}
