// ============================================================
//  lib/contact-link-types.ts — Frontend-only icon lookup (+
//  last-resort label) for contact/social link types.
//
//  The Configuration key `contact_link_types` in the backend CMS
//  is the single source of truth for value/label pairs shown in
//  the admin UI (see section-data-form.tsx, which fetches it via
//  getConfigOptions). This file intentionally does NOT duplicate
//  that list — it only maps a type value to a Lucide icon
//  component (icons can't live in the backend), with `label` kept
//  as a last-resort display fallback for types the site renders
//  outside of any admin-driven label (e.g. footer social icons).
//
//  Derived export:
//    CONTACT_LINK_ICON_MAP — Record<string, LucideIcon> for rendering
//
//  Consumers:
//    - components/sections/contact-section.tsx (icon lookup)
//    - components/layout/footer.tsx            (social icon lookup)
// ============================================================

import {
  Mail,
  Phone,
  Globe,
  Linkedin,
  Github,
  Twitter,
  Instagram,
  Youtube,
  FileText,
  Send,
  ExternalLink,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface ContactLinkType {
  value: string;
  label: string;
  /** Lucide icon component rendered in the UI. */
  icon: LucideIcon;
}

/**
 * Master list of all recognised contact/social link types.
 * Every entry has a Lucide icon; unknown types fall back to
 * ExternalLink at the usage site.
 */
export const CONTACT_LINK_TYPES: ContactLinkType[] = [
  { value: 'email',     label: 'Email',        icon: Mail         },
  { value: 'phone',     label: 'Phone',         icon: Phone        },
  { value: 'website',   label: 'Website',       icon: Globe        },
  { value: 'linkedin',  label: 'LinkedIn',      icon: Linkedin     },
  { value: 'github',    label: 'GitHub',        icon: Github       },
  { value: 'twitter',   label: 'X (Twitter)',   icon: Twitter      },
  { value: 'instagram', label: 'Instagram',     icon: Instagram    },
  { value: 'youtube',   label: 'YouTube',       icon: Youtube      },
  { value: 'medium',    label: 'Medium',        icon: ExternalLink },
  { value: 'dribbble',  label: 'Dribbble',      icon: ExternalLink },
  { value: 'telegram',  label: 'Telegram',      icon: Send         },
  { value: 'resume',    label: 'Resume / CV',   icon: FileText     },
];

/**
 * Derived: icon lookup by type value.
 * Typed with `| undefined` so callers can safely use `?? ExternalLink`
 * as a fallback for any type not in this list.
 */
export const CONTACT_LINK_ICON_MAP: Record<string, LucideIcon | undefined> =
  Object.fromEntries(CONTACT_LINK_TYPES.map(({ value, icon }) => [value, icon]));
