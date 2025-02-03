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
      label = 'Higher education institution'
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
 example: {{ params.date | date("DD/MM/YYYY") }}
 outputs: 01/01/1970
------------------------------------------------------------------ */
addFilter('date', (timestamp, format = 'yyyy-LL-dd') => {
  let datetime = DateTime.fromJSDate(timestamp, {
    locale: 'en-GB'
  }).toFormat(format)

  if (datetime === 'Invalid DateTime') {
    datetime = DateTime.fromISO(timestamp, {
      locale: 'en-GB'
    }).toFormat(format)
  }

  return datetime
})
