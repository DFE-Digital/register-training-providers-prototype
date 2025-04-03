const { toBoolean } = require('./boolean')

const getAccreditationTypeLabel = (code) => {
  if (!code) {
    return null
  }

  let label = code

  switch (code) {
    case 'accredited':
      label = 'Accredited'
      break
    case 'notAccredited':
      label = 'Not accredited'
      break
  }

  return label
}

const getProviderTypeLabel = (code, isAccredited = false) => {
  if (!code) {
    return null
  }

  let label = code

  if (code === 'hei') {
    label = 'Higher education institution (HEI)'
  } else if (code === 'school') {
    if (toBoolean(isAccredited)) {
      label = 'School-centred initial teacher training (SCITT)'
    } else {
      label = 'School'
    }
  } else {
    label = 'Other'
  }

  return label
}

const getFeedbackRatingLabel = (code) => {
  if (!code) {
    return null
  }

  let label = code

  switch (code) {
    case '1':
      label = 'Very dissatisfied'
      break
    case '2':
      label = 'Dissatisfied'
      break
    case '3':
      label = 'Neither satisfied nor dissatisfied'
      break
    case '4':
      label = 'Satisfied'
      break
    case '5':
      label = 'Very satisfied'
      break
  }

  return label
}

module.exports = {
  getAccreditationTypeLabel,
  getFeedbackRatingLabel,
  getProviderTypeLabel
}
