'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import {
  ArrowUpRight,
  Box,
  ChevronDown,
  ChevronRight,
  Grid2X2,
  Layers3,
  MapPin,
  Move,
  Package,
  Plus,
  Sparkles,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth';

type StorageNodeData = {
  id: string;
  name: string;
  type: string;
  itemCount: number;
  capacity: number;
  color: string;
  children?: StorageNodeData[];
};

type StorageItem = {
  id: string;
  name: string;
  category: string;
  status: 'Stored' | 'Borrowed';
};

type StorageSpotFormData = {
  name: string;
  type: string;
  capacity: string;
  parentId: string;
};

const emptyStorageSpotForm: StorageSpotFormData = {
  name: '',
  type: 'Shelf',
  capacity: '5',
  parentId: '',
};

const mockStorageSpots: StorageNodeData[] = [
  {
    id: 'kitchen',
    name: 'Kitchen',
    type: 'Room',
    itemCount: 5,
    capacity: 8,
    color: 'bg-warning',
    children: [
      {
        id: 'pantry',
        name: 'Pantry shelves',
        type: 'Shelf',
        itemCount: 3,
        capacity: 5,
        color: 'bg-warning',
      },
      {
        id: 'kitchen-drawer',
        name: 'Kitchen drawer',
        type: 'Drawer',
        itemCount: 2,
        capacity: 3,
        color: 'bg-warning',
      },
    ],
  },
  {
    id: 'living-room',
    name: 'Living room',
    type: 'Room',
    itemCount: 8,
    capacity: 10,
    color: 'bg-primary',
    children: [
      {
        id: 'media-cabinet',
        name: 'Media cabinet',
        type: 'Cabinet',
        itemCount: 5,
        capacity: 6,
        color: 'bg-primary',
      },
      {
        id: 'bookcase',
        name: 'Bookcase',
        type: 'Shelf',
        itemCount: 3,
        capacity: 6,
        color: 'bg-primary',
      },
    ],
  },
  {
    id: 'garage',
    name: 'Garage',
    type: 'Room',
    itemCount: 7,
    capacity: 10,
    color: 'bg-accent',
    children: [
      {
        id: 'workshop-shelf',
        name: 'Workshop shelf',
        type: 'Shelf',
        itemCount: 4,
        capacity: 7,
        color: 'bg-accent',
      },
      {
        id: 'tool-cabinet',
        name: 'Tool cabinet',
        type: 'Cabinet',
        itemCount: 3,
        capacity: 5,
        color: 'bg-accent',
      },
    ],
  },
  {
    id: 'bedroom',
    name: 'Bedroom',
    type: 'Room',
    itemCount: 4,
    capacity: 8,
    color: 'bg-success',
    children: [
      {
        id: 'wardrobe',
        name: 'Wardrobe',
        type: 'Cabinet',
        itemCount: 4,
        capacity: 8,
        color: 'bg-success',
      },
    ],
  },
];

const recentLocations = [
  {
    name: 'Workshop shelf',
    type: 'Shelf',
    itemCount: 4,
    time: 'Opened 12m ago',
    color: 'bg-accent',
  },
  {
    name: 'Media cabinet',
    type: 'Cabinet',
    itemCount: 5,
    time: 'Opened yesterday',
    color: 'bg-primary',
  },
  {
    name: 'Pantry shelves',
    type: 'Shelf',
    itemCount: 3,
    time: 'Opened 2 days ago',
    color: 'bg-warning',
  },
];

const mockItemsBySpot: Record<string, StorageItem[]> = {
  pantry: createStorageItems(
    'pantry',
    ['Pasta containers', 'Spice jars', 'Baking tins'],
    'Kitchen',
  ),
  'kitchen-drawer': createStorageItems(
    'kitchen-drawer',
    ['Measuring spoons', 'Reusable bags'],
    'Kitchen',
  ),
  'media-cabinet': createStorageItems(
    'media-cabinet',
    ['HDMI cables', 'Game controllers', 'Spare batteries', 'Camera charger', 'Remote controls'],
    'Electronics',
  ),
  bookcase: createStorageItems(
    'bookcase',
    ['Travel guides', 'Board games', 'Photo albums'],
    'Entertainment',
  ),
  'workshop-shelf': createStorageItems(
    'workshop-shelf',
    ['Wood screws', 'Sandpaper', 'Paint brushes', 'Measuring tape'],
    'Tools',
  ),
  'tool-cabinet': createStorageItems(
    'tool-cabinet',
    ['Cordless drill', 'Socket set', 'Safety goggles'],
    'Tools',
  ),
  wardrobe: createStorageItems(
    'wardrobe',
    ['Winter coats', 'Spare linens', 'Rain jackets', 'Travel bags'],
    'Bedroom',
  ),
};

