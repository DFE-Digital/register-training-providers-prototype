/**
 * @typedef {'past'|'todayOrPast'|'future'|'todayOrFuture'} RelativeConstraint
 * @typedef {{between:[Date, Date]}|{onOrAfter: Date}|{after: Date}|{onOrBefore: Date}|{before: Date}} AbsoluteConstraint
 * @typedef {RelativeConstraint | AbsoluteConstraint | undefined} DateConstraint
 *
 * @typedef {{ fieldName: string, href: string, text: string }} SummaryError
 * @typedef {{ day?: boolean, month?: boolean, year?: boolean }} FieldFlags
 *
 * @typedef {{ day?: string, month?: string, year?: string }} DateParts
 *
 * @typedef {{
 *   label: string,          // e.g. "the date the trainee withdrew"
 *   baseId: string,         // e.g. "withdrawalDate" (prefix of -day/-month/-year ids)
 *   constraint?: DateConstraint,
 *   minYear?: number,
 *   maxYear?: number
 * }} ValidateOpts
 *
 * @typedef {{
 *   valid: boolean,
 *   iso?: string,
 *   summaryError?: SummaryError,
 *   fieldFlags?: FieldFlags
 * }} ValidationResult
 */

/**
 * Parse a value to an integer (base 10) after trimming; safe for null/undefined.
 * @param {unknown} v
 * @returns {number}
 */
const toInt = (v) => Number.parseInt(String(v ?? '').trim(), 10)

/**
 * Test if a string contains only decimal digits (ignoring surrounding whitespace).
 * @param {unknown} s
 * @returns {s is string}
 */
const isDigits = (s) => typeof s === 'string' && /^\s*\d+\s*$/.test(s)

/**
 * Capitalise the first alphabetical character, preserving any leading whitespace.
 * @param {string} s
 * @returns {string}
 */
const capFirst = (s = '') => s.replace(/^(\s*)([a-z])/, (_, ws, ch) => ws + ch.toUpperCase())

const { govukDate, toISODateString, asUTCDate } = require('../date')

/**
 * Get today's date at midnight UTC (no time-of-day).
 * @returns {Date}
 */
