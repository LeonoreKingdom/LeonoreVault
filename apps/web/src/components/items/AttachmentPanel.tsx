'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { apiGet, apiUpload, apiDelete } from '@/lib/api';
import {
  Upload,
  X,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  Trash2,
  Loader2,
  Paperclip,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────

interface Attachment {
  id: string;
  itemId: string;
  driveFileId: string;
  fileName: string;
  mimeType: string;
  thumbnailUrl: string | null;
  webViewLink: string | null;
  createdBy: string;
  createdAt: string;
}

interface AttachmentPanelProps {
  householdId: string;
  itemId: string;
  editable?: boolean;
}

const ACCEPTED = '.jpg,.jpeg,.png,.pdf,.docx';
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

// ─── Component ──────────────────────────────────────────────

export default function AttachmentPanel({
  householdId,
  itemId,
  editable = true,
}: AttachmentPanelProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const basePath = `/api/households/${householdId}/items/${itemId}/attachments`;

  // ─── Fetch ──────────────────────────────────────────────

  const fetchAttachments = useCallback(async () => {
    try {
      const data = await apiGet<Attachment[]>(basePath);
      setAttachments(data);
    } catch {
      setError('Failed to load attachments');
    } finally {
      setLoading(false);
    }
  }, [basePath]);

  useEffect(() => {
    fetchAttachments();
  }, [fetchAttachments]);

  // ─── Upload ─────────────────────────────────────────────

  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const oversized = fileArray.find((f) => f.size > MAX_FILE_SIZE);
    if (oversized) {
      setError(`File "${oversized.name}" exceeds 2 MB limit`);
      return;
    }

    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      const formData = new FormData();
      fileArray.forEach((f) => formData.append('files', f));

      const result = await apiUpload<Attachment[]>(`${basePath}/upload`, formData, (p) =>
        setProgress(p),
      );
      setAttachments((prev) => [...result, ...prev]);
      setProgress(100);
    } catch (err) {
      setError((err as Error).message || 'Upload failed');
    } finally {
      setTimeout(() => {
        setUploading(false);
        setProgress(0);
      }, 600);
    }
  };

  // ─── Delete ─────────────────────────────────────────────

  const handleDelete = async (attachmentId: string) => {
    try {
      await apiDelete(`${basePath}/${attachmentId}`);
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
      setDeleteId(null);
    } catch (err) {
      setError((err as Error).message || 'Delete failed');
    }
  };

  // ─── Drag & Drop ───────────────────────────────────────

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.length) {
      handleFiles(e.dataTransfer.files);
    }
  };

  // ─── Helpers ────────────────────────────────────────────

  const isImage = (mime: string) => mime.startsWith('image/');

  const getFileIcon = (mime: string) => {
    if (isImage(mime)) return <ImageIcon size={20} className="text-blue-400" />;
    return <FileText size={20} className="text-amber-400" />;
  };

  // ─── Render ─────────────────────────────────────────────

  return (
    <div className="border-border bg-surface rounded-2xl border p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Paperclip size={20} />
          Attachments
          {attachments.length > 0 && (
            <span className="bg-primary/10 text-primary rounded-full px-2.5 py-0.5 text-xs font-medium">
              {attachments.length}
            </span>
          )}
        </h2>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-danger/10 text-danger mb-4 flex items-center justify-between rounded-xl px-4 py-2.5 text-sm">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="hover:opacity-70">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Upload Zone */}
      {editable && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`mb-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 transition-all ${
            dragActive
              ? 'border-primary bg-primary/5 scale-[1.01]'
              : 'border-border hover:border-primary/40 hover:bg-hover'
          }`}
        >
          <Upload size={28} className={`mb-2 ${dragActive ? 'text-primary' : 'text-muted'}`} />
          <p className="text-sm font-medium">
            {uploading ? 'Uploading...' : 'Drop files here or click to browse'}
          </p>
          <p className="text-muted mt-1 text-xs">JPEG, PNG, PDF, DOCX — Max 2 MB each</p>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED}
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
        </div>
      )}

      {/* Progress Bar */}
      {uploading && (
        <div className="mb-4">
          <div className="bg-border h-2 overflow-hidden rounded-full">
            <div
              className="from-primary to-accent bg-linear-to-r h-full rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-muted mt-1 text-center text-xs">{progress}%</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-6">
          <Loader2 size={24} className="text-primary animate-spin" />
        </div>
      )}

      {/* Attachment List */}
      {!loading && attachments.length === 0 && (
        <p className="text-muted py-4 text-center text-sm">No attachments yet</p>
      )}

      {!loading && attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="border-border hover:bg-hover group flex items-center gap-3 rounded-xl border p-3 transition-colors"
            >
              {/* Thumbnail / Icon */}
              {isImage(att.mimeType) && att.thumbnailUrl ? (
                <div className="bg-background flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg">
                  <img
                    src={att.thumbnailUrl}
                    alt={att.fileName}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="bg-background flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg">
                  {getFileIcon(att.mimeType)}
                </div>
              )}

              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{att.fileName}</p>
                <p className="text-muted text-xs">
                  {new Date(att.createdAt).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                {att.webViewLink && (
                  <a
                    href={att.webViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted hover:text-primary rounded-lg p-2 transition-colors"
                    title="View / Download"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink size={16} />
                  </a>
                )}
                {editable && (
                  <>
                    {deleteId === att.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(att.id)}
                          className="text-danger hover:bg-danger/10 rounded-lg p-2 text-xs font-medium transition-colors"
                          title="Confirm delete"
                        >
                          <Trash2 size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteId(null)}
                          className="text-muted hover:bg-hover rounded-lg p-2 text-xs transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteId(att.id)}
                        className="text-muted hover:text-danger rounded-lg p-2 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
