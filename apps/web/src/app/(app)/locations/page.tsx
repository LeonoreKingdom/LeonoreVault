'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import {
  MapPin,
  Plus,
  Edit3,
  Trash2,
  ChevronRight,
  ChevronDown,
  X,
  Loader2,
  Building2,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────

interface Location {
  id: string;
  householdId: string;
  name: string;
  parentId: string | null;
  description: string | null;
  sortOrder: number;
  children: Location[];
}

interface FormData {
  name: string;
  parentId: string | null;
  description: string;
}

// ─── Component ──────────────────────────────────────────────

export default function LocationsPage() {
  const { membership } = useAuthStore();
  const householdId = membership?.householdId;

  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    parentId: null,
    description: '',
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Fetch locations
  const fetchLocations = useCallback(async () => {
    if (!householdId) return;
    try {
      setLoading(true);
      const data = await apiGet<{ tree: Location[] }>(`/api/households/${householdId}/locations`);
      setLocations(data.tree);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load locations');
    } finally {
      setLoading(false);
    }
  }, [householdId]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  // Flatten tree for parent dropdown
  const flattenForSelect = useCallback(
    (
      nodes: Location[],
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

  const openCreate = (parentId: string | null = null) => {
    setEditingId(null);
    setFormData({ name: '', parentId, description: '' });
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (loc: Location) => {
    setEditingId(loc.id);
    setFormData({
      name: loc.name,
      parentId: loc.parentId,
      description: loc.description || '',
    });
    setFormError('');
    setShowModal(true);
  };

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
        description: formData.description.trim() || undefined,
      };

      if (editingId) {
        await apiPatch(`/api/households/${householdId}/locations/${editingId}`, payload);
      } else {
        await apiPost(`/api/households/${householdId}/locations`, payload);
      }
      setShowModal(false);
      await fetchLocations();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!householdId) return;
    try {
      await apiDelete(`/api/households/${householdId}/locations/${id}`);
      setDeleteConfirm(null);
      await fetchLocations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  if (!membership) {
    return (
      <div className="border-border bg-surface flex flex-col items-center justify-center rounded-2xl border px-6 py-16 text-center">
        <MapPin size={48} className="text-muted-light mb-4" />
        <h2 className="mb-2 text-xl font-bold">No Household</h2>
        <p className="text-muted max-w-md">Join or create a household to manage locations.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Locations</h1>
          <p className="text-muted mt-1">Track where your items are stored</p>
        </div>
        <button
          onClick={() => openCreate()}
          className="from-primary to-accent bg-linear-to-r flex items-center gap-2 self-start rounded-xl px-5 py-2.5 text-sm font-medium text-white shadow-md transition-opacity hover:opacity-90"
        >
          <Plus size={18} />
          Add Location
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
      {!loading && locations.length > 0 && (
        <div className="border-border bg-surface divide-border divide-y rounded-2xl border">
          {locations.map((loc) => (
            <LocationNode
              key={loc.id}
              location={loc}
              depth={0}
              onEdit={openEdit}
              onDelete={(id) => setDeleteConfirm(id)}
              onAddChild={(parentId) => openCreate(parentId)}
            />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && locations.length === 0 && (
        <div className="border-border bg-surface flex flex-col items-center justify-center rounded-2xl border px-6 py-16 text-center">
          <div className="from-primary/20 to-accent/20 bg-linear-to-br mb-5 flex h-16 w-16 items-center justify-center rounded-2xl">
            <Building2 size={32} className="text-primary" />
          </div>
          <h2 className="mb-2 text-xl font-bold">No Locations Yet</h2>
          <p className="text-muted mb-6 max-w-md">
            Create locations like rooms, shelves, or storage areas to organize where things are
            kept.
          </p>
          <button
            onClick={() => openCreate()}
            className="from-primary to-accent bg-linear-to-r rounded-xl px-5 py-2.5 font-medium text-white shadow-md transition-opacity hover:opacity-90"
          >
            Create First Location
          </button>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface border-border w-full max-w-md space-y-4 rounded-2xl border p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{editingId ? 'Edit Location' : 'New Location'}</h2>
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
                placeholder="e.g. Living Room"
                maxLength={100}
                className="border-border bg-background focus:ring-primary/40 focus:border-primary w-full rounded-xl border px-4 py-2.5 transition-all focus:outline-none focus:ring-2"
                autoFocus
              />
            </div>

            {/* Parent */}
            <div>
              <label className="mb-1.5 block text-sm font-medium">Parent Location</label>
              <select
                value={formData.parentId || ''}
                onChange={(e) => setFormData({ ...formData, parentId: e.target.value || null })}
                className="border-border bg-background focus:ring-primary/40 focus:border-primary w-full rounded-xl border px-4 py-2.5 transition-all focus:outline-none focus:ring-2"
              >
                <option value="">None (top-level)</option>
                {flattenForSelect(locations, 0, editingId || undefined).map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {'─'.repeat(opt.depth)} {opt.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="mb-1.5 block text-sm font-medium">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional notes about this location"
                rows={2}
                maxLength={500}
                className="border-border bg-background focus:ring-primary/40 focus:border-primary w-full resize-none rounded-xl border px-4 py-2.5 transition-all focus:outline-none focus:ring-2"
              />
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

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface border-border w-full max-w-sm space-y-4 rounded-2xl border p-6 shadow-xl">
            <h2 className="text-lg font-bold">Delete Location?</h2>
            <p className="text-muted text-sm">
              This will also delete all sub-locations. Items stored here will become unassigned.
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

function LocationNode({
  location,
  depth,
  onEdit,
  onDelete,
  onAddChild,
}: {
  location: Location;
  depth: number;
  onEdit: (loc: Location) => void;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = location.children.length > 0;

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

        {/* Icon */}
        <div className="bg-accent/10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
          <MapPin size={16} className="text-accent" />
        </div>

        {/* Name + Description */}
        <div className="min-w-0 flex-1">
          <span className="block truncate font-medium">{location.name}</span>
          {location.description && (
            <span className="text-muted block truncate text-xs">{location.description}</span>
          )}
        </div>

        {/* Children count */}
        {hasChildren && <span className="text-muted text-xs">{location.children.length} sub</span>}

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {depth < 2 && (
            <button
              onClick={() => onAddChild(location.id)}
              className="text-muted hover:text-primary rounded-lg p-1.5 transition-colors"
              title="Add sub-location"
            >
              <Plus size={16} />
            </button>
          )}
          <button
            onClick={() => onEdit(location)}
            className="text-muted hover:text-primary rounded-lg p-1.5 transition-colors"
            title="Edit"
          >
            <Edit3 size={16} />
          </button>
          <button
            onClick={() => onDelete(location.id)}
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
        location.children.map((child) => (
          <LocationNode
            key={child.id}
            location={child}
            depth={depth + 1}
            onEdit={onEdit}
            onDelete={onDelete}
            onAddChild={onAddChild}
          />
        ))}
    </div>
  );
}
