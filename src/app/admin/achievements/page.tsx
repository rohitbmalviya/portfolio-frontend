'use client';

// ============================================================
//  Admin Achievements — list, reorder, delete
//  Create / edit are handled by /admin/achievements/[id]
// ============================================================

import { useEffect, useState } from 'react';
import { Plus, Trophy, ChevronUp, ChevronDown, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { adminAchievements } from '@/lib/admin-api';
import type { Achievement } from '@/lib/types';
import { AdminShell } from '@/components/admin/admin-shell';
import { ToastProvider, useToast } from '@/components/admin/toast';
import {
  AdminButton,
  AdminCard,
  ConfirmDialog,
  LoadingRows,
  EmptyState,
} from '@/components/admin/ui';

function AchievementsContent() {
  const { success, error: toastError } = useToast();
  const [items, setItems] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Achievement | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setLoading(true);
    adminAchievements
      .list()
      .then((data) => setItems([...data].sort((a, b) => a.order - b.order)))
      .catch((err) => toastError(err instanceof Error ? err.message : 'Failed to load.'))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function move(index: number, dir: -1 | 1) {
    const next = [...items];
    const t = index + dir;
    if (t < 0 || t >= next.length) return;
    [next[index], next[t]] = [next[t], next[index]];
    const reindexed = next.map((x, i) => ({ ...x, order: i }));
    setItems(reindexed);
    try {
      await adminAchievements.reorder(reindexed.map((x) => ({ id: x.id, order: x.order })));
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Reorder failed.');
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminAchievements.delete(deleteTarget.id);
      setItems((p) => p.filter((x) => x.id !== deleteTarget.id));
      setDeleteTarget(null);
      success('Achievement deleted.');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Delete failed.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AdminShell
      title="Achievements"
      description="Awards, milestones, and recognitions."
      actions={
        <Link href="/admin/achievements/new">
          <AdminButton>
            <Plus size={14} aria-hidden="true" /> Add achievement
          </AdminButton>
        </Link>
      }
    >
      {loading ? (
        <LoadingRows />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Trophy size={20} />}
          title="No achievements yet"
          action={
            <Link href="/admin/achievements/new">
              <AdminButton>
                <Plus size={14} /> Add first entry
              </AdminButton>
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item, index) => (
            <AdminCard key={item.id} className="flex items-start gap-3">
              {/* Reorder arrows */}
              <div className="flex flex-col gap-0.5 shrink-0 mt-1">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  className="disabled:opacity-30"
                  aria-label="Move up"
                  style={{ color: 'var(--muted)' }}
                >
                  <ChevronUp size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === items.length - 1}
                  className="disabled:opacity-30"
                  aria-label="Move down"
                  style={{ color: 'var(--muted)' }}
                >
                  <ChevronDown size={13} />
                </button>
              </div>


              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[14px] font-medium" style={{ color: 'var(--text)' }}>
                    {item.title}
                  </span>
                  {item.date && (
                    <span className="text-[12px] font-mono" style={{ color: 'var(--muted)' }}>
                      {new Date(item.date).getFullYear()}
                    </span>
                  )}
                </div>
                {item.description && (
                  <p className="text-[12px] mt-1 line-clamp-2" style={{ color: 'var(--muted)' }}>
                    {item.description}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-1.5 shrink-0">
                <Link href={`/admin/achievements/${item.id}`}>
                  <AdminButton variant="ghost" size="sm">
                    <Pencil size={13} aria-hidden="true" /> Edit
                  </AdminButton>
                </Link>
                <AdminButton
                  variant="danger"
                  size="sm"
                  onClick={() => setDeleteTarget(item)}
                >
                  <Trash2 size={13} aria-hidden="true" /> Delete
                </AdminButton>
              </div>
            </AdminCard>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete achievement"
        description={`Delete "${deleteTarget?.title}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </AdminShell>
  );
}

export default function AdminAchievementsPage() {
  return (
    <ToastProvider>
      <AchievementsContent />
    </ToastProvider>
  );
}