export default function LocationsPage() {
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const [storageSpots, setStorageSpots] = useState(mockStorageSpots);
  const [query, setQuery] = useState('');
  const requestedSpotId = searchParams.get('spot');
  const initialSpotId =
    requestedSpotId && findStorageSpot(mockStorageSpots, requestedSpotId)
      ? requestedSpotId
      : 'kitchen';
  const [selectedSpotId, setSelectedSpotId] = useState(initialSpotId);
  const [showSpotForm, setShowSpotForm] = useState(false);
  const [spotForm, setSpotForm] = useState(emptyStorageSpotForm);
  const [formError, setFormError] = useState('');
  const [showMoveForm, setShowMoveForm] = useState(false);
  const [moveParentId, setMoveParentId] = useState('');
  const [moveError, setMoveError] = useState('');

  const firstName = user?.displayName?.split(' ')[0] || 'there';
  const totalSpots = countSpots(storageSpots);
  const totalItems = storageSpots.reduce((total, spot) => total + spot.itemCount, 0);
  const selectedSpot = findStorageSpot(storageSpots, selectedSpotId) || storageSpots[0];
  const selectedItems = getSpotItems(selectedSpot);
  const currentParentId = findParentId(storageSpots, selectedSpotId);
  const moveOptions = flattenStorageSpots(storageSpots).filter(
    (spot) => spot.id !== selectedSpotId && !isDescendant(storageSpots, selectedSpotId, spot.id),
  );
  const filteredSpots = query.trim()
    ? filterStorageSpots(storageSpots, query.trim().toLowerCase())
    : storageSpots;

  function openSpotForm() {
    setSpotForm(emptyStorageSpotForm);
    setFormError('');
    setShowSpotForm(true);
  }

  function handleCreateSpot() {
    const name = spotForm.name.trim();
    const capacity = Number(spotForm.capacity);

    if (!name) {
      setFormError('Give this storage spot a name.');
      return;
    }
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 999) {
      setFormError('Capacity must be a whole number between 1 and 999.');
      return;
    }

    const newSpot: StorageNodeData = {
      id: `custom-spot-${Date.now()}`,
      name,
      type: spotForm.type,
      itemCount: 0,
      capacity,
      color: 'bg-accent',
    };

    setStorageSpots((current) =>
      spotForm.parentId
        ? addChildToSpot(current, spotForm.parentId, newSpot)
        : [...current, newSpot],
    );
    setSelectedSpotId(newSpot.id);
    setShowSpotForm(false);
    setSpotForm(emptyStorageSpotForm);
    setFormError('');
  }

  function openMoveForm() {
    setMoveParentId(currentParentId || '');
    setMoveError('');
    setShowMoveForm(true);
  }

  function handleMoveSpot() {
    if (
      moveParentId === selectedSpotId ||
      isDescendant(storageSpots, selectedSpotId, moveParentId)
    ) {
      setMoveError('A spot cannot be moved inside itself or one of its sub-spots.');
      return;
    }

    setStorageSpots((current) => moveStorageSpot(current, selectedSpotId, moveParentId));
    setShowMoveForm(false);
    setMoveError('');
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-accent mb-2 flex items-center gap-2 text-sm font-semibold">
            <Sparkles size={16} />
            <span>Our Home</span>
            <span className="text-muted-light">/</span>
            <span className="text-muted font-normal">Storage organization</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Make space for everything, {firstName}
          </h1>
          <p className="text-muted mt-1">A simple map of where your household items live.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <div className="bg-success/10 text-success inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold">
            <span className="bg-success h-2 w-2 rounded-full" />
            Map up to date
          </div>
          <button
            type="button"
            onClick={openSpotForm}
            className="from-primary to-accent inline-flex items-center gap-2 rounded-xl bg-gradient-to-r px-3.5 py-2.5 text-sm font-semibold text-white shadow-md transition-opacity hover:opacity-90"
          >
            <Plus size={17} />
            Add spot
          </button>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Storage summary">
        <SummaryCard
          icon={Grid2X2}
          label="Storage spots"
          value={totalSpots}
          detail="across your home"
          tone="accent"
        />
        <SummaryCard
          icon={Package}
          label="Items with a home"
          value={totalItems}
          detail="organized items"
          tone="primary"
        />
        <SummaryCard
          icon={Layers3}
          label="Nested levels"
          value={2}
          detail="rooms to drawers"
          tone="success"
        />
        <SummaryCard
          icon={Box}
          label="Open spots"
          value={7}
          detail="room to add more"
          tone="warning"
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section
          id="storage-map"
          className="min-w-0 space-y-4"
          aria-labelledby="storage-map-heading"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="storage-map-heading" className="text-lg font-bold">
                Your storage map
              </h2>
              <p className="text-muted mt-0.5 text-sm">
                Rooms, cabinets, shelves, and drawers in one view.
              </p>
            </div>
            <span className="text-muted self-start text-xs font-medium sm:self-auto">
              {storageSpots.length} main areas
            </span>
          </div>
          <p className="text-muted text-sm">Select a spot to see its items and sub-spots.</p>

          <div className="border-border bg-surface rounded-2xl border p-3 shadow-sm sm:p-4">
            <label className="relative block">
              <span className="sr-only">Search storage spots</span>
              <MapPin
                size={17}
                className="text-muted-light pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search rooms, cabinets, or shelves"
                className="border-border bg-background focus:border-primary focus:ring-primary/20 w-full rounded-xl border py-3 pl-10 pr-4 text-sm outline-none transition-colors focus:ring-2"
              />
            </label>
          </div>

          <div className="border-border bg-surface divide-border divide-y overflow-hidden rounded-2xl border shadow-sm">
            {filteredSpots.length > 0 ? (
              filteredSpots.map((spot) => (
                <StorageNode
                  key={spot.id}
                  node={spot}
                  selectedSpotId={selectedSpotId}
                  onSelect={setSelectedSpotId}
                />
              ))
            ) : (
              <div className="flex flex-col items-center px-6 py-14 text-center">
                <div className="bg-accent/10 text-accent mb-4 flex h-12 w-12 items-center justify-center rounded-2xl">
                  <MapPin size={22} />
                </div>
                <h3 className="font-semibold">No storage spots found</h3>
                <p className="text-muted mt-1 max-w-xs text-sm">
                  Try a different room or storage spot name.
                </p>
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-6" aria-label="Storage details">
          <SpotDetailCard
            spot={selectedSpot}
            items={selectedItems}
            onSelect={setSelectedSpotId}
            onMove={openMoveForm}
          />
          <section
            className="border-border bg-surface rounded-2xl border p-5 shadow-sm"
            aria-labelledby="capacity-heading"
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <div className="bg-primary/10 text-primary mb-3 flex h-9 w-9 items-center justify-center rounded-xl">
                  <Layers3 size={18} />
                </div>
                <h2 id="capacity-heading" className="font-bold">
                  At a glance
                </h2>
                <p className="text-muted mt-0.5 text-sm">Keep every spot useful.</p>
              </div>
              <span className="text-primary text-sm font-bold">75%</span>
            </div>
            <div className="bg-hover h-2 overflow-hidden rounded-full">
              <div className="from-primary to-accent h-full w-3/4 rounded-full bg-gradient-to-r" />
            </div>
            <p className="text-muted mt-2 text-xs">24 of 32 available spaces are in use.</p>

            <div className="border-border mt-5 space-y-3 border-t pt-4">
              <MetricRow label="Assigned items" value="24" tone="text-primary" />
              <MetricRow label="Unassigned items" value="2" tone="text-warning" />
              <MetricRow label="Most used area" value="Living room" tone="text-accent" />
            </div>
          </section>

          <section
            className="border-border bg-surface rounded-2xl border p-5 shadow-sm"
            aria-labelledby="recent-heading"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 id="recent-heading" className="font-bold">
                  Recently opened
                </h2>
                <p className="text-muted mt-0.5 text-sm">Your latest storage spots.</p>
              </div>
              <ArrowUpRight size={17} className="text-muted-light" />
            </div>
            <div className="space-y-1">
              {recentLocations.map((location) => (
                <div
                  key={location.name}
                  className="hover:bg-hover -mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors"
                >
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${location.color}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{location.name}</p>
                    <p className="text-muted text-xs">
                      {location.type} · {location.itemCount} items
                    </p>
                  </div>
                  <span className="text-muted-light text-[10px]">{location.time}</span>
                </div>
              ))}
            </div>
          </section>

          <div className="from-accent to-primary relative overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-white shadow-lg shadow-violet-500/15">
            <div className="relative z-10">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
                Next step
              </p>
              <h2 className="mt-3 text-lg font-bold leading-snug">
                Give every item a place to come home to.
              </h2>
              <Link
                href="/items"
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-2 text-xs font-semibold backdrop-blur transition-colors hover:bg-white/25"
              >
                Review your items
                <ArrowUpRight size={14} />
              </Link>
            </div>
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full border-[18px] border-white/10" />
            <div className="absolute -bottom-12 -right-2 h-32 w-32 rounded-full border-[18px] border-white/10" />
          </div>
        </aside>
      </div>

      {showSpotForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-spot-heading"
            className="bg-surface border-border w-full max-w-md space-y-5 rounded-2xl border p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-accent text-xs font-semibold uppercase tracking-wide">
                  Storage organization
                </p>
                <h2 id="create-spot-heading" className="mt-1 text-lg font-bold">
                  Add a storage spot
                </h2>
                <p className="text-muted mt-1 text-sm">
                  Create a room, cabinet, shelf, or drawer for your items.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSpotForm(false)}
                aria-label="Close form"
                className="text-muted hover:text-foreground hover:bg-hover rounded-lg p-1.5 transition-colors"
              >
                <X size={19} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="spot-name" className="mb-1.5 block text-sm font-medium">
                  Spot name
                </label>
                <input
                  id="spot-name"
                  type="text"
                  value={spotForm.name}
                  onChange={(event) => setSpotForm({ ...spotForm, name: event.target.value })}
                  placeholder="e.g. Linen cabinet"
                  maxLength={60}
                  autoFocus
                  className="border-border bg-background focus:border-primary focus:ring-primary/40 w-full rounded-xl border px-4 py-2.5 transition-all focus:outline-none focus:ring-2"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="spot-type" className="mb-1.5 block text-sm font-medium">
                    Spot type
                  </label>
                  <select
                    id="spot-type"
                    value={spotForm.type}
                    onChange={(event) => setSpotForm({ ...spotForm, type: event.target.value })}
                    className="border-border bg-background focus:border-primary focus:ring-primary/40 w-full rounded-xl border px-4 py-2.5 transition-all focus:outline-none focus:ring-2"
                  >
                    <option>Room</option>
                    <option>Cabinet</option>
                    <option>Shelf</option>
                    <option>Drawer</option>
                    <option>Box</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="spot-capacity" className="mb-1.5 block text-sm font-medium">
                    Capacity
                  </label>
                  <input
                    id="spot-capacity"
                    type="number"
                    min="1"
                    max="999"
                    value={spotForm.capacity}
                    onChange={(event) => setSpotForm({ ...spotForm, capacity: event.target.value })}
                    className="border-border bg-background focus:border-primary focus:ring-primary/40 w-full rounded-xl border px-4 py-2.5 transition-all focus:outline-none focus:ring-2"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="spot-parent" className="mb-1.5 block text-sm font-medium">
                  Parent spot <span className="text-muted font-normal">(optional)</span>
                </label>
                <select
                  id="spot-parent"
                  value={spotForm.parentId}
                  onChange={(event) => setSpotForm({ ...spotForm, parentId: event.target.value })}
                  className="border-border bg-background focus:border-primary focus:ring-primary/40 w-full rounded-xl border px-4 py-2.5 transition-all focus:outline-none focus:ring-2"
                >
                  <option value="">None (top-level spot)</option>
                  {flattenStorageSpots(storageSpots).map((spot) => (
                    <option key={spot.id} value={spot.id}>
                      {spot.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {formError && <p className="text-danger text-sm">{formError}</p>}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowSpotForm(false)}
                className="border-border hover:bg-hover flex-1 rounded-xl border px-4 py-2.5 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateSpot}
                className="from-primary to-accent flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r px-4 py-2.5 font-medium text-white transition-opacity hover:opacity-90"
              >
                <Plus size={16} />
                Create spot
              </button>
            </div>
          </div>
        </div>
      )}

      {showMoveForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="move-spot-heading"
            className="bg-surface border-border w-full max-w-md space-y-5 rounded-2xl border p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-accent text-xs font-semibold uppercase tracking-wide">
                  Storage organization
                </p>
                <h2 id="move-spot-heading" className="mt-1 text-lg font-bold">
                  Move {selectedSpot.name}
                </h2>
                <p className="text-muted mt-1 text-sm">
                  Choose where this spot belongs in your storage map.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowMoveForm(false)}
                aria-label="Close move form"
                className="text-muted hover:text-foreground hover:bg-hover rounded-lg p-1.5 transition-colors"
              >
                <X size={19} />
              </button>
            </div>

            <div>
              <label htmlFor="move-parent" className="mb-1.5 block text-sm font-medium">
                New parent spot
              </label>
              <select
                id="move-parent"
                value={moveParentId}
                onChange={(event) => setMoveParentId(event.target.value)}
                className="border-border bg-background focus:border-primary focus:ring-primary/40 w-full rounded-xl border px-4 py-2.5 transition-all focus:outline-none focus:ring-2"
              >
                <option value="">None (top-level spot)</option>
                {moveOptions.map((spot) => (
                  <option key={spot.id} value={spot.id}>
                    {spot.label}
                  </option>
                ))}
              </select>
              <p className="text-muted mt-2 text-xs">
                The current spot and its sub-spots are excluded to keep the map cycle-free.
              </p>
            </div>

            {moveError && <p className="text-danger text-sm">{moveError}</p>}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowMoveForm(false)}
                className="border-border hover:bg-hover flex-1 rounded-xl border px-4 py-2.5 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleMoveSpot}
                className="from-primary to-accent flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r px-4 py-2.5 font-medium text-white transition-opacity hover:opacity-90"
              >
                <Move size={16} />
                Move spot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StorageNode({
  node,
  selectedSpotId,
  onSelect,
}: {
  node: StorageNodeData;
  selectedSpotId: string;
  onSelect: (spotId: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = Boolean(node.children?.length);
  const fill = Math.min(100, Math.round((node.itemCount / node.capacity) * 100));
  const selected = node.id === selectedSpotId;

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-pressed={selected}
        onClick={() => onSelect(node.id)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelect(node.id);
          }
        }}
        className={`hover:bg-hover/60 group flex cursor-pointer items-center gap-3 px-3 py-3.5 transition-colors sm:px-5 ${
          selected ? 'bg-primary/5 ring-primary/20 inset-ring-1' : ''
        }`}
      >
        <button
          type="button"
          aria-label={`${expanded ? 'Collapse' : 'Expand'} ${node.name}`}
          aria-expanded={hasChildren ? expanded : undefined}
          onClick={(event) => {
            event.stopPropagation();
            if (hasChildren) setExpanded((current) => !current);
          }}
          className={`text-muted flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
            hasChildren ? 'hover:bg-hover' : 'cursor-default opacity-0'
          }`}
        >
          {hasChildren && (expanded ? <ChevronDown size={17} /> : <ChevronRight size={17} />)}
        </button>
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${node.color}/10`}
        >
          <MapPin size={19} className={node.color.replace('bg-', 'text-')} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-semibold">{node.name}</h3>
            <span className="text-muted-light text-[10px] font-medium uppercase tracking-wide">
              {node.type}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <div className="bg-hover h-1.5 w-24 overflow-hidden rounded-full sm:w-32">
              <div className={`${node.color} h-full rounded-full`} style={{ width: `${fill}%` }} />
            </div>
            <span className="text-muted text-xs">
              {node.itemCount}/{node.capacity} items
            </span>
          </div>
        </div>
        <div className="text-muted-light hidden items-center gap-1 rounded-lg p-1.5 sm:flex">
          <Package size={15} />
          <span className="text-xs">{node.itemCount}</span>
        </div>
      </div>

      {expanded && hasChildren && (
        <div className="border-border/70 ml-9 border-l sm:ml-[4.45rem]">
          {node.children?.map((child) => (
            <StorageNode
              key={child.id}
              node={child}
              selectedSpotId={selectedSpotId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SpotDetailCard({
  spot,
  items,
  onSelect,
  onMove,
}: {
  spot: StorageNodeData;
  items: StorageItem[];
  onSelect: (spotId: string) => void;
  onMove: () => void;
}) {
  const fill = Math.min(100, Math.round((spot.itemCount / spot.capacity) * 100));

  return (
    <section
      className="border-border bg-surface rounded-2xl border p-5 shadow-sm"
      aria-labelledby="spot-detail-heading"
    >
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${spot.color}/10`}
          >
            <MapPin size={20} className={spot.color.replace('bg-', 'text-')} />
          </div>
          <div className="min-w-0">
            <p className="text-muted text-xs font-medium uppercase tracking-wide">Selected spot</p>
            <h2 id="spot-detail-heading" className="truncate font-bold">
              {spot.name}
            </h2>
            <p className="text-muted text-xs">
              {spot.type} · {spot.itemCount} items
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="text-primary text-sm font-bold">{fill}% full</span>
          <button
            type="button"
            onClick={onMove}
            className="text-muted hover:text-primary hover:bg-primary/10 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition-colors"
          >
            <Move size={14} />
            Move
          </button>
        </div>
      </div>

      <div className="bg-hover h-2 overflow-hidden rounded-full">
        <div className={`${spot.color} h-full rounded-full`} style={{ width: `${fill}%` }} />
      </div>

      <div className="border-border mt-5 border-t pt-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold">Items here</h3>
          <span className="text-muted text-xs">{items.length} shown</span>
        </div>
        <div className="space-y-2">
          {items.length > 0 ? (
            items.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="bg-background flex items-center gap-2.5 rounded-xl p-2.5"
              >
                <div className="bg-primary/10 text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
                  <Package size={15} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">{item.name}</p>
                  <p className="text-muted truncate text-[11px]">{item.category}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${
                    item.status === 'Stored'
                      ? 'bg-success/10 text-success'
                      : 'bg-warning/10 text-warning'
                  }`}
                >
                  {item.status}
                </span>
              </div>
            ))
          ) : (
            <p className="text-muted bg-background rounded-xl p-3 text-xs">
              No items are assigned to this spot yet.
            </p>
          )}
        </div>
        {items.length > 5 && (
          <p className="text-muted mt-3 text-center text-xs">+ {items.length - 5} more items</p>
        )}
      </div>

      <div className="border-border mt-5 border-t pt-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold">Sub-spots</h3>
          <span className="text-muted text-xs">{spot.children?.length || 0}</span>
        </div>
        {spot.children && spot.children.length > 0 ? (
          <div className="space-y-1">
            {spot.children.map((child) => (
              <button
                key={child.id}
                type="button"
                onClick={() => onSelect(child.id)}
                className="hover:bg-hover flex w-full items-center gap-2 rounded-xl p-2 text-left transition-colors"
              >
                <MapPin size={15} className={child.color.replace('bg-', 'text-')} />
                <span className="min-w-0 flex-1 truncate text-xs font-medium">{child.name}</span>
                <span className="text-muted shrink-0 text-[11px]">{child.itemCount} items</span>
                <ChevronRight size={14} className="text-muted-light" />
              </button>
            ))}
          </div>
        ) : (
          <p className="text-muted bg-background rounded-xl p-3 text-xs">
            This is a leaf spot. Add a nested spot when you need another level of organization.
          </p>
        )}
      </div>
    </section>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: typeof Grid2X2;
  label: string;
  value: number;
  detail: string;
  tone: 'primary' | 'success' | 'warning' | 'accent';
}) {
  const toneStyles = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    accent: 'bg-accent/10 text-accent',
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

function MetricRow({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted">{label}</span>
      <span className={`truncate font-semibold ${tone}`}>{value}</span>
    </div>
  );
}

function createStorageItems(prefix: string, names: string[], category: string): StorageItem[] {
  return names.map((name, index) => ({
    id: `${prefix}-${index + 1}`,
    name,
    category,
    status: 'Stored',
  }));
}

function findStorageSpot(nodes: StorageNodeData[], id: string): StorageNodeData | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    const childMatch = findStorageSpot(node.children || [], id);
    if (childMatch) return childMatch;
  }
  return undefined;
}

function getSpotItems(node: StorageNodeData): StorageItem[] {
  const directItems = mockItemsBySpot[node.id];
  if (directItems) return directItems;
  return (node.children || []).flatMap((child) => getSpotItems(child));
}

function addChildToSpot(
  nodes: StorageNodeData[],
  parentId: string,
  child: StorageNodeData,
): StorageNodeData[] {
  return nodes.map((node) => {
    if (node.id === parentId) {
      return { ...node, children: [...(node.children || []), child] };
    }
    return node.children
      ? { ...node, children: addChildToSpot(node.children, parentId, child) }
      : node;
  });
}

function flattenStorageSpots(
  nodes: StorageNodeData[],
  depth = 0,
): Array<{ id: string; label: string }> {
  return nodes.flatMap((node) => [
    { id: node.id, label: `${'— '.repeat(depth)}${node.name}` },
    ...flattenStorageSpots(node.children || [], depth + 1),
  ]);
}

function findParentId(nodes: StorageNodeData[], childId: string): string | undefined {
  for (const node of nodes) {
    if (node.children?.some((child) => child.id === childId)) return node.id;
    const nestedParent = findParentId(node.children || [], childId);
    if (nestedParent) return nestedParent;
  }
  return undefined;
}

function isDescendant(nodes: StorageNodeData[], ancestorId: string, candidateId: string): boolean {
  const ancestor = findStorageSpot(nodes, ancestorId);
  return Boolean(ancestor?.children && findStorageSpot(ancestor.children, candidateId));
}

function moveStorageSpot(
  nodes: StorageNodeData[],
  spotId: string,
  parentId: string,
): StorageNodeData[] {
  const result = removeStorageSpot(nodes, spotId);
  if (!result.removed) return nodes;
  if (!parentId) return [...result.nodes, result.removed];
  if (!findStorageSpot(result.nodes, parentId)) return nodes;
  return addChildToSpot(result.nodes, parentId, result.removed);
}

function removeStorageSpot(
  nodes: StorageNodeData[],
  spotId: string,
): { nodes: StorageNodeData[]; removed?: StorageNodeData } {
  const remaining: StorageNodeData[] = [];

  for (const node of nodes) {
    if (node.id === spotId) {
      return { nodes: [...remaining, ...nodes.slice(nodes.indexOf(node) + 1)], removed: node };
    }

    if (node.children) {
      const result = removeStorageSpot(node.children, spotId);
      if (result.removed) {
        remaining.push({ ...node, children: result.nodes });
        const currentIndex = nodes.indexOf(node);
        return {
          nodes: [...remaining, ...nodes.slice(currentIndex + 1)],
          removed: result.removed,
        };
      }
    }

    remaining.push(node);
  }

  return { nodes: remaining };
}

function countSpots(nodes: StorageNodeData[]): number {
  return nodes.reduce((count, node) => count + 1 + countSpots(node.children || []), 0);
}

function filterStorageSpots(nodes: StorageNodeData[], query: string): StorageNodeData[] {
  return nodes.reduce<StorageNodeData[]>((matches, node) => {
    const matchingChildren = filterStorageSpots(node.children || [], query);
    if (node.name.toLowerCase().includes(query) || matchingChildren.length > 0) {
      matches.push({ ...node, children: matchingChildren });
    }
    return matches;
  }, []);
}
