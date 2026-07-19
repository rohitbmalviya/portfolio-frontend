// ============================================================
//  lib/color.ts — Strict CSS color validation.
//  Used to sanitize SiteSettings.brandAccent (admin-editable,
//  free-text) before it is ever interpolated into an inline
//  <style> tag, to prevent CSS injection.
// ============================================================

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const RGB_RE =
  /^rgba?\(\s*\d{1,3}%?\s*,\s*\d{1,3}%?\s*,\s*\d{1,3}%?\s*(,\s*(0|1|0?\.\d+))?\s*\)$/i;
const HSL_RE =
  /^hsla?\(\s*\d{1,3}(\.\d+)?(deg)?\s*,\s*\d{1,3}(\.\d+)?%\s*,\s*\d{1,3}(\.\d+)?%\s*(,\s*(0|1|0?\.\d+))?\s*\)$/i;

/**
 * Returns true only for a strictly well-formed hex / rgb(a) / hsl(a)
 * color string — nothing else (no CSS variables, no `url()`, no
 * keywords, no whitespace tricks that could break out of the
 * declaration this value is interpolated into).
 */
export function isSafeCssColor(value: string): boolean {
  const v = value.trim();
  if (!v || v.length > 64) return false;
  return HEX_RE.test(v) || RGB_RE.test(v) || HSL_RE.test(v);
}
