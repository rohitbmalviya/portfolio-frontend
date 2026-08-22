'use client';

// ============================================================
//  Admin Site Settings — singleton PATCH
//
//  Deferred-upload flow:
//   Resume  → pick file → hold as pending → upload on Save
//   OG Image → pick file → hold as pending → upload on Save
//
//  Both uploads use reconcileSingleMedia with:
//   ownerId = settings.id, ownerType = 'settings'
//   usage = 'resume' | 'og'
// ============================================================

import { Suspense, useEffect, useRef, useState } from 'react';
import { Save, Loader2, Plus, Trash2, Upload, Download, ExternalLink } from 'lucide-react';
import { adminSettings } from '@/lib/admin-api';
import { reconcileSingleMedia } from '@/lib/media-save';
import type { SocialLink, DefaultTheme } from '@/lib/types';
import { getConfigOptions } from '@/lib/api';
import type { ConfigOption } from '@/lib/api';
import { normalizeSocials } from '@/lib/socials';
import { AdminShell } from '@/components/admin/admin-shell';
import { ToastProvider, useToast } from '@/components/admin/toast';
import {
  AdminButton,
  AdminCard,
  AdminInput,
  AdminTextarea,
  AdminSelect,
} from '@/components/admin/ui';
import { ImageUpload, type ImageValue } from '@/components/admin/image-upload';
import { MailConnection } from '@/components/admin/mail-connection';

// ── Form state ─────────────────────────────────────────────────
// `resumeValue` and `ogImageValue` hold deferred media values.
// They are NOT sent in the settings PATCH — linking happens via
// reconcileSingleMedia on Save.

interface FormState {
  name: string;
  tagline: string;
  email: string;
  location: string;
  socials: SocialLink[];
  defaultTheme: DefaultTheme;
  brandAccent: string;
  footerText: string;
  ogTitle: string;
  ogDescription: string;
}

const EMPTY: FormState = {
  name: '',
  tagline: '',
  email: '',
  location: '',
  socials: [],
  defaultTheme: 'DARK',
  brandAccent: '',
  footerText: '',
  ogTitle: '',
  ogDescription: '',
};

