/**
 * Parses an array of address objects into a format suitable for use with GOV.UK radio components.
 *
 * Each address object must have a `UPRN` (Unique Property Reference Number) and `ADDRESS` string.
 * The returned array contains objects with `text`, `value`, and `id` properties expected by GOV.UK radios.
 *
 * @param {Array<{ UPRN: string, ADDRESS: string }>} addresses - The list of addresses to transform.
 * @returns {Array<{ text: string, value: string, id: string }>} The transformed address data.
 */
const parseForGovukRadios = (addresses) => {
  return addresses.map(address => {
    return {
      text: address.ADDRESS, // The label shown in the radio button
      value: address.UPRN,   // The value that is submitted or processed
      id: address.UPRN       // Used for HTML input ID to associate label
    }
  })
}

/**
 * Parses an OS Places address object into a structured address format with up to three address lines.
 *
 * The function prioritises sub-building and building names for line 1, followed by building number
 * and street names, then locality information. Remaining data overflows into line 2 and line 3.
 *
 * @param {Object} address - The raw address object from OS Places.
 * @param {string} [address.SUB_BUILDING_NAME] - Name of sub-building (e.g. Flat 2).
 * @param {string} [address.BUILDING_NAME] - Name of building (e.g. The Oaks).
 * @param {string} [address.BUILDING_NUMBER] - Street/building number (e.g. 123).
 * @param {string} [address.DEPENDENT_THOROUGHFARE_NAME] - Dependent street name.
 * @param {string} [address.THOROUGHFARE_NAME] - Main street name.
 * @param {string} [address.DOUBLE_DEPENDENT_LOCALITY] - Smallest locality, e.g. hamlet or village.
 * @param {string} [address.DEPENDENT_LOCALITY] - Secondary locality, e.g. suburb.
 * @param {string} [address.POST_TOWN] - Post town (e.g. London).
 * @param {string} [address.POSTCODE] - Postcode (e.g. SW1A 1AA).
 * @param {string} [address.UPRN] - Unique Property Reference Number.
 *
 * @returns {{
 *   uprn: string|null,
 *   line1: string,
 *   line2: string,
 *   line3: string,
 *   town: string,
 *   county: string,
 *   postcode: string
 * }} A structured address object suitable for form display or storage.
 */
const parseOsPlacesData = (address) => {
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
}

/**
 * Converts a structured address object into a single-line comma-separated string.
 *
 * Filters out any empty or whitespace-only values from the address components before joining.
 *
 * @param {Object} [data={}] - The address object.
 * @param {string} [data.line1] - First line of the address.
 * @param {string} [data.line2] - Second line of the address.
 * @param {string} [data.line3] - Third line of the address.
 * @param {string} [data.town] - Town or city.
 * @param {string} [data.county] - County or administrative region.
 * @param {string} [data.postcode] - Postcode.
 *
 * @returns {string} A comma-separated address string containing only the non-empty components.
 */
const parseAddressAsString = (data = {}) => {
  const { line1, line2, line3, town, county, postcode } = data

  // Keep only non-null, non-empty strings
  const addressParts = [line1, line2, line3, town, county, postcode]
    .filter(part => part && part.trim().length > 0)

  // Create a single-line address
  return addressParts.join(', ')
}

module.exports = {
  parseForGovukRadios,
  parseOsPlacesData,
  parseAddressAsString
}
