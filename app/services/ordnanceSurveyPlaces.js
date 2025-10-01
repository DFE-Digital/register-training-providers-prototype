const inflection = require('inflection')

const apiKey = process.env.ORDNANCE_SURVEY_API_KEY

/**
 * Helper function: Converts text to Title Case if not empty, otherwise returns null.
 */
const titleCaseOrNull = (value) => {
  return value && value.trim().length > 0
    ? inflection.titleize(value.trim())
    : null
}

/**
 * Performs a fetch request to the OS Places API and returns the `results` array.
 * If the request fails or the response is not OK, logs an error and returns `[]`.
 */
const fetchOsPlacesData = async (url) => {
  try {
    const response = await fetch(url)

    if (!response.ok) {
      console.error(`OS Places request failed with status: ${response.status}`)
      return []
    }

    const data = await response.json()
    return data.results || []
  } catch (error) {
    console.error('Error fetching data from OS Places:', error)
    return [] // Swallow error and return empty array – or throw if you prefer.
  }
}

/**
 * Sanitizes a raw OS Places address object, converting fields to Title Case and
 * constructing a single-line ADDRESS field.
 */
const sanitiseAddress = (data = {}) => {
  const {
    UPRN,
    UDPRN,
    ORGANISATION_NAME,
    DEPARTMENT_NAME,
    SUB_BUILDING_NAME,
    BUILDING_NAME,
    BUILDING_NUMBER,
    DEPENDENT_THOROUGHFARE_NAME,
    THOROUGHFARE_NAME,
    DOUBLE_DEPENDENT_LOCALITY,
    DEPENDENT_LOCALITY,
    POST_TOWN,
    POSTCODE,
    LAT,
    LNG
  } = data

  // Title-case relevant fields
  const orgName = titleCaseOrNull(ORGANISATION_NAME)
  const deptName = titleCaseOrNull(DEPARTMENT_NAME)
  const subBuilding = titleCaseOrNull(SUB_BUILDING_NAME)
  const buildingName = titleCaseOrNull(BUILDING_NAME)
  const buildingNumber = titleCaseOrNull(BUILDING_NUMBER)
  const depThoroughfare = titleCaseOrNull(DEPENDENT_THOROUGHFARE_NAME)
  const thoroughfare = titleCaseOrNull(THOROUGHFARE_NAME)
  const doubleDepLocality = titleCaseOrNull(DOUBLE_DEPENDENT_LOCALITY)
  const depLocality = titleCaseOrNull(DEPENDENT_LOCALITY)
  const postTown = titleCaseOrNull(POST_TOWN)
  const postcode = POSTCODE?.trim() || null

  // Build a single-line address
  const addressParts = [
    orgName,
    deptName,
    subBuilding,
    buildingName,
    buildingNumber,
    depThoroughfare,
    thoroughfare,
    doubleDepLocality,
    depLocality,
    postTown,
    postcode
  ].filter(Boolean)

  return {
    UPRN,
    UDPRN,
    ORGANISATION_NAME: orgName,
    DEPARTMENT_NAME: deptName,
    SUB_BUILDING_NAME: subBuilding,
    BUILDING_NAME: buildingName,
    BUILDING_NUMBER: buildingNumber,
    DEPENDENT_THOROUGHFARE_NAME: depThoroughfare,
    THOROUGHFARE_NAME: thoroughfare,
    DOUBLE_DEPENDENT_LOCALITY: doubleDepLocality,
    DEPENDENT_LOCALITY: depLocality,
    POST_TOWN: postTown,
    POSTCODE: postcode,
    ADDRESS: addressParts.join(', '),
    LATITUDE: LAT ?? null,
    LONGITUDE: LNG ?? null
  }
}

/**
 * Finds places that match a free text search.
 * @param {string} query - Free text search string.
 * @param {object} options - Optional parameters, e.g. { maxresults: 25 }
 * @returns {Promise<Array>} - An array of sanitized address objects.
 */
const find = async (query, options = {}) => {
  const maxresults = options.maxresults || 25
  const url = `https://api.os.uk/search/places/v1/find?query=${encodeURIComponent(query)}&maxresults=${maxresults}&key=${apiKey}`

  const results = await fetchOsPlacesData(url)
  return results.map(item => sanitiseAddress(item.DPA))
}

/**
 * Finds places by postcode, optionally filtering by building name/number.
 * @param {string} postcode - Full or partial postcode.
 * @param {string|null} building - Building name/number to narrow results.
 * @param {object} options - Optional parameters, e.g. { maxresults: 25 }
 * @returns {Promise<Array>} - An array of sanitized address objects.
 */
const findByPostcode = async (postcode, building = null, options = {}) => {
  const maxresults = options.maxresults || 25
  const url = `https://api.os.uk/search/places/v1/postcode?postcode=${encodeURIComponent(postcode)}&maxresults=${maxresults}&key=${apiKey}`

  let addresses = (await fetchOsPlacesData(url)).map(item => sanitiseAddress(item.DPA))

  // If building info is provided, filter results by BUILDING_NAME or BUILDING_NUMBER
  if (building?.length) {
    const query = building.toUpperCase()
    addresses = addresses.filter(address => {
      return (
        address?.BUILDING_NAME?.includes(query) ||
        address?.BUILDING_NUMBER?.includes(query)
      )
    })
  }

  return addresses
}

/**
 * Finds a single address by UPRN.
 * @param {string} uprn
 * @returns {Promise<Object|{}>} - A single sanitized address object or an empty object if not found.
 */
const findByUPRN = async (uprn) => {
  const url = `https://api.os.uk/search/places/v1/uprn?uprn=${uprn}&key=${apiKey}`

  // This returns an array of results typically you’d expect only one for a single UPRN.
  const results = await fetchOsPlacesData(url)
  if (!results.length) {
    return {}
  }

  return sanitiseAddress(results[0].DPA)
}

module.exports = {
  find,
  findByPostcode,
  findByUPRN
}
