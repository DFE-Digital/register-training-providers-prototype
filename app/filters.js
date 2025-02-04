const govukPrototypeKit = require('govuk-prototype-kit')
const addFilter = govukPrototypeKit.views.addFilter

const { DateTime } = require('luxon')

/* ------------------------------------------------------------------
utility function to get an error for a component
example: {{ errors | getErrorMessage('title') }}
outputs: "Enter a title"
------------------------------------------------------------------ */
addFilter('getErrorMessage', (array, fieldName) => {
  if (!array || !fieldName) {
    return null
  }

  const error = array.filter((obj) =>
    obj.fieldName === fieldName
  )[0]

  return error
})

/* ------------------------------------------------------------------
utility function to get provider type label
example: {{ "scitt" | getProviderTypeLabel() }}
outputs: "School-centred initial teacher training (SCITT)"
------------------------------------------------------------------ */
addFilter('getProviderTypeLabel', (code) => {
  if (!code) {
    return null
  }

  let label = code

  switch (code) {
    case 'hei':
      label = 'Higher education institution (HEI)'
      break
    case 'scitt':
      label = 'School-centred initial teacher training (SCITT)'
      break
    case 'school':
      label = 'School'
      break
  }

  return label
})

/* ------------------------------------------------------------------
 date filter for use in Nunjucks
 example: {{ params.date | govukDate }}
 outputs: 1 January 1970
------------------------------------------------------------------ */
const govukDate = (timestamp) => {
  const format = 'd MMMM yyyy'

  let datetime = DateTime.fromJSDate(timestamp, { locale: 'en-GB' }).toFormat(format)

  if (datetime === 'Invalid DateTime') {
    datetime = DateTime.fromISO(timestamp, { locale: 'en-GB' }).toFormat(format)
  }

  return datetime
}

addFilter('govukDate', govukDate)

/* ------------------------------------------------------------------
 time filter for use in Nunjucks
 example: {{ params.date | govukTime }}
 outputs: 3:33pm
------------------------------------------------------------------ */
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

addFilter('govukTime', govukTime)

/* ------------------------------------------------------------------
 datetime filter for use in Nunjucks
 example: {{ params.date | govukDateTime }}
 outputs: 1 January 1970 at 3:33pm
 example: {{ params.date | govukDateTime("on") }}
 outputs: 3:33pm on 1 January 1970
------------------------------------------------------------------ */
const govukDateTime = (timestamp, format = false) => {
  if (timestamp === 'today' || timestamp === 'now') {
    timestamp = DateTime.now().toString()
  }

  const date = govukDate(timestamp)
  const time = govukTime(timestamp)

  return format === 'on' ? `${time} on ${date}` : `${date} at ${time}`
}

addFilter('govukDateTime', govukDateTime)