const todayUTC = () => {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

/**
 * Join words with commas and 'and' for human-readable lists.
 * @param {string[]} parts
 * @returns {string}
 */
const listJoin = (parts) =>
  parts.length === 1 ? parts[0]
  : parts.length === 2 ? `${parts[0]} and ${parts[1]}`
  : `${parts.slice(0, -1).join(', ')} and ${parts.slice(-1)[0]}`

/**
 * Validate a split date input against GOV.UK guidance and (optionally) constraints,
 * returning a summary error (for the error summary), field flags for inline highlighting,
 * and an ISO string if valid.
 *
 * - Handles empty, incomplete, non-numeric, non-existent dates (e.g. 31/2/2025).
 * - Supports constraints: past/future/today-or-… and absolute comparisons/between.
 *
 * @param {DateParts} parts - Strings as received from the form.
 * @param {ValidateOpts} opts - Labels, ids, and optional constraints.
 * @returns {ValidationResult}
 */
const validateDateInput = (parts, opts) => {
  const {
    label,
    baseId,
    constraint,
    minYear = 1900,
    maxYear = 2100
  } = opts

  const rawDay = parts?.day ?? ''
  const rawMonth = parts?.month ?? ''
  const rawYear = parts?.year ?? ''

  const empty = !rawDay && !rawMonth && !rawYear
  /** @type {FieldFlags} */
  const flags = { day: false, month: false, year: false }

  // 1) Nothing entered
  if (empty) {
    return {
      valid: false,
      summaryError: {
        fieldName: baseId,
        href: `#${baseId}-day`, // jump to first input
        text: `Enter ${label}`
      },
      fieldFlags: { day: true, month: true, year: true } // highlight whole input
    }
  }

  // 2) Incomplete (missing pieces or malformed year length)
  /** @type {Array<'day'|'month'|'year'>} */
  const missing = []
  if (!rawDay)   { missing.push('day'); flags.day = true }
  if (!rawMonth) { missing.push('month'); flags.month = true }
  if (!rawYear)  { missing.push('year'); flags.year = true }

  // Year present but not 4 numbers → treat as incomplete per GDS copy
  const yearDigits = rawYear.trim()
  const yearLenBad = !!yearDigits && (!isDigits(yearDigits) || yearDigits.length !== 4)
  if (!rawYear && yearLenBad) {
    // unreachable: can't be both empty and malformed
  } else if (rawYear && yearLenBad) {
    flags.year = true
    return {
      valid: false,
      summaryError: {
        fieldName: baseId,
        href: `#${baseId}-year`,
        text: 'Year must include 4 numbers'
      },
      fieldFlags: flags
    }
  }

  if (missing.length) {
    return {
      valid: false,
      summaryError: {
        fieldName: baseId,
        href: `#${baseId}-${missing[0]}`,
        text: `${capFirst(label)} must include a ${listJoin(missing)}`
      },
      fieldFlags: flags
    }
  }

  // 3) All parts present → must be numeric and a real date
  if (!isDigits(rawDay))   { flags.day = true }
  if (!isDigits(rawMonth)) { flags.month = true }
  if (!isDigits(rawYear))  { flags.year = true }

  if (flags.day || flags.month || flags.year) {
    const first = flags.day ? 'day' : flags.month ? 'month' : 'year'
    return {
      valid: false,
      summaryError: {
        fieldName: baseId,
        href: `#${baseId}-${first}`,
        text: `${capFirst(label)} must be a real date`
      },
      fieldFlags: flags
    }
  }

  const day = toInt(rawDay)
  const month = toInt(rawMonth)
  const year = toInt(rawYear)

  // Range sanity for year (still use GDS "real date" copy for out-of-range month/day)
  if (year < minYear || year > maxYear) {
    return {
      valid: false,
      summaryError: {
        fieldName: baseId,
        href: `#${baseId}-year`,
        text: `${capFirst(label)} must be a real date`
      },
      fieldFlags: { year: true }
    }
  }

  const candidate = asUTCDate(year, month, day)
  const isReal =
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day

  if (!isReal) {
    // If it looks like a month/day bound issue, point to that; otherwise whole input
    const pointTo =
      month < 1 || month > 12 ? 'month' :
      day < 1 || day > 31 ? 'day' : 'day'
    flags[pointTo] = true

    return {
      valid: false,
      summaryError: {
        fieldName: baseId,
        href: `#${baseId}-${pointTo}`,
        text: `${capFirst(label)} must be a real date`
      },
      fieldFlags: flags
    }
  }

  // 4) Optional date constraints (past/future/relative)
  if (constraint) {
    const today = todayUTC()

    /**
     * Produce a validation failure that highlights the whole input and links to day.
     * @param {string} text
     * @returns {ValidationResult}
     */
    const fail = (text) => ({
      valid: false,
      summaryError: { fieldName: baseId, href: `#${baseId}-day`, text },
      fieldFlags: { day: true, month: true, year: true }
    })

    /** Fail helper that prefixes with the (capitalised) label. */
    const failWithLabel = (suffix) => fail(`${capFirst(label)} ${suffix}`)

    const formatDate = (d) => govukDate(d.toISOString())

    if (constraint === 'past') {
      if (!(candidate < today)) return failWithLabel('must be in the past')
    } else if (constraint === 'todayOrPast') {
      if (!(candidate <= today)) return failWithLabel('must be today or in the past')
    } else if (constraint === 'future') {
      if (!(candidate > today)) return failWithLabel('must be in the future')
    } else if (constraint === 'todayOrFuture') {
      if (!(candidate >= today)) return failWithLabel('must be today or in the future')
    } else if ('onOrAfter' in constraint && constraint.onOrAfter instanceof Date) {
      if (candidate < constraint.onOrAfter) {
        return failWithLabel(`must be the same as or after ${formatDate(constraint.onOrAfter)}`)
      }
    } else if ('after' in constraint && constraint.after instanceof Date) {
      if (candidate <= constraint.after) {
        return failWithLabel(`must be after ${formatDate(constraint.after)}`)
      }
    } else if ('onOrBefore' in constraint && constraint.onOrBefore instanceof Date) {
      if (candidate > constraint.onOrBefore) {
        return failWithLabel(`must be the same as or before ${formatDate(constraint.onOrBefore)}`)
      }
    } else if ('before' in constraint && constraint.before instanceof Date) {
      if (candidate >= constraint.before) {
        return failWithLabel(`must be before ${formatDate(constraint.before)}`)
      }
    } else if ('between' in constraint && Array.isArray(constraint.between) && constraint.between.length === 2) {
      const [min, max] = constraint.between
      if (!(candidate >= min && candidate <= max)) {
        return failWithLabel(`must be between ${formatDate(min)} and ${formatDate(max)}`)
      }
    }
  }

  return { valid: true, iso: toISODateString({ year, month, day }) }
}

/**
 * Normalise date input that may arrive as an array [d, m, y] or an object
 * { day, month, year } into a consistent object shape.
 *
 * @param {unknown} inputDate - e.g. ['1','9','2025'] or {day:'1', month:'9', year:'2025'}
 * @returns {DateParts} - Always returns an object with day/month/year (possibly undefined).
 *
 * @example
 * getDateParts(['1','9','2025']); // { day:'1', month:'9', year:'2025' }
 */
const getDateParts = (inputDate) => {
  if (Array.isArray(inputDate)) {
    return { day: inputDate[0], month: inputDate[1], year: inputDate[2] }
  }
  if (inputDate && typeof inputDate === 'object') {
    // @ts-ignore - index access ok at runtime
    return { day: inputDate.day, month: inputDate.month, year: inputDate.year }
  }
  return { day: undefined, month: undefined, year: undefined }
}

module.exports = {
  validateDateInput,
  getDateParts,
  todayUTC
}
