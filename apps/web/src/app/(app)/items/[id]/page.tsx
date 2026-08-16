'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Edit3,
  MapPin,
  Package,
  QrCode,
  RotateCcw,
  Tag,
  UserRound,
} from 'lucide-react';

type MockItemDetail = {
  id: string;
  name: string;
  description: string;
  category: string;
  location: string;
  quantity: number;
  status: 'Stored' | 'Checked out' | 'Needs a home';
  updated: string;
  created: string;
  createdBy: string;
  tags: string[];
  note: string;
  borrower?: string;
  dueDate?: string;
};

type MockActivity = {
  id: string;
  kind: 'created' | 'updated' | 'checkout' | 'return';
  title: string;
  detail: string;
  date: string;
};

const mockItemDetails: MockItemDetail[] = [
  {
    id: 'item-camera',
    name: 'Mirrorless camera',
    description: 'Compact camera kit for family trips, day walks, and weekend projects.',
    category: 'Electronics',
    location: 'Media cabinet',
    quantity: 1,
    status: 'Stored',
    updated: 'Today at 09:42',
    created: 'August 2, 2026',
    createdBy: 'You',
    tags: ['travel', 'fragile'],
    note: 'Keep the spare battery and charger in the same pouch.',
  },
  {
    id: 'item-drill',
    name: 'Cordless drill',
    description: '18V drill for small household repairs and weekend maintenance.',
    category: 'Tools',
    location: 'Tool cabinet',
    quantity: 1,
    status: 'Checked out',
    updated: 'Yesterday at 16:20',
    created: 'July 14, 2026',
    createdBy: 'You',
    tags: ['maintenance'],
    note: 'Return with the charger and the small bit case.',
    borrower: 'Raka',
    dueDate: 'August 18, 2026',
  },
  {
    id: 'item-linens',
    name: 'Guest bed linens',
    description: 'Clean spare sheets and pillowcases for the guest room.',
    category: 'Bedroom',
    location: 'Wardrobe',
    quantity: 2,
    status: 'Stored',
    updated: 'Yesterday at 11:05',
    created: 'July 28, 2026',
    createdBy: 'You',
    tags: ['seasonal'],
    note: 'Folded together in the blue fabric bag.',
  },
  {
    id: 'item-board-games',
    name: 'Board game collection',
    description: 'A small collection for family evenings and visiting friends.',
    category: 'Entertainment',
    location: 'Bookcase',
    quantity: 6,
    status: 'Stored',
    updated: 'August 12, 2026',
    created: 'June 30, 2026',
    createdBy: 'You',
    tags: ['family', 'weekend'],
    note: 'Check that all pieces are back in their original boxes after use.',
  },
  {
    id: 'item-spices',
    name: 'Everyday spice set',
    description: 'Frequently used spices kept together for quick cooking.',
    category: 'Kitchen',
    location: 'Pantry shelves',
    quantity: 12,
    status: 'Stored',
    updated: 'August 11, 2026',
    created: 'July 5, 2026',
    createdBy: 'You',
    tags: ['daily use'],
    note: 'Review the best-before dates during the next pantry reset.',
  },
  {
    id: 'item-projector',
    name: 'Portable projector',
    description: 'Portable projector for movie nights and presentations.',
    category: 'Electronics',
    location: 'Media cabinet',
    quantity: 1,
    status: 'Checked out',
    updated: 'August 14, 2026',
    created: 'July 20, 2026',
    createdBy: 'You',
    tags: ['loaned'],
    note: 'Pack the HDMI adapter with the projector case.',
    borrower: 'Dimas',
    dueDate: 'August 16, 2026',
  },
  {
    id: 'item-birthday',
    name: 'Birthday decorations',
    description: 'Reusable banners, candles, and table decorations for celebrations.',
    category: 'Events',
    location: 'Unassigned',
    quantity: 1,
    status: 'Needs a home',
    updated: 'August 13, 2026',
    created: 'August 13, 2026',
    createdBy: 'You',
    tags: ['party'],
    note: 'Choose a dry, easy-to-reach spot before the next celebration.',
  },
  {
    id: 'item-screw-set',
    name: 'Wood screw set',
    description: 'Assorted screws for small furniture fixes and home projects.',
    category: 'Tools',
    location: 'Workshop shelf',
    quantity: 4,
    status: 'Stored',
    updated: 'August 8, 2026',
    created: 'July 8, 2026',
    createdBy: 'You',
    tags: ['maintenance', 'spares'],
    note: 'Keep sorted by size in the labelled organiser.',
  },
];

