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

module.exports = {
  govukDate,
  govukDateTime,
  govukTime,
  isoDateFromDateInput,
  isValidDate
}
