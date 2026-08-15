'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  FolderTree,
  Grid2X2,
  Package,
  Sparkles,
  Tag,
} from 'lucide-react';

type CategoryTone = 'primary' | 'success' | 'warning' | 'accent';

type CategoryNodeData = {
  id: string;
  name: string;
  description: string;
  itemCount: number;
  tone: CategoryTone;
  children?: CategoryNodeData[];
};

const categoryToneStyles: Record<CategoryTone, { surface: string; text: string }> = {
  primary: { surface: 'bg-primary/10', text: 'text-primary' },
  success: { surface: 'bg-success/10', text: 'text-success' },
  warning: { surface: 'bg-warning/10', text: 'text-warning' },
  accent: { surface: 'bg-accent/10', text: 'text-accent' },
};

const mockCategories: CategoryNodeData[] = [
  {
    id: 'home-maintenance',
    name: 'Home & maintenance',
    description: 'Tools, supplies, and things that keep the household running.',
    itemCount: 12,
    tone: 'accent',
    children: [
      {
        id: 'tools',
        name: 'Tools',
        description: 'Hand tools and equipment for repairs.',
        itemCount: 7,
        tone: 'accent',
      },
      {
        id: 'cleaning',
        name: 'Cleaning',
        description: 'Supplies for keeping rooms fresh and tidy.',
        itemCount: 3,
        tone: 'accent',
      },
      {
        id: 'hardware',
        name: 'Hardware',
        description: 'Small fixings and spare parts.',
        itemCount: 2,
        tone: 'accent',
      },
    ],
  },
  {
    id: 'kitchen-dining',
    name: 'Kitchen & dining',
    description: 'Everyday food, cookware, and serving essentials.',
    itemCount: 8,
    tone: 'warning',
    children: [
      {
        id: 'pantry',
        name: 'Pantry',
        description: 'Ingredients and shelf-stable kitchen items.',
        itemCount: 5,
        tone: 'warning',
      },
      {
        id: 'cookware',
        name: 'Cookware',
        description: 'Pots, pans, and tools used while cooking.',
        itemCount: 3,
        tone: 'warning',
      },
    ],
  },
  {
    id: 'recreation',
    name: 'Recreation',
    description: 'Things we use for relaxing, playing, and sharing time together.',
    itemCount: 6,
    tone: 'primary',
    children: [
      {
        id: 'board-games',
        name: 'Board games',
        description: 'Games for family evenings and visiting friends.',
        itemCount: 6,
        tone: 'primary',
      },
    ],
  },
  {
    id: 'documents',
    name: 'Documents',
    description: 'Important papers and personal records.',
    itemCount: 4,
    tone: 'success',
  },
];

export default function CategoriesPage() {
  const [selectedCategoryId, setSelectedCategoryId] = useState('home-maintenance');
  const selectedCategory = findCategory(mockCategories, selectedCategoryId) || mockCategories[0];
  const totalCategories = countCategories(mockCategories);
  const totalItems = mockCategories.reduce((total, category) => total + category.itemCount, 0);
  const leafCount = countLeaves(mockCategories);

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-accent mb-2 flex items-center gap-2 text-sm font-semibold">
            <Sparkles size={16} />
            <span>Our Home</span>
            <span className="text-muted-light">/</span>
            <span className="text-muted font-normal">Categories</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            A place for every kind of thing
          </h1>
          <p className="text-muted mt-1">
            Keep your inventory meaningful without making it complicated.
          </p>
        </div>
        <div className="bg-success/10 text-success inline-flex items-center gap-2 self-start rounded-xl px-3.5 py-2.5 text-sm font-semibold sm:self-auto">
          <span className="bg-success h-2 w-2 rounded-full" />
          Category map up to date
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Category summary">
        <SummaryCard
          icon={FolderTree}
          label="Categories"
          value={totalCategories}
          detail="across your home"
          tone="accent"
        />
        <SummaryCard
          icon={Package}
          label="Organized items"
          value={totalItems}
          detail="with a category"
          tone="primary"
        />
        <SummaryCard
          icon={Grid2X2}
          label="Top-level groups"
          value={mockCategories.length}
          detail="easy starting points"
          tone="success"
        />
        <SummaryCard
          icon={Tag}
          label="Leaf categories"
          value={leafCount}
          detail="ready to assign"
          tone="warning"
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0 space-y-4" aria-labelledby="category-tree-heading">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 id="category-tree-heading" className="text-lg font-bold">
                Category structure
              </h2>
              <p className="text-muted mt-0.5 text-sm">Expand a group to see its sub-categories.</p>
            </div>
            <span className="text-muted text-xs font-medium">{mockCategories.length} groups</span>
          </div>

          <div className="border-border bg-surface divide-border divide-y overflow-hidden rounded-2xl border shadow-sm">
            {mockCategories.map((category) => (
              <CategoryNode
                key={category.id}
                node={category}
                selectedCategoryId={selectedCategoryId}
                onSelect={setSelectedCategoryId}
              />
            ))}
          </div>
        </section>

        <aside className="space-y-6" aria-label="Category details">
          <CategoryDetailCard category={selectedCategory} onSelect={setSelectedCategoryId} />

          <section
            className="border-border bg-surface rounded-2xl border p-5 shadow-sm"
            aria-labelledby="category-tip-heading"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 id="category-tip-heading" className="font-bold">
                  Quick tip
                </h2>
                <p className="text-muted mt-0.5 text-sm">Keep the tree easy to scan.</p>
              </div>
              <ArrowUpRight size={17} className="text-muted-light" />
            </div>
            <p className="text-muted text-sm leading-relaxed">
              Use broad groups for rooms or routines, then add a child only when it makes finding
              something faster.
            </p>
            <Link
              href="/items"
              className="text-primary mt-4 inline-flex items-center gap-1.5 text-xs font-semibold"
            >
              Review categorized items
              <ArrowUpRight size={14} />
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}