const mockBorrowers = ['Raka', 'Dimas', 'Maya'];

function buildMockActivity(item: MockItemDetail): MockActivity[] {
  const events: MockActivity[] = [
    {
      id: `${item.id}-updated`,
      kind: 'updated',
      title: 'Details updated',
      detail: 'Item information was refreshed.',
      date: item.updated,
    },
    {
      id: `${item.id}-created`,
      kind: 'created',
      title: 'Added to inventory',
      detail: `Added by ${item.createdBy}.`,
      date: item.created,
    },
  ];

  if (item.status === 'Checked out' && item.borrower && item.dueDate) {
    events.splice(1, 0, {
      id: `${item.id}-checkout`,
      kind: 'checkout',
      title: 'Checked out',
      detail: `Borrowed by ${item.borrower} · due ${item.dueDate}.`,
      date: item.updated,
    });
  }

  return events;
}

function formatDueDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`));
}

export default function ItemDetailPage() {
  const params = useParams();
  const itemId = String(params.id);
  const initialItem = mockItemDetails.find((entry) => entry.id === itemId);
  const [item, setItem] = useState(initialItem);
  const [activity, setActivity] = useState<MockActivity[]>(() =>
    initialItem ? buildMockActivity(initialItem) : [],
  );
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutSaved, setCheckoutSaved] = useState(false);
  const [returnSaved, setReturnSaved] = useState(false);
  const [borrower, setBorrower] = useState(mockBorrowers[0]);
  const [dueDate, setDueDate] = useState('2026-08-23');

  if (!item) {
    return (
      <div className="border-border bg-surface flex flex-col items-center justify-center rounded-2xl border px-6 py-16 text-center">
        <Package size={48} className="text-muted-light mb-4" />
        <h1 className="mb-2 text-xl font-bold">Item not found</h1>
        <p className="text-muted mb-6">This mock item is not part of the current inventory view.</p>
        <Link
          href="/items"
          className="from-primary to-accent rounded-xl bg-gradient-to-r px-5 py-2.5 font-medium text-white transition-opacity hover:opacity-90"
        >
          Back to items
        </Link>
      </div>
    );
  }

  const statusTone = {
    Stored: 'bg-success/10 text-success',
    'Checked out': 'bg-primary/10 text-primary',
    'Needs a home': 'bg-warning/10 text-warning',
  }[item.status];

  function handleCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setItem((current) =>
      current
        ? {
            ...current,
            status: 'Checked out',
            borrower,
            dueDate: formatDueDate(dueDate),
            updated: 'Just now',
          }
        : current,
    );
    setActivity((current) => [
      {
        id: `${itemId}-checkout-${Date.now()}`,
        kind: 'checkout',
        title: 'Checked out',
        detail: `Borrowed by ${borrower} · due ${formatDueDate(dueDate)}.`,
        date: 'Just now',
      },
      ...current,
    ]);
    setCheckoutOpen(false);
    setCheckoutSaved(true);
    setReturnSaved(false);
  }

  function handleReturn() {
    setItem((current) =>
      current
        ? {
            ...current,
            status: 'Stored',
            borrower: undefined,
            dueDate: undefined,
            updated: 'Just now',
          }
        : current,
    );
    setActivity((current) => [
      {
        id: `${itemId}-return-${Date.now()}`,
        kind: 'return',
        title: 'Returned to storage',
        detail: `Marked returned by you and placed back in ${item?.location ?? 'storage'}.`,
        date: 'Just now',
      },
      ...current,
    ]);
    setReturnSaved(true);
    setCheckoutSaved(false);
  }

  return (
    <div className="space-y-8">
      <nav className="text-muted flex items-center gap-2 text-sm" aria-label="Breadcrumb">
        <Link href="/items" className="hover:text-foreground transition-colors">
          Items
        </Link>
        <span>/</span>
        <span className="text-foreground truncate font-medium">{item.name}</span>
      </nav>

      <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          <Link
            href="/items"
            aria-label="Back to items"
            className="text-muted hover:text-foreground hover:bg-hover mt-1 rounded-xl p-2 transition-all"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{item.name}</h1>
              <StatusPill status={item.status} />
            </div>
            <p className="text-muted max-w-2xl">{item.description}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 self-start sm:self-auto">
          <Link
            href="/items/labels"
            className="border-border hover:bg-hover inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors"
          >
            <QrCode size={16} />
            Generate QR label
          </Link>
          <Link
            href={`/items/${item.id}/edit`}
            className="border-border hover:bg-hover inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors"
          >
            <Edit3 size={16} />
            Edit item
          </Link>
        </div>
      </header>

      <section className="from-primary/10 via-surface to-accent/10 border-border overflow-hidden rounded-2xl border bg-gradient-to-br p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-primary shadow-primary/20 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg">
              <Package size={27} />
            </div>
            <div>
              <p className="text-muted text-xs font-semibold uppercase tracking-wide">
                Current home
              </p>
              <div className="mt-1 flex items-center gap-2">
                <MapPin size={17} className="text-accent" />
                <p className="text-lg font-bold">{item.location}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6 sm:text-right">
            <div>
              <p className="text-muted text-xs">Quantity</p>
              <p className="mt-1 text-xl font-bold">{item.quantity}</p>
            </div>
            <div>
              <p className="text-muted text-xs">Category</p>
              <p className="mt-1 text-sm font-bold">{item.category}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <section
            className="border-border bg-surface rounded-2xl border p-5 shadow-sm sm:p-6"
            aria-labelledby="details-heading"
          >
            <h2 id="details-heading" className="mb-5 text-lg font-bold">
              Item details
            </h2>
            <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
              <DetailRow
                icon={<Package size={16} />}
                label="Quantity"
                value={`${item.quantity} units`}
              />
              <DetailRow icon={<Tag size={16} />} label="Category" value={item.category} />
              <DetailRow icon={<MapPin size={16} />} label="Location" value={item.location} />
              <DetailRow icon={<UserRound size={16} />} label="Created by" value={item.createdBy} />
            </div>
          </section>

          <section
            className="border-border bg-surface rounded-2xl border p-5 shadow-sm sm:p-6"
            aria-labelledby="notes-heading"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 id="notes-heading" className="text-lg font-bold">
                Notes
              </h2>
              <span className="text-muted text-xs">Household memory</span>
            </div>
            <p className="text-muted bg-background rounded-xl p-4 text-sm leading-relaxed">
              {item.note}
            </p>
          </section>

          <section
            className="border-border bg-surface rounded-2xl border p-5 shadow-sm sm:p-6"
            aria-labelledby="tags-heading"
          >
            <h2 id="tags-heading" className="mb-4 text-lg font-bold">
              Tags
            </h2>
            <div className="flex flex-wrap gap-2">
              {item.tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-primary/10 text-primary rounded-full px-3 py-1 text-sm font-semibold"
                >
                  {tag}
                </span>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-6" aria-label="Item activity">
          <section
            className="border-border bg-surface rounded-2xl border p-5 shadow-sm"
            aria-labelledby="activity-heading"
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <div className="bg-accent/10 text-accent mb-3 flex h-9 w-9 items-center justify-center rounded-xl">
                  <Clock3 size={18} />
                </div>
                <h2 id="activity-heading" className="font-bold">
                  Activity
                </h2>
                <p className="text-muted mt-0.5 text-sm">A timeline of this item’s story.</p>
              </div>
              <ArrowUpRight size={17} className="text-muted-light" />
            </div>
            <ActivityTimeline events={activity} />
          </section>

          <section
            className="border-border bg-surface rounded-2xl border p-5 shadow-sm"
            aria-labelledby="status-heading"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 id="status-heading" className="font-bold">
                Status
              </h2>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone}`}>
                {item.status}
              </span>
            </div>
            {checkoutSaved && (
              <div className="bg-success/10 text-success mb-4 rounded-xl px-3 py-2.5 text-sm">
                Checkout saved in this preview. The item is now marked as checked out.
              </div>
            )}
            {returnSaved && (
              <div className="bg-success/10 text-success mb-4 rounded-xl px-3 py-2.5 text-sm">
                Return saved in this preview. The item is back in storage.
              </div>
            )}
            {item.status === 'Checked out' && item.borrower && item.dueDate ? (
              <div className="bg-primary/5 space-y-3 rounded-xl p-3">
                <DetailRow icon={<UserRound size={15} />} label="With" value={item.borrower} />
                <DetailRow icon={<CalendarDays size={15} />} label="Due" value={item.dueDate} />
                <button
                  type="button"
                  onClick={handleReturn}
                  className="border-primary/30 text-primary hover:bg-primary/10 inline-flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors"
                >
                  <RotateCcw size={15} />
                  Mark as returned
                </button>
              </div>
            ) : item.status === 'Stored' ? (
              checkoutOpen ? (
                <form onSubmit={handleCheckout} className="bg-primary/5 space-y-4 rounded-xl p-3">
                  <div>
                    <h3 className="text-sm font-bold">Check out this item</h3>
                    <p className="text-muted mt-0.5 text-xs">
                      Record who has it and when it should come home.
                    </p>
                  </div>
                  <div>
                    <label htmlFor="borrower" className="mb-1.5 block text-xs font-semibold">
                      Borrowed by
                    </label>
                    <select
                      id="borrower"
                      value={borrower}
                      onChange={(event) => setBorrower(event.target.value)}
                      className="border-border bg-surface focus:border-primary focus:ring-primary/20 w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2"
                    >
                      {mockBorrowers.map((name) => (
                        <option key={name}>{name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="due-date" className="mb-1.5 block text-xs font-semibold">
                      Due date
                    </label>
                    <input
                      id="due-date"
                      type="date"
                      required
                      value={dueDate}
                      onChange={(event) => setDueDate(event.target.value)}
                      className="border-border bg-surface focus:border-primary focus:ring-primary/20 w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCheckoutOpen(false)}
                      className="border-border hover:bg-hover flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="from-primary to-accent flex-1 rounded-xl bg-gradient-to-r px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
                    >
                      Confirm checkout
                    </button>
                  </div>
                </form>
              ) : (
                <div className="bg-success/5 rounded-xl p-3">
                  <div className="text-muted flex items-start gap-2 text-sm leading-relaxed">
                    <CheckCircle2 size={16} className="text-success mt-0.5 shrink-0" />
                    <span>This item is stored and ready to find.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCheckoutOpen(true);
                      setCheckoutSaved(false);
                      setReturnSaved(false);
                    }}
                    className="from-primary to-accent mt-4 w-full rounded-xl bg-gradient-to-r px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
                  >
                    Check out item
                  </button>
                </div>
              )
            ) : item.status === 'Needs a home' ? (
              <div className="bg-warning/5 text-muted rounded-xl p-3 text-sm leading-relaxed">
                Assign a storage spot so everyone can find this item next time.
              </div>
            ) : (
              <div className="bg-success/5 text-muted flex items-start gap-2 rounded-xl p-3 text-sm leading-relaxed">
                <CheckCircle2 size={16} className="text-success mt-0.5 shrink-0" />
                This item is stored and ready to find.
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: MockItemDetail['status'] }) {
  const styles = {
    Stored: 'bg-success/10 text-success',
    'Checked out': 'bg-primary/10 text-primary',
    'Needs a home': 'bg-warning/10 text-warning',
  };

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status]}`}>
      {status}
    </span>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted flex items-center gap-2 text-sm">
        {icon}
        {label}
      </span>
      <span className="truncate text-right text-sm font-semibold">{value}</span>
    </div>
  );
}

function ActivityTimeline({ events }: { events: MockActivity[] }) {
  return (
    <div className="space-y-0">
      {events.map((event, index) => (
        <ActivityEvent key={event.id} event={event} isLast={index === events.length - 1} />
      ))}
    </div>
  );
}

function ActivityEvent({ event, isLast }: { event: MockActivity; isLast: boolean }) {
  const tone = {
    created: 'bg-primary/10 text-primary',
    updated: 'bg-hover text-muted',
    checkout: 'bg-warning/10 text-warning',
    return: 'bg-success/10 text-success',
  }[event.kind];
  const Icon = {
    created: Package,
    updated: Edit3,
    checkout: UserRound,
    return: RotateCcw,
  }[event.kind];

  return (
    <div className="flex gap-3">
      <div className="flex w-8 shrink-0 flex-col items-center">
        <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${tone}`}>
          <Icon size={15} />
        </div>
        {!isLast && <div className="bg-border my-1 h-full w-px" />}
      </div>
      <div className={`min-w-0 flex-1 ${isLast ? 'pb-0' : 'pb-5'}`}>
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-semibold">{event.title}</p>
          <span className="text-muted shrink-0 text-xs">{event.date}</span>
        </div>
        <p className="text-muted mt-1 text-xs leading-relaxed">{event.detail}</p>
      </div>
    </div>
  );
}
