// ============================================================
//  ContactSection — mailto CTA + dynamic links + resume download.
//  Server component.
// ============================================================

import {
  Mail,
  Download,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import { SectionHeading } from '@/components/ui/section-heading';
import { LinkButton } from '@/components/ui/button';
import { ContactForm } from './contact-form';
import { CONTACT_LINK_ICON_MAP } from '@/lib/contact-link-types';
import { getSiteSettings } from '@/lib/api';
import type { ContactData } from '@/lib/types';
import type { LucideIcon } from 'lucide-react';

// ── Legacy social icon map (backward-compat with data.socials) ─

/** Kept for backward-compat with legacy `data.socials` key names */
const LEGACY_SOCIAL_ICONS: Record<string, LucideIcon> = {
  github:   CONTACT_LINK_ICON_MAP['github']   ?? ExternalLink,
  linkedin: CONTACT_LINK_ICON_MAP['linkedin'] ?? ExternalLink,
  twitter:  CONTACT_LINK_ICON_MAP['twitter']  ?? ExternalLink,
  email:    Mail,
};

function getLinkHref(type: string, value: string): string {
  if (type === 'email') return `mailto:${value}`;
  if (type === 'phone') return `tel:${value}`;
  return value;
}

function isExternalHref(type: string): boolean {
  return type !== 'email' && type !== 'phone';
}

// ── Component ─────────────────────────────────────────────────

interface ContactSectionProps {
  data: ContactData;
  sectionNumber?: string;
}

export async function ContactSection({ data, sectionNumber }: ContactSectionProps) {
  // Fetch settings to resolve location — cached at 5 min (ISR).
  const settings = await getSiteSettings();
  const location = settings?.location;

  // Derive the primary email from section data only — no env or hardcoded fallback.
  const emailLink = data.links?.find((l) => l.type === 'email');
  const email = emailLink?.value ?? data.email ?? undefined;

  // If there is a resume-type link in data.links, that takes precedence.
  // Otherwise, fall back to the legacy data.resumeUrl field for backward-compat.
  const hasResumeLink = data.links?.some((l) => l.type === 'resume') ?? false;
  const legacyResumeUrl = !hasResumeLink && data.resumeUrl ? data.resumeUrl : null;

  // Links to display in the links row: if `data.links` is defined use those
  // (filtering out the email entry because it's already shown in the CTA
  // button above); otherwise fall back to legacy `data.socials`.
  const hasNewLinks = Array.isArray(data.links) && data.links.length > 0;
  const nonEmailLinks = data.links?.filter((l) => l.type !== 'email') ?? [];

  return (
    <section className="py-16" id="contact" aria-labelledby="contact-heading">
      <div className="wrap">
        <SectionHeading number={sectionNumber} title={data.heading || 'Contact'} />

        <div className="max-w-[580px] space-y-6">
          {data.blurb && (
            <p className="text-[--muted] text-[16px] leading-[1.7]">{data.blurb}</p>
          )}

          {/* Interactive contact form — only when enabled in the section */}
          {data.showForm && <ContactForm />}

          {/* Primary email CTA — only rendered when an email address is available */}
          {(email || legacyResumeUrl) && (
            <div className="flex flex-wrap items-center gap-4">
              {email && (
                <LinkButton
                  href={`mailto:${email}`}
                  variant="primary"
                  aria-label={`Send email to ${email}`}
                >
                  <Mail size={16} aria-hidden="true" />
                  {email}
                </LinkButton>
              )}

              {legacyResumeUrl && (
                <LinkButton
                  href={legacyResumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="ghost"
                  aria-label="Download resume PDF"
                >
                  <Download size={16} aria-hidden="true" />
                  Download résumé
                </LinkButton>
              )}
            </div>
          )}

          {/* Location — sourced from SiteSettings; omitted when absent */}
          {location && (
            <p className="flex items-center gap-2 font-mono text-[13px] text-[--muted]">
              <MapPin size={14} aria-hidden="true" />
              {location}
            </p>
          )}

          {/* Links row — new dynamic list if present, legacy socials otherwise */}
          {hasNewLinks && nonEmailLinks.length > 0 ? (
            <div className="flex flex-wrap items-center gap-5">
              {nonEmailLinks.map((link, i) => {
                const Icon: LucideIcon = CONTACT_LINK_ICON_MAP[link.type] ?? ExternalLink;
                const href = getLinkHref(link.type, link.value);
                const external = isExternalHref(link.type);
                // Show the raw value for phone, friendly label for resume, type name for URLs
                const label =
                  link.type === 'phone' ? link.value :
                  link.type === 'resume' ? 'Resume / CV' :
                  link.type;
                return (
                  <a
                    key={i}
                    href={href}
                    target={external ? '_blank' : undefined}
                    rel={external ? 'noopener noreferrer' : undefined}
                    aria-label={link.type.charAt(0).toUpperCase() + link.type.slice(1)}
                    className="text-[--muted] hover:text-[--accent] transition-colors duration-150 flex items-center gap-2 font-mono text-[13px]"
                  >
                    <Icon size={16} aria-hidden="true" />
                    {label}
                  </a>
                );
              })}
            </div>
          ) : !hasNewLinks && data.socials && Object.keys(data.socials).length > 0 ? (
            /* Backward-compat: render legacy socials object */
            <div className="flex items-center gap-5">
              {Object.entries(data.socials).map(([key, href]) => {
                if (!href) return null;
                const Icon: LucideIcon =
                  LEGACY_SOCIAL_ICONS[key.toLowerCase()] ?? Mail;
                return (
                  <a
                    key={key}
                    href={href}
                    target={href.startsWith('mailto') ? undefined : '_blank'}
                    rel={href.startsWith('mailto') ? undefined : 'noopener noreferrer'}
                    aria-label={key.charAt(0).toUpperCase() + key.slice(1)}
                    className="text-[--muted] hover:text-[--accent] transition-colors duration-150 flex items-center gap-2 font-mono text-[13px]"
                  >
                    <Icon size={16} aria-hidden="true" />
                    {key}
                  </a>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
