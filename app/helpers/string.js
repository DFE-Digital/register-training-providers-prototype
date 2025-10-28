/**
 * Converts empty values to null for consistent data handling.
 *
 * - `null` or `undefined` → `null`
 * - `NaN` → `null`
 * - Empty string or whitespace-only string → `null`
 * - Valid numbers (including 0, -1) → unchanged
 * - Non-empty strings → unchanged
 *
 * @param {*} value - The value to check (can be any type).
 * @returns {*|null} The original value if non-empty, or `null` if empty.
 *
 * @example
 * nullIfEmpty(null)        // null
 * nullIfEmpty(undefined)   // null
 * nullIfEmpty('')          // null
 * nullIfEmpty('  ')        // null
 * nullIfEmpty('hello')     // 'hello'
 * nullIfEmpty(0)           // 0
 * nullIfEmpty(42)          // 42
 * nullIfEmpty(NaN)         // null
 */
const nullIfEmpty = (value) => {
  // If it's null or undefined outright
  if (value == null) return null;

  // If it's a number, decide what "empty" means
  if (typeof value === 'number') {
    // Example: treat NaN as empty, but allow 0, -1, etc.
    return Number.isNaN(value) ? null : value;
  }

  // Otherwise, handle it as a string (or something convertible to string)
  // Trim whitespace and check length
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? value : null;
}

/**
 * Append a section path (e.g. "partnerships") to a base provider href.
 * - Returns an empty string if `href` is falsy (provider not listable).
 * - Normalises slashes to avoid double slashes.
 * - **Won't duplicate** the section if the base URL already ends with it.
 *
 * @param {string | null | undefined} href - Base provider URL (e.g. "/providers/12345").
 * @param {string} section - Section path to append (e.g. "partnerships" or "/partnerships/").
 * @returns {string} The combined URL, or '' if `href` is falsy.
 */
const appendSection = (href, section) => {
  if (!href) return ''
  const base = String(href).replace(/\/+$/, '')                 // trim trailing slashes
  const sec  = String(section || '').replace(/^\/+|\/+$/g, '')  // trim leading/trailing slashes
  if (!sec) return base
  // Guard against duplication: if base already ends with "/section", return base
  if (base.endsWith(`/${sec}`)) return base
  return `${base}/${sec}`
}

module.exports = {
  nullIfEmpty,
  appendSection
}
