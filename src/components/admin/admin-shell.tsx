'use client';

// ============================================================
//  AdminShell — page wrapper inside the admin layout.
//  Provides a consistent header + scrollable content area.
//  Each page wraps with its own ToastProvider so hooks work.
//
//  The header always includes a notification bell (far right)
//  that polls adminContact.unreadCount() every 60 s and links
//  to /admin/messages.
// ============================================================

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { adminContact } from '@/lib/admin-api';

interface Props {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function AdminShell({ title, description, actions, children }: Props) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    function fetchCount() {
      adminContact
        .unreadCount()
        .then((res) => setUnreadCount(res.count))
        .catch(() => {
          // Non-critical; swallow silently.
        });
    }

    fetchCount();
    const interval = setInterval(fetchCount, 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    // min-h-full, NOT min-h-screen: this renders inside app/admin/layout.tsx's
    // <main>, which is already exactly 100vh with overflow-y-auto. Demanding a
    // second viewport height in there pushed the shell past its parent by the
    // height of the sticky header alone, so <main> showed a scrollbar before
    // any content existed — giving two visible scrollbars.
    <div className="flex flex-col min-h-full">
      {/* Page header */}
      <header
        className="sticky top-0 z-10 flex items-center justify-between gap-4 px-6 py-4 border-b"
        style={{
          backgroundColor: 'var(--surface)',
          borderColor: 'var(--border)',
        }}
      >
        {/* Left: title + description */}
        <div>
          <h1
            className="text-[20px] font-semibold tracking-tight"
            style={{
              fontFamily: 'var(--font-space-grotesk)',
              color: 'var(--text)',
            }}
          >
            {title}
          </h1>
          {description && (
            <p
              className="text-[13px] mt-0.5"
              style={{ color: 'var(--muted)' }}
            >
              {description}
            </p>
          )}
        </div>

        {/* Right: page actions + persistent bell */}
        <div className="flex items-center gap-3 shrink-0">
          {actions && (
            <div className="flex items-center gap-2">{actions}</div>
          )}

          {/* Notification bell — always visible, links to /admin/messages */}
          <Link
            href="/admin/messages"
            className="relative inline-flex items-center justify-center w-9 h-9 rounded-[8px] border transition-colors duration-150 hover:border-[var(--muted)]"
            style={{
              borderColor: 'var(--border)',
              color: 'var(--muted)',
            }}
            aria-label={
              unreadCount > 0
                ? `Messages — ${unreadCount} unread`
                : 'Messages'
            }
            title="Messages"
          >
            <Bell size={16} aria-hidden="true" />
            {unreadCount > 0 && (
              <span
                className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold leading-none flex items-center justify-center border-2"
                style={{
                  backgroundColor: '#ef4444',
                  color: '#fff',
                  borderColor: 'var(--surface)',
                }}
                aria-hidden="true"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 p-6">{children}</div>
    </div>
  );
}
