'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { Bell, Check, ChevronRight, Clock3, Info, Package, RotateCcw } from 'lucide-react';

export type NotificationKind = 'reminder' | 'return' | 'activity';

export type NotificationListItemData = {
  id: string;
  kind: NotificationKind;
  title: string;
  description: string;
  itemName: string;
  itemId: string;
  timestamp: string;
};

const kindConfig: Record<
  NotificationKind,
  { label: string; icon: LucideIcon; iconClass: string; iconBackground: string }
> = {
  reminder: {
    label: 'Reminder',
    icon: Clock3,
    iconClass: 'text-warning',
    iconBackground: 'bg-warning/10',
  },
  return: {
    label: 'Return',
    icon: RotateCcw,
    iconClass: 'text-success',
    iconBackground: 'bg-success/10',
  },
  activity: {
    label: 'Activity',
    icon: Info,
    iconClass: 'text-info',
    iconBackground: 'bg-info/10',
  },
};

interface NotificationListItemProps {
  notification: NotificationListItemData;
  isRead: boolean;
  onMarkRead: (notificationId: string) => void;
  onMarkUnread: (notificationId: string) => void;
}

export default function NotificationListItem({
  notification,
  isRead,
  onMarkRead,
  onMarkUnread,
}: NotificationListItemProps) {
  const config = kindConfig[notification.kind];
  const Icon = config.icon;

  return (
    <article
      className={`group flex gap-3 p-4 transition-colors sm:gap-4 sm:p-5 ${!isRead ? 'bg-primary/[0.035]' : 'hover:bg-hover/50'}`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${config.iconBackground} ${config.iconClass}`}
      >
        <Icon size={19} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
          <div className="flex min-w-0 items-center gap-2">
            {!isRead && (
              <span className="bg-primary h-2 w-2 shrink-0 rounded-full" aria-label="Unread" />
            )}
            <h4 className={`truncate text-sm ${isRead ? 'font-medium' : 'font-bold'}`}>
              {notification.title}
            </h4>
          </div>
          <time className="text-muted-light shrink-0 text-xs">{notification.timestamp}</time>
        </div>
        <p className="text-muted mt-1 text-sm leading-relaxed">{notification.description}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Link
            href={`/items/${notification.itemId}`}
            onClick={() => onMarkRead(notification.id)}
            className="text-primary inline-flex items-center gap-1 text-xs font-semibold hover:opacity-75"
          >
            <Package size={13} />
            {notification.itemName}
            <ChevronRight size={13} />
          </Link>
          <span className="text-muted-light" aria-hidden="true">
            •
          </span>
          <span className={`text-xs font-medium ${config.iconClass}`}>{config.label}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={() => (isRead ? onMarkUnread(notification.id) : onMarkRead(notification.id))}
        aria-label={
          isRead ? `Mark ${notification.title} as unread` : `Mark ${notification.title} as read`
        }
        className="text-muted-light hover:bg-hover hover:text-primary flex h-8 w-8 shrink-0 items-center justify-center self-start rounded-lg opacity-100 transition-colors sm:opacity-0 sm:group-hover:opacity-100"
      >
        {isRead ? <Bell size={16} /> : <Check size={17} />}
      </button>
    </article>
  );
}
