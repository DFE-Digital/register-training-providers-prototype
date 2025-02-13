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

const getProviderTypeLabel = (code) => {
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
}

module.exports = {
  getAccreditationTypeLabel,
  getProviderTypeLabel
}
