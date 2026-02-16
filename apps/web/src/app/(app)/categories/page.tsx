'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import {
  Tag,
  Plus,
  Edit3,
  Trash2,
  ChevronRight,
  ChevronDown,
  X,
  Loader2,
  FolderTree,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────

interface Category {
  id: string;
  householdId: string;
  name: string;
  parentId: string | null;
  icon: string | null;
  color: string | null;
  sortOrder: number;
  children: Category[];
}

interface FormData {
  name: string;
  parentId: string | null;
  icon: string;
  color: string;
}

const PRESET_COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#a855f7',
  '#ec4899',
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
  '#06b6d4',
  '#3b82f6',
  '#64748b',
];

// ─── Component ──────────────────────────────────────────────

export default function CategoriesPage() {
  const { membership } = useAuthStore();
  const householdId = membership?.householdId;

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    parentId: null,
    icon: '',
    color: '#6366f1',
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    if (!householdId) return;
    try {
      setLoading(true);
      const data = await apiGet<{ tree: Category[] }>(`/api/households/${householdId}/categories`);
      setCategories(data.tree);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, [householdId]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Flatten tree for parent dropdown (exclude self and children)
  const flattenForSelect = useCallback(
    (
      nodes: Category[],
      depth = 0,
      excludeId?: string,
    ): { id: string; name: string; depth: number }[] => {
      const result: { id: string; name: string; depth: number }[] = [];
      for (const node of nodes) {
        if (node.id === excludeId) continue;
        result.push({ id: node.id, name: node.name, depth });
        if (node.children.length > 0) {
          result.push(...flattenForSelect(node.children, depth + 1, excludeId));
        }
      }
      return result;
    },
    [],
  );

  // Open modal
  const openCreate = (parentId: string | null = null) => {
    setEditingId(null);
    setFormData({ name: '', parentId, icon: '', color: '#6366f1' });
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (cat: Category) => {
    setEditingId(cat.id);
    setFormData({
      name: cat.name,
      parentId: cat.parentId,
      icon: cat.icon || '',
      color: cat.color || '#6366f1',
    });
    setFormError('');
    setShowModal(true);
  };

  // Save
  const handleSave = async () => {
    if (!formData.name.trim()) {
      setFormError('Name is required');
      return;
    }
    if (!householdId) return;
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        name: formData.name.trim(),
        parent_id: formData.parentId || undefined,
        icon: formData.icon || undefined,
        color: formData.color || undefined,
      };

      if (editingId) {
        await apiPatch(`/api/households/${householdId}/categories/${editingId}`, payload);
      } else {
        await apiPost(`/api/households/${householdId}/categories`, payload);
      }
      setShowModal(false);
      await fetchCategories();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // Delete
  const handleDelete = async (id: string) => {
    if (!householdId) return;
    try {
      await apiDelete(`/api/households/${householdId}/categories/${id}`);
      setDeleteConfirm(null);
      await fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  if (!membership) {
    return (
      <div className="border-border bg-surface flex flex-col items-center justify-center rounded-2xl border px-6 py-16 text-center">
        <Tag size={48} className="text-muted-light mb-4" />
        <h2 className="mb-2 text-xl font-bold">No Household</h2>
        <p className="text-muted max-w-md">Join or create a household to manage categories.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Categories</h1>
          <p className="text-muted mt-1">Organize your items with hierarchical categories</p>
        </div>
        <button
          onClick={() => openCreate()}
          className="from-primary to-accent bg-linear-to-r flex items-center gap-2 self-start rounded-xl px-5 py-2.5 text-sm font-medium text-white shadow-md transition-opacity hover:opacity-90"
        >
          <Plus size={18} />
          Add Category
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-danger/10 text-danger rounded-xl px-4 py-3 text-sm">{error}</div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={32} className="text-primary animate-spin" />
        </div>
      )}

      {/* Tree */}
      {!loading && categories.length > 0 && (
        <div className="border-border bg-surface divide-border divide-y rounded-2xl border">
          {categories.map((cat) => (
            <CategoryNode
              key={cat.id}
              category={cat}
              depth={0}
              onEdit={openEdit}
              onDelete={(id) => setDeleteConfirm(id)}
              onAddChild={(parentId) => openCreate(parentId)}
            />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && categories.length === 0 && (
        <div className="border-border bg-surface flex flex-col items-center justify-center rounded-2xl border px-6 py-16 text-center">
          <div className="from-primary/20 to-accent/20 bg-linear-to-br mb-5 flex h-16 w-16 items-center justify-center rounded-2xl">
            <FolderTree size={32} className="text-primary" />
          </div>
          <h2 className="mb-2 text-xl font-bold">No Categories Yet</h2>
          <p className="text-muted mb-6 max-w-md">
            Create categories to organize your inventory items.
          </p>
          <button
            onClick={() => openCreate()}
            className="from-primary to-accent bg-linear-to-r rounded-xl px-5 py-2.5 font-medium text-white shadow-md transition-opacity hover:opacity-90"
          >
            Create First Category
          </button>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface border-border w-full max-w-md space-y-4 rounded-2xl border p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{editingId ? 'Edit Category' : 'New Category'}</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-muted hover:text-foreground rounded-lg p-1 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Name */}
            <div>
              <label className="mb-1.5 block text-sm font-medium">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Electronics"
                maxLength={50}
                className="border-border bg-background focus:ring-primary/40 focus:border-primary w-full rounded-xl border px-4 py-2.5 transition-all focus:outline-none focus:ring-2"
                autoFocus
              />
            </div>

            {/* Parent */}
            <div>
              <label className="mb-1.5 block text-sm font-medium">Parent Category</label>
              <select
                value={formData.parentId || ''}
                onChange={(e) => setFormData({ ...formData, parentId: e.target.value || null })}
                className="border-border bg-background focus:ring-primary/40 focus:border-primary w-full rounded-xl border px-4 py-2.5 transition-all focus:outline-none focus:ring-2"
              >
                <option value="">None (top-level)</option>
                {flattenForSelect(categories, 0, editingId || undefined).map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {'─'.repeat(opt.depth)} {opt.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Color */}
            <div>
              <label className="mb-1.5 block text-sm font-medium">Color</label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setFormData({ ...formData, color: c })}
                    className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${
                      formData.color === c ? 'border-foreground scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {formError && <p className="text-danger text-sm">{formError}</p>}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowModal(false)}
                className="border-border hover:bg-hover flex-1 rounded-xl border px-4 py-2.5 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="from-primary to-accent bg-linear-to-r flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface border-border w-full max-w-sm space-y-4 rounded-2xl border p-6 shadow-xl">
            <h2 className="text-lg font-bold">Delete Category?</h2>
            <p className="text-muted text-sm">
              This will also delete all sub-categories. Items in these categories will become
              uncategorized.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="border-border hover:bg-hover flex-1 rounded-xl border px-4 py-2.5 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="bg-danger flex-1 rounded-xl px-4 py-2.5 font-medium text-white transition-opacity hover:opacity-90"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tree Node Component ────────────────────────────────────

function CategoryNode({
  category,
  depth,
  onEdit,
  onDelete,
  onAddChild,
}: {
  category: Category;
  depth: number;
  onEdit: (cat: Category) => void;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = category.children.length > 0;

  return (
    <div>
      <div
        className="hover:bg-hover group flex items-center gap-3 px-4 py-3 transition-colors"
        style={{ paddingLeft: `${depth * 24 + 16}px` }}
      >
        {/* Expand/Collapse */}
        <button
          onClick={() => setExpanded(!expanded)}
          className={`text-muted flex h-6 w-6 shrink-0 items-center justify-center rounded transition-colors ${
            hasChildren ? 'hover:bg-border cursor-pointer' : 'invisible'
          }`}
        >
          {hasChildren && (expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
        </button>

        {/* Color dot */}
        <div
          className="h-3 w-3 shrink-0 rounded-full"
          style={{ backgroundColor: category.color || '#64748b' }}
        />

        {/* Name */}
        <span className="flex-1 truncate font-medium">{category.name}</span>

        {/* Item count hint */}
        {hasChildren && <span className="text-muted text-xs">{category.children.length} sub</span>}

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {depth < 2 && (
            <button
              onClick={() => onAddChild(category.id)}
              className="text-muted hover:text-primary rounded-lg p-1.5 transition-colors"
              title="Add sub-category"
            >
              <Plus size={16} />
            </button>
          )}
          <button
            onClick={() => onEdit(category)}
            className="text-muted hover:text-primary rounded-lg p-1.5 transition-colors"
            title="Edit"
          >
            <Edit3 size={16} />
          </button>
          <button
            onClick={() => onDelete(category.id)}
            className="text-muted hover:text-danger rounded-lg p-1.5 transition-colors"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Children */}
      {expanded &&
        hasChildren &&
        category.children.map((child) => (
          <CategoryNode
            key={child.id}
            category={child}
            depth={depth + 1}
            onEdit={onEdit}
            onDelete={onDelete}
            onAddChild={onAddChild}
          />
        ))}
    </div>
  );
}
