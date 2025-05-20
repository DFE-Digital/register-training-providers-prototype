const { DateTime } = require('luxon')

const ALLOWED_VALUES_FOR_MONTHS = [
  ['1', '01', 'jan', 'january'],
  ['2', '02', 'feb', 'february'],
  ['3', '03', 'mar', 'march'],
  ['4', '04', 'apr', 'april'],
  ['5', '05', 'may'],
  ['6', '06', 'jun', 'june'],
  ['7', '07', 'jul', 'july'],
  ['8', '08', 'aug', 'august'],
  ['9', '09', 'sep', 'september'],
  ['10', 'oct', 'october'],
  ['11', 'nov', 'november'],
  ['12', 'dec', 'december']
]

const govukDate = (timestamp) => {
  const format = 'd MMMM yyyy'

  let datetime = DateTime.fromJSDate(timestamp, { locale: 'en-GB' }).toFormat(format)

  if (datetime === 'Invalid DateTime') {
    datetime = DateTime.fromISO(timestamp, { locale: 'en-GB' }).toFormat(format)
  }

  return datetime
}

const govukTime = (timestamp) => {
  let datetime = DateTime.fromJSDate(timestamp, { locale: 'en-GB' })

  if (datetime === 'Invalid DateTime') {
    datetime = DateTime.fromISO(timestamp, { locale: 'en-GB' })
  }

  const hour = datetime.toFormat('h:mm').replace(':00', '')
  const meridiem = datetime.toFormat('a').toLowerCase()

  let time = `${hour}${meridiem}`

  if (time === '12am') {
    time = '12am (midnight)'
  } else if (time === '12pm') {
    time = '12pm (midday)'
  }

  return time
}

const govukDateTime = (timestamp, format = false) => {
  if (timestamp === 'today' || timestamp === 'now') {
    timestamp = DateTime.now().toString()
  }

  const date = govukDate(timestamp)
  const time = govukTime(timestamp)

  return format === 'on' ? `${time} on ${date}` : `${date} at ${time}`
}

const parseMonth = (input) => {
  if (input == null) return undefined
  const trimmedLowerCaseInput = input.trim().toLowerCase()
  return ALLOWED_VALUES_FOR_MONTHS.find((month) =>
    month.find((allowedValue) => allowedValue === trimmedLowerCaseInput)
  )?.[0]
}

const isoDateFromDateInput = (object, namePrefix) => {
  let day, month, year

  if (namePrefix) {
    day = Number(object[`${namePrefix}-day`])
    month = Number(parseMonth(object[`${namePrefix}-month`]))
    year = Number(object[`${namePrefix}-year`])
  } else {
    day = Number(object?.day)
    month = Number(parseMonth(object?.month))
    year = Number(object?.year)
  }

  try {
    if (!day) {
      return DateTime.local(year, month).toFormat('yyyy-LL')
    }

    return DateTime.local(year, month, day).toISODate()
  } catch (error) {
    return error.message.split(':')[0]
  }
}

const isValidDate = (value) => {
  const date = new Date(value)
  return date instanceof Date && !isNaN(date)
}

// Single function returning day, month, and year as an object:
const getDateParts = (timestamp) => {
  if (!isValidDate(timestamp)) {
    return null
  }

  const date = new Date(timestamp)

  return {
    day: date.getDate(),
    month: date.getMonth() + 1, // getMonth() is zero-based
    year: date.getFullYear()
  }
}

// Individual helper functions:
const getDay = (timestamp) => {
  if (!isValidDate(timestamp)) {
    return null
  }

  return new Date(timestamp).getDate()
}

const getMonth = (timestamp) => {
  if (!isValidDate(timestamp)) {
    return null
  }

  return new Date(timestamp).getMonth() + 1 // getMonth() is zero-based
}

const getYear = (timestamp) => {
  if (!isValidDate(timestamp)) {
    return null
  }

  return new Date(timestamp).getFullYear()
}

/**
 * Checks if the given date is today.
 * @param {Date|string|number} input - A Date object or something convertible to a Date.
 * @returns {boolean}
 */
function isToday(input) {
  const date = new Date(input)
  const today = new Date()

  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  )
}

/**
 * Checks if the given date is tomorrow.
 * @param {Date|string|number} input - A Date object or something convertible to a Date.
 * @returns {boolean}
 */
function isTomorrow(input) {
  const date = new Date(input)
  const tomorrow = new Date()

  tomorrow.setDate(tomorrow.getDate() + 1)

  return (
    date.getFullYear() === tomorrow.getFullYear() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getDate() === tomorrow.getDate()
  )
}

/**
 * Checks if the given date is yesterday.
 * @param {Date|string|number} input - A Date object or something convertible to a Date.
 * @returns {boolean}
 */
function isYesterday(input) {
  const date = new Date(input)
  const yesterday = new Date()

  yesterday.setDate(yesterday.getDate() - 1)

  return (
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()
  )
}


module.exports = {
  govukDate,
  govukDateTime,
  govukTime,
  isoDateFromDateInput,
  isValidDate,
  getDateParts,
  getDay,
  getMonth,
  getYear,
  isToday,
  isTomorrow,
  isYesterday
}