function CategoryNode({
  node,
  selectedCategoryId,
  onSelect,
}: {
  node: CategoryNodeData;
  selectedCategoryId: string;
  onSelect: (categoryId: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = Boolean(node.children?.length);
  const selected = node.id === selectedCategoryId;

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
        className={`hover:bg-hover/60 flex cursor-pointer items-center gap-3 px-3 py-3.5 transition-colors sm:px-5 ${
          selected ? 'bg-primary/5 inset-ring-1 ring-primary/20' : ''
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
          className={`${categoryToneStyles[node.tone].surface} ${categoryToneStyles[node.tone].text} flex h-10 w-10 shrink-0 items-center justify-center rounded-xl`}
        >
          <Tag size={19} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-semibold">{node.name}</h3>
            {hasChildren && (
              <span className="text-muted-light text-[10px] font-medium uppercase tracking-wide">
                {node.children?.length} sub-categories
              </span>
            )}
          </div>
          <p className="text-muted mt-1 truncate text-xs">{node.description}</p>
        </div>
        <div className="text-muted-light hidden items-center gap-1 rounded-lg p-1.5 sm:flex">
          <Package size={15} />
          <span className="text-xs">{node.itemCount}</span>
        </div>
      </div>

      {expanded && hasChildren && (
        <div className="border-border/70 ml-9 border-l sm:ml-[4.45rem]">
          {node.children?.map((child) => (
            <CategoryNode
              key={child.id}
              node={child}
              selectedCategoryId={selectedCategoryId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryDetailCard({
  category,
  onSelect,
}: {
  category: CategoryNodeData;
  onSelect: (categoryId: string) => void;
}) {
  return (
    <section
      className="border-border bg-surface rounded-2xl border p-5 shadow-sm"
      aria-labelledby="category-detail-heading"
    >
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`${categoryToneStyles[category.tone].surface} ${categoryToneStyles[category.tone].text} flex h-11 w-11 shrink-0 items-center justify-center rounded-xl`}
          >
            <Tag size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-muted text-xs font-medium uppercase tracking-wide">
              Selected category
            </p>
            <h2 id="category-detail-heading" className="truncate font-bold">
              {category.name}
            </h2>
          </div>
        </div>
        <span className="text-primary shrink-0 text-sm font-bold">{category.itemCount} items</span>
      </div>

      <p className="text-muted bg-background rounded-xl p-3 text-sm leading-relaxed">
        {category.description}
      </p>

      <div className="border-border mt-5 border-t pt-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold">Sub-categories</h3>
          <span className="text-muted text-xs">{category.children?.length || 0}</span>
        </div>
        {category.children && category.children.length > 0 ? (
          <div className="space-y-1">
            {category.children.map((child) => (
              <button
                key={child.id}
                type="button"
                onClick={() => onSelect(child.id)}
                className="hover:bg-hover flex w-full items-center gap-2 rounded-xl p-2 text-left transition-colors"
              >
                <Tag size={15} className={categoryToneStyles[child.tone].text} />
                <span className="min-w-0 flex-1 truncate text-xs font-medium">{child.name}</span>
                <span className="text-muted shrink-0 text-[11px]">{child.itemCount} items</span>
                <ChevronRight size={14} className="text-muted-light" />
              </button>
            ))}
          </div>
        ) : (
          <p className="text-muted bg-background rounded-xl p-3 text-xs">
            This is a leaf category ready for direct item assignment.
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
  icon: typeof FolderTree;
  label: string;
  value: number;
  detail: string;
  tone: CategoryTone;
}) {
  return (
    <div className="border-border bg-surface min-w-0 rounded-2xl border p-4 shadow-sm sm:p-5">
      <div
        className={`mb-4 flex h-9 w-9 items-center justify-center rounded-xl ${categoryToneStyles[tone].surface} ${categoryToneStyles[tone].text}`}
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

function findCategory(nodes: CategoryNodeData[], id: string): CategoryNodeData | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    const match = findCategory(node.children || [], id);
    if (match) return match;
  }
  return undefined;
}

function countCategories(nodes: CategoryNodeData[]): number {
  return nodes.reduce((count, node) => count + 1 + countCategories(node.children || []), 0);
}

function countLeaves(nodes: CategoryNodeData[]): number {
  return nodes.reduce(
    (count, node) => count + (node.children?.length ? countLeaves(node.children) : 1),
    0,
  );
}