function SettingsContent() {
  const { success, error: toastError } = useToast();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [socialTypeOptions, setSocialTypeOptions] = useState<ConfigOption[]>([]);

  // Deferred media state — separate from the PATCH payload.
  const [resumeValue, setResumeValue] = useState<ImageValue | null>(null);
  const [ogImageValue, setOgImageValue] = useState<ImageValue | null>(null);

  // Track original mediaIds for reconcile (what was loaded from API).
  const settingsIdRef = useRef<string | null>(null);
  const originalResumeMediaIdRef = useRef<string | null>(null);
  const originalOgImageMediaIdRef = useRef<string | null>(null);

  // For the resume pending preview, track its objectURL so we can revoke on change.
  const resumePendingUrlRef = useRef<string | null>(null);

  // Hidden file input for the resume picker.
  const resumeInputRef = useRef<HTMLInputElement>(null);

  // Load social link types from config API.
  useEffect(() => {
    getConfigOptions('social_link_types').then((opts) => {
      setSocialTypeOptions(opts);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    adminSettings
      .get()
      .then((s) => {
        settingsIdRef.current = s.id;
        originalResumeMediaIdRef.current = s.resumeMediaId ?? null;
        originalOgImageMediaIdRef.current = s.ogImageMediaId ?? null;

        setForm({
          name: s.name,
          tagline: s.tagline,
          email: s.email,
          location: s.location,
          socials: normalizeSocials(s.socials),
          defaultTheme: s.defaultTheme,
          brandAccent: s.brandAccent ?? '',
          footerText: s.footerText ?? '',
          ogTitle: s.ogTitle ?? '',
          ogDescription: s.ogDescription ?? '',
        });

        // Initialise deferred media from existing server data.
        setResumeValue(
          s.resumeMediaId && s.resumeUrl
            ? { mediaId: s.resumeMediaId, url: s.resumeUrl }
            : null,
        );
        setOgImageValue(
          s.ogImageMediaId && s.ogImage
            ? { mediaId: s.ogImageMediaId, url: s.ogImage }
            : null,
        );
      })
      .catch((err) => toastError(err instanceof Error ? err.message : 'Failed to load settings.'))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function setSocialRow(index: number, patch: Partial<SocialLink>) {
    setForm((f) => {
      const next = (f.socials as SocialLink[]).map((row, i) =>
        i === index ? { ...row, ...patch } : row,
      );
      return { ...f, socials: next };
    });
  }

  function addSocialRow() {
    setForm((f) => ({
      ...f,
      socials: [...(f.socials as SocialLink[]), { type: 'website', value: '' }],
    }));
  }

  function removeSocialRow(index: number) {
    setForm((f) => ({
      ...f,
      socials: (f.socials as SocialLink[]).filter((_, i) => i !== index),
    }));
  }

  // ── Resume deferred handlers ──────────────────────────────────

  function handleResumePick(files: FileList | null) {
    if (!files || files.length === 0) return;
    // Revoke the previous pending objectURL.
    if (resumePendingUrlRef.current) {
      URL.revokeObjectURL(resumePendingUrlRef.current);
    }
    const objectUrl = URL.createObjectURL(files[0]);
    resumePendingUrlRef.current = objectUrl;
    setResumeValue({ file: files[0], url: objectUrl });
    if (resumeInputRef.current) resumeInputRef.current.value = '';
  }

  function handleResumeRemove() {
    if (resumeValue && 'file' in resumeValue && resumePendingUrlRef.current) {
      URL.revokeObjectURL(resumePendingUrlRef.current);
      resumePendingUrlRef.current = null;
    }
    setResumeValue(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!settingsIdRef.current) {
      toastError('Settings not loaded yet.');
      return;
    }
    setSaving(true);
    try {
      // 1. PATCH core settings (no resumeMediaId / ogImageMediaId).
      await adminSettings.update({
        name: form.name,
        tagline: form.tagline,
        email: form.email,
        location: form.location,
        socials: form.socials,
        defaultTheme: form.defaultTheme,
        brandAccent: form.brandAccent || undefined,
        footerText: form.footerText || undefined,
        ogTitle: form.ogTitle || undefined,
        ogDescription: form.ogDescription || undefined,
      });

      const ownerId = settingsIdRef.current;
      const mediaErrorGroups: string[] = [];

      // 2. Reconcile résumé (usage: 'resume').
      const resumeErrors = await reconcileSingleMedia({
        value: resumeValue,
        originalMediaId: originalResumeMediaIdRef.current,
        ownerId,
        ownerType: 'settings',
        usage: 'resume',
        category: 'Raw',
      });
      if (resumeErrors.length > 0) mediaErrorGroups.push(`Resume: ${resumeErrors.join(', ')}`);

      // 3. Reconcile OG image (usage: 'og').
      const ogErrors = await reconcileSingleMedia({
        value: ogImageValue,
        originalMediaId: originalOgImageMediaIdRef.current,
        ownerId,
        ownerType: 'settings',
        usage: 'og',
        category: 'Raw',
      });
      if (ogErrors.length > 0) mediaErrorGroups.push(`OG image: ${ogErrors.join(', ')}`);

      if (mediaErrorGroups.length > 0) {
        toastError(`Settings saved, but some media had issues: ${mediaErrorGroups.join('; ')}`);
      } else {
        success('Settings saved.');
      }

      // 4. Reload to get fresh URLs and reset original mediaIds.
      const refreshed = await adminSettings.get();
      originalResumeMediaIdRef.current = refreshed.resumeMediaId ?? null;
      originalOgImageMediaIdRef.current = refreshed.ogImageMediaId ?? null;
      setResumeValue(
        refreshed.resumeMediaId && refreshed.resumeUrl
          ? { mediaId: refreshed.resumeMediaId, url: refreshed.resumeUrl }
          : null,
      );
      setOgImageValue(
        refreshed.ogImageMediaId && refreshed.ogImage
          ? { mediaId: refreshed.ogImageMediaId, url: refreshed.ogImage }
          : null,
      );
      // Clear pending objectURL refs after reload.
      resumePendingUrlRef.current = null;
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AdminShell title="Settings">
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin" style={{ color: 'var(--accent)' }} />
        </div>
      </AdminShell>
    );
  }

  const socials = form.socials as SocialLink[];
  const resumeDisplayUrl = resumeValue?.url ?? null;

  return (
    <AdminShell
      title="Site Settings"
      description="Global portfolio settings and defaults."
      actions={
        <AdminButton loading={saving} onClick={handleSubmit} type="button">
          <Save size={14} aria-hidden="true" />
          {saving ? 'Saving…' : 'Save settings'}
        </AdminButton>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full" noValidate>
        {/* Identity */}
        <AdminCard>
          <h2 className="text-[14px] font-semibold mb-4" style={{ color: 'var(--text)' }}>
            Identity
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AdminInput
              label="Name"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Rohit Malviya"
            />
            <AdminInput
              label="Location"
              value={form.location}
              onChange={(e) => set('location', e.target.value)}
              placeholder="Bangkok, TH"
            />
            <AdminInput
              label="Tagline"
              value={form.tagline}
              onChange={(e) => set('tagline', e.target.value)}
              className="sm:col-span-2"
              placeholder="Full-Stack Engineer"
            />
            <AdminInput
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
            />

            {/* Résumé — deferred upload */}
            <div>
              <label className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>
                Résumé (PDF)
              </label>
              <input
                ref={resumeInputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="sr-only"
                onChange={(e) => handleResumePick(e.target.files)}
              />

              {resumeDisplayUrl ? (
                <div
                  className="mt-1.5 rounded-[10px] border overflow-hidden"
                  style={{ borderColor: 'var(--border)' }}
                >
                  {/* Show iframe only for Cloudinary URLs (not objectURLs) */}
                  {resumeValue && !('file' in resumeValue) ? (
                    <iframe
                      src={resumeDisplayUrl}
                      title="Résumé preview"
                      className="w-full h-64 bg-white"
                    />
                  ) : (
                    <div
                      className="flex items-center justify-center h-16 text-[13px]"
                      style={{ color: 'var(--muted)', backgroundColor: 'var(--surface-2)' }}
                    >
                      PDF selected — will upload on save
                    </div>
                  )}
                  <div
                    className="flex flex-wrap items-center gap-2 p-2 border-t"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    {resumeValue && !('file' in resumeValue) && (
                      <>
                        <a href={resumeDisplayUrl} target="_blank" rel="noopener noreferrer">
                          <AdminButton variant="ghost" size="sm" type="button">
                            <ExternalLink size={13} aria-hidden="true" /> View
                          </AdminButton>
                        </a>
                        <a href={resumeDisplayUrl} download>
                          <AdminButton variant="ghost" size="sm" type="button">
                            <Download size={13} aria-hidden="true" /> Download
                          </AdminButton>
                        </a>
                      </>
                    )}
                    <AdminButton
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={() => resumeInputRef.current?.click()}
                    >
                      <Upload size={13} aria-hidden="true" /> Replace
                    </AdminButton>
                    <AdminButton
                      variant="danger"
                      size="sm"
                      type="button"
                      onClick={handleResumeRemove}
                    >
                      <Trash2 size={13} aria-hidden="true" /> Remove
                    </AdminButton>
                  </div>
                </div>
              ) : (
                <div className="mt-1.5">
                  <AdminButton
                    variant="ghost"
                    type="button"
                    onClick={() => resumeInputRef.current?.click()}
                  >
                    <Upload size={14} aria-hidden="true" /> Upload résumé (PDF) — saved on submit
                  </AdminButton>
                </div>
              )}
            </div>
          </div>
        </AdminCard>

        {/* Socials */}
        <AdminCard>
          <h2 className="text-[14px] font-semibold mb-4" style={{ color: 'var(--text)' }}>
            Social Links
          </h2>
          <div className="flex flex-col gap-2">
            {socials.map((row, i) => (
              <div key={i} className="flex gap-2 items-center">
                <div className="flex-1">
                  <AdminSelect
                    value={row.type}
                    onChange={(e) => setSocialRow(i, { type: e.target.value })}
                    options={socialTypeOptions}
                  />
                </div>
                <div className="flex-1">
                  <AdminInput
                    type={row.type === 'email' ? 'email' : 'url'}
                    placeholder="https://…"
                    value={row.value}
                    onChange={(e) => setSocialRow(i, { value: e.target.value })}
                  />
                </div>
                <AdminButton
                  variant="danger"
                  size="sm"
                  type="button"
                  aria-label="Remove social link"
                  onClick={() => removeSocialRow(i)}
                >
                  <Trash2 size={13} aria-hidden="true" /> Remove
                </AdminButton>
              </div>
            ))}
            <AdminButton
              variant="ghost"
              size="sm"
              type="button"
              onClick={addSocialRow}
            >
              <Plus size={14} aria-hidden="true" /> Add link
            </AdminButton>
          </div>
        </AdminCard>

        {/* Theme & Branding */}
        <AdminCard>
          <h2 className="text-[14px] font-semibold mb-4" style={{ color: 'var(--text)' }}>
            Theme & Branding
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AdminSelect
              label="Default theme"
              value={form.defaultTheme}
              onChange={(e) => set('defaultTheme', e.target.value as DefaultTheme)}
              options={[
                { value: 'DARK', label: 'Dark' },
                { value: 'LIGHT', label: 'Light' },
              ]}
            />
            <AdminInput
              label="Brand accent (hex)"
              value={form.brandAccent ?? ''}
              onChange={(e) => set('brandAccent', e.target.value)}
              placeholder="#22D3EE"
            />
            <AdminTextarea
              label="Footer text"
              value={form.footerText ?? ''}
              onChange={(e) => set('footerText', e.target.value)}
              rows={2}
              className="sm:col-span-2"
            />
          </div>
        </AdminCard>

        {/* OG / SEO */}
        <AdminCard>
          <h2 className="text-[14px] font-semibold mb-4" style={{ color: 'var(--text)' }}>
            Default SEO / Open Graph
          </h2>
          <div className="flex flex-col gap-4">
            <AdminInput
              label="OG title"
              value={form.ogTitle ?? ''}
              onChange={(e) => set('ogTitle', e.target.value)}
            />
            <AdminTextarea
              label="OG description"
              value={form.ogDescription ?? ''}
              onChange={(e) => set('ogDescription', e.target.value)}
              rows={3}
            />
            {/* OG Image — deferred upload */}
            <ImageUpload
              label="OG Image"
              value={ogImageValue}
              onChange={setOgImageValue}
              hint="Default social-share image ~1200×630 px. Uploaded when you save."
            />
          </div>
        </AdminCard>

        <div className="flex justify-end">
          <AdminButton loading={saving} type="submit" disabled={saving}>
            <Save size={14} aria-hidden="true" />
            {saving ? 'Saving…' : 'Save settings'}
          </AdminButton>
        </div>
      </form>

      {/* Outside the <form>: connecting is an OAuth redirect, not a field that
          participates in "Save settings". Nesting it would also make its
          buttons submit the form. Suspense is required because it reads
          useSearchParams to pick up the ?mail= result from the callback. */}
      <div className="mt-6">
        <Suspense fallback={null}>
          <MailConnection />
        </Suspense>
      </div>
    </AdminShell>
  );
}

export default function AdminSettingsPage() {
  return (
    <ToastProvider>
      <SettingsContent />
    </ToastProvider>
  );
}
