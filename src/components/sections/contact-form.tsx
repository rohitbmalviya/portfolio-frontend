'use client';

// ============================================================
//  ContactForm — public contact form that POSTs to /api/contact.
//  Used inside ContactSection when data.showForm is true.
//  Client component (island) — takes no props; it owns its own
//  local state and submits directly via submitContact().
//  Includes a visually-hidden honeypot field ("website") that
//  the backend uses to silently drop bot submissions.
// ============================================================

import { useState } from 'react';
import { Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { submitContact } from '@/lib/api';

type FormStatus = 'idle' | 'sending' | 'success' | 'error';

interface FieldErrors {
  name?: string;
  email?: string;
  message?: string;
}

export function ContactForm() {
  const [name, setName] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState(''); // honeypot — left empty by humans
  const [status, setStatus] = useState<FormStatus>('idle');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const inputClass =
    'w-full px-3 py-2.5 rounded-[10px] border text-[14px] outline-none transition-colors focus:border-[--accent]';
  const inputStyle = {
    backgroundColor: 'var(--surface)',
    borderColor: 'var(--border)',
    color: 'var(--text)',
  } as const;
  const errorBorderStyle = {
    ...inputStyle,
    borderColor: 'rgba(239,68,68,0.6)',
  } as const;

  function validate(): boolean {
    const errors: FieldErrors = {};
    if (!name.trim()) errors.name = 'Name is required.';
    if (!fromEmail.trim()) {
      errors.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEmail.trim())) {
      errors.email = 'Please enter a valid email address.';
    }
    if (!message.trim()) errors.message = 'Message is required.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setStatus('sending');
    setFieldErrors({});

    const ok = await submitContact({
      name: name.trim(),
      email: fromEmail.trim(),
      subject: subject.trim() || undefined,
      message: message.trim(),
      website,
    });

    if (ok) {
      setStatus('success');
      setName('');
      setFromEmail('');
      setSubject('');
      setMessage('');
      setWebsite('');
    } else {
      setStatus('error');
    }
  }

  // ── Success state ──────────────────────────────────────────

  if (status === 'success') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-[14px] border p-6 flex items-start gap-3"
        style={{ borderColor: 'rgba(74,222,128,0.3)', backgroundColor: 'var(--surface)' }}
      >
        <CheckCircle2
          size={20}
          aria-hidden="true"
          className="shrink-0 mt-0.5"
          style={{ color: '#4ade80' }}
        />
        <div>
          <p className="text-[14px] font-semibold mb-1" style={{ color: 'var(--text)' }}>
            Message sent!
          </p>
          <p className="text-[13px]" style={{ color: 'var(--muted)' }}>
            Thanks — your message has been sent.
          </p>
          <button
            type="button"
            onClick={() => setStatus('idle')}
            className="mt-3 text-[13px] underline underline-offset-2 transition-colors"
            style={{ color: 'var(--accent)' }}
          >
            Send another message
          </button>
        </div>
      </div>
    );
  }

  // ── Form ───────────────────────────────────────────────────

  const sending = status === 'sending';

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-[14px] border p-5 flex flex-col gap-3"
      style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
      aria-label="Contact form"
    >
      {/* Honeypot — hidden from sighted/keyboard users, left blank by humans.
          Bots that auto-fill every field will trip it; the backend silently
          drops any submission where this is non-empty. */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '-9999px',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
        }}
      >
        <label htmlFor="contact-website">Website</label>
        <input
          id="contact-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      {/* Error banner */}
      {status === 'error' && (
        <div
          role="alert"
          className="flex items-center gap-2 px-3 py-2.5 rounded-[10px] border text-[13px]"
          style={{
            borderColor: 'rgba(248,113,113,0.3)',
            backgroundColor: 'rgba(248,113,113,0.08)',
            color: '#f87171',
          }}
        >
          <AlertCircle size={15} aria-hidden="true" className="shrink-0" />
          Something went wrong. Please try again later.
        </div>
      )}

      {/* Name + Email */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="contact-name" className="sr-only">
            Your name
          </label>
          <input
            id="contact-name"
            type="text"
            required
            disabled={sending}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (fieldErrors.name) setFieldErrors((p) => ({ ...p, name: undefined }));
            }}
            placeholder="Your name"
            aria-describedby={fieldErrors.name ? 'contact-name-err' : undefined}
            aria-invalid={!!fieldErrors.name}
            className={inputClass}
            style={fieldErrors.name ? errorBorderStyle : inputStyle}
          />
          {fieldErrors.name && (
            <p id="contact-name-err" className="text-[12px]" style={{ color: '#f87171' }} role="alert">
              {fieldErrors.name}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="contact-email" className="sr-only">
            Your email
          </label>
          <input
            id="contact-email"
            type="email"
            required
            disabled={sending}
            value={fromEmail}
            onChange={(e) => {
              setFromEmail(e.target.value);
              if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }));
            }}
            placeholder="Your email"
            aria-describedby={fieldErrors.email ? 'contact-email-err' : undefined}
            aria-invalid={!!fieldErrors.email}
            className={inputClass}
            style={fieldErrors.email ? errorBorderStyle : inputStyle}
          />
          {fieldErrors.email && (
            <p id="contact-email-err" className="text-[12px]" style={{ color: '#f87171' }} role="alert">
              {fieldErrors.email}
            </p>
          )}
        </div>
      </div>

      {/* Subject (optional) */}
      <div>
        <label htmlFor="contact-subject" className="sr-only">
          Subject (optional)
        </label>
        <input
          id="contact-subject"
          type="text"
          disabled={sending}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject (optional)"
          className={inputClass}
          style={inputStyle}
        />
      </div>

      {/* Message */}
      <div className="flex flex-col gap-1">
        <label htmlFor="contact-message" className="sr-only">
          Your message
        </label>
        <textarea
          id="contact-message"
          required
          disabled={sending}
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            if (fieldErrors.message) setFieldErrors((p) => ({ ...p, message: undefined }));
          }}
          placeholder="Your message…"
          rows={4}
          aria-describedby={fieldErrors.message ? 'contact-message-err' : undefined}
          aria-invalid={!!fieldErrors.message}
          className={`${inputClass} resize-y`}
          style={fieldErrors.message ? errorBorderStyle : inputStyle}
        />
        {fieldErrors.message && (
          <p id="contact-message-err" className="text-[12px]" style={{ color: '#f87171' }} role="alert">
            {fieldErrors.message}
          </p>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={sending}
        aria-busy={sending}
        className="self-start inline-flex items-center gap-2 px-4 h-10 rounded-[10px] border font-semibold text-[14px] transition-all duration-200 hover:shadow-[0_0_24px_var(--accent-glow)] disabled:opacity-60 disabled:cursor-not-allowed"
        style={{
          backgroundColor: 'var(--accent-dim)',
          borderColor: 'var(--accent)',
          color: 'var(--accent)',
        }}
      >
        {sending ? (
          <Loader2 size={15} aria-hidden="true" className="animate-spin" />
        ) : (
          <Send size={15} aria-hidden="true" />
        )}
        {sending ? 'Sending…' : 'Send message'}
      </button>
    </form>
  );
}
