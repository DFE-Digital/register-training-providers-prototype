const parseForGovukRadios = (addresses) => {
  // addresses: [
  //   { UPRN: "10091843700", ADDRESS: "DEPARTMENT OF EDUCATION, ..." },
  //   { UPRN: "100023622080", ADDRESS: "THE ROYAL ANNIVERSARY TRUST, ..." },
  //   ...
  // ]

  return addresses.map(address => {
    return {
      text: address.ADDRESS, // The label shown in the radio button
      value: address.UPRN,   // The value that is submitted or processed
      id: address.UPRN   // The value that is submitted or processed
    }
  })
}

const parseOsPlacesData = (addresses) => {
  return addresses.map(address => {
    // Initialise lines as empty arrays
    let line1Arr = []
    let line2Arr = []
    let line3Arr = []

    // If these attributes exist, put them into line_1
    if (address.SUB_BUILDING_NAME) {
      line1Arr.push(address.SUB_BUILDING_NAME)
    }
    if (address.BUILDING_NAME) {
      line1Arr.push(address.BUILDING_NAME)
    }

    // Next set goes to line_1 if it's empty, otherwise line_2
    const addressPart2 = []
    if (address.BUILDING_NUMBER) {
      addressPart2.push(address.BUILDING_NUMBER)
    }
    if (address.DEPENDENT_THOROUGHFARE_NAME) {
      addressPart2.push(address.DEPENDENT_THOROUGHFARE_NAME)
    }
    if (address.THOROUGHFARE_NAME) {
      addressPart2.push(address.THOROUGHFARE_NAME)
    }

    if (line1Arr.length === 0) {
      line1Arr = addressPart2
    } else {
      line2Arr = addressPart2
    }

    // Next set goes to line_2 if it's empty, otherwise line_3
    const addressPart3 = []
    if (address.DOUBLE_DEPENDENT_LOCALITY) {
      addressPart3.push(address.DOUBLE_DEPENDENT_LOCALITY)
    }
    if (address.DEPENDENT_LOCALITY) {
      addressPart3.push(address.DEPENDENT_LOCALITY)
    }

    if (line2Arr.length === 0) {
      line2Arr = addressPart3
    } else {
      line3Arr = addressPart3
    }

    // Build final lines
    const line1 = line1Arr.join(', ')
    const line2 = line2Arr.join(', ')
    const line3 = line3Arr.join(', ')

    // Construct final object
    return {
      uprn: address.UPRN || null,
      line1,
      line2,
      line3,
      town: address.POST_TOWN || '',
      county: '', // or set it if you have county data
      postcode: address.POSTCODE || ''
    }
  })
}

module.exports = {
  parseForGovukRadios,
  parseOsPlacesData
}
