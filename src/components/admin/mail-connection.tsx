'use client';

// ============================================================
//  MailConnection — connect / disconnect the Gmail mailbox used
//  by the contact form and the two-way message sync.
//
//  Deliberately self-contained rather than part of the settings
//  form: connecting is an OAuth redirect out to Google and back,
//  not a field that participates in "Save settings". Mixing them
//  would mean a half-filled form could be lost on redirect.
// ============================================================

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Mail, MailCheck, MailX, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { adminMail, type MailStatus } from '@/lib/admin-api';
import { useToast } from '@/components/admin/toast';
import { AdminButton, AdminCard } from '@/components/admin/ui';

function formatWhen(iso: string | null): string {
  if (!iso) return 'never';
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function MailConnection() {
  const { success, error: toastError } = useToast();
  const params = useSearchParams();

  const [status, setStatus] = useState<MailStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setStatus(await adminMail.status());
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Could not read mail status.');
    } finally {
      setLoading(false);
    }
  }, [toastError]);

  useEffect(() => {
    void load();
  }, [load]);

  // The OAuth callback redirects back here with ?mail=connected|error.
  // Surface the outcome, then strip the params so a refresh doesn't re-toast.
  useEffect(() => {
    const outcome = params.get('mail');
    if (!outcome) return;

    if (outcome === 'connected') {
      success('Gmail connected.');
    } else {
      toastError(`Could not connect Gmail: ${params.get('reason') ?? 'unknown error'}`);
    }
    window.history.replaceState(null, '', window.location.pathname);
    void load();
  }, [params, success, toastError, load]);

  async function handleConnect() {
    setBusy(true);
    try {
      const { url } = await adminMail.connectUrl();
      // Full navigation, not fetch: the user has to see Google's consent screen.
      window.location.href = url;
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Could not start the connection.');
      setBusy(false);
    }
  }

  async function handleDisconnect() {
    if (!window.confirm('Disconnect Gmail? The contact form will stop sending email until you reconnect.')) {
      return;
    }
    setBusy(true);
    try {
      await adminMail.disconnect();
      success('Gmail disconnected.');
      await load();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Could not disconnect.');
    } finally {
      setBusy(false);
    }
  }

  // ── Server-side prerequisites ───────────────────────────────
  // Distinguish "server isn't set up" from "you haven't connected yet",
  // so a missing env var doesn't look like a broken button.
  const blocker = !status
    ? null
    : !status.oauthConfigured
      ? 'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are not set on the server.'
      : !status.encryptionReady
        ? 'ENCRYPTION_KEY is not set on the server, so the token could not be stored securely.'
        : null;

  return (
    <AdminCard>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-[14px] font-semibold" style={{ color: 'var(--text)' }}>
            Mail connection
          </h2>
          <p className="text-[12px] mt-1" style={{ color: 'var(--muted)' }}>
            The Gmail account used to send contact-form notifications and sync replies.
          </p>
        </div>
        {status?.connected ? (
          <MailCheck size={18} style={{ color: 'var(--accent)' }} aria-hidden="true" />
        ) : (
          <MailX size={18} style={{ color: 'var(--muted)' }} aria-hidden="true" />
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--muted)' }}>
          <Loader2 size={14} className="animate-spin" aria-hidden="true" />
          Checking…
        </div>
      ) : blocker ? (
        <p
          className="text-[13px] rounded-[8px] border p-3"
          style={{ color: 'var(--muted)', borderColor: 'var(--border)' }}
        >
          {blocker}
        </p>
      ) : status?.connected ? (
        <>
          <dl className="text-[13px] flex flex-col gap-1.5 mb-4">
            <div className="flex gap-2">
              <dt style={{ color: 'var(--muted)' }}>Account</dt>
              <dd className="font-mono" style={{ color: 'var(--text)' }}>
                {status.email}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt style={{ color: 'var(--muted)' }}>Connected</dt>
              <dd style={{ color: 'var(--text)' }}>{formatWhen(status.connectedAt)}</dd>
            </div>
            <div className="flex gap-2">
              <dt style={{ color: 'var(--muted)' }}>Last sync</dt>
              <dd style={{ color: 'var(--text)' }}>{formatWhen(status.lastSyncAt)}</dd>
            </div>
          </dl>
          <div className="flex flex-wrap gap-3">
            <AdminButton variant="ghost" loading={busy} onClick={handleConnect}>
              <RefreshCw size={14} aria-hidden="true" />
              Reconnect
            </AdminButton>
            <AdminButton variant="danger" loading={busy} onClick={handleDisconnect}>
              <MailX size={14} aria-hidden="true" />
              Disconnect
            </AdminButton>
          </div>
        </>
      ) : (
        <>
          <p className="text-[13px] mb-4" style={{ color: 'var(--muted)' }}>
            No mailbox connected. Contact-form submissions are still saved, but no email is sent.
          </p>
          <AdminButton loading={busy} onClick={handleConnect}>
            <Mail size={14} aria-hidden="true" />
            Connect Gmail
            <ExternalLink size={12} aria-hidden="true" />
          </AdminButton>
        </>
      )}
    </AdminCard>
  );
}
