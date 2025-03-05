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
  } else {
    if (toBoolean(isAccredited)) {
      label = 'School-centred initial teacher training (SCITT)'
    } else {
      label = 'School'
    }
  }

  return label
}

module.exports = {
  getAccreditationTypeLabel,
  getProviderTypeLabel
}
