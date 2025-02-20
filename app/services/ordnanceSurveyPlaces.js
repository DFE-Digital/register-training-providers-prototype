const axios = require('axios')
const inflection = require('inflection')

const apiKey = process.env.OS_PLACES_API_KEY

// Helper function: title case the text if not empty, otherwise return null
const titleCaseOrNull = (value) => {
  return (value && value.trim().length > 0)
    ? inflection.titleize(value.trim())
    : null
}

const sanitiseAddress = (data = {}) => {
  // Destructure fields from data
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

  // Sanitize each field
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

  // Construct the ADDRESS from sanitized fields,
  // ignoring null or empty values
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
  ].filter(Boolean) // keep only non-null, non-empty

  // Create a single line address
  // OS place data already has this, but it is not sanitised
  const ADDRESS = addressParts.join(', ')

  // Return a normalised address object
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
    ADDRESS,
    LATITUDE: LAT ?? null,
    LONGITUDE: LNG ?? null
  }
}

// Find places that match a free text search
// https://docs.os.uk/os-apis/accessing-os-apis/os-places-api/getting-started-with-example-queries-using-node.js#running-a-find-query
const find = async (query, options = {}) => {
  const maxresults = options.maxresults || 25

  // Construct the URL to fetch OS Places data
  const url = `https://api.os.uk/search/places/v1/find?query=${encodeURIComponent(query)}&maxresults=${maxresults}&key=${apiKey}`;

  try {
    // Fetch data from OS Places API
    const response = await axios.get(url)

    // Destructure the "results" array off the data
    const { results } = response.data

    // Map over results and extract the DPA object from each item
    const addresses = results.map(item => {
      return sanitiseAddress(item.DPA)
    })

    // Return the array of address objects
    return addresses
  } catch (error) {
    console.error('Error fetching addresses:', error)
    return [] // swallow the error and return an empty array
    // throw error
  }
}

// Find places that match a full or partial postcode
// https://docs.os.uk/os-apis/accessing-os-apis/os-places-api/getting-started-with-example-queries-using-node.js#running-a-postcode-query
const findByPostcode = async (postcode, building = null, options = {}) => {
  const maxresults = options.maxresults || 25

  // Construct the URL to fetch OS Places data
  const url = `https://api.os.uk/search/places/v1/postcode?postcode=${encodeURIComponent(postcode)}&maxresults=${maxresults}&key=${apiKey}`

  try {
    // Fetch data from OS Places API
    const response = await axios.get(url)

    console.log(response.data);


    // Destructure the "results" array off the data
    const { results } = response.data

    // Map over results and extract the DPA object from each item
    let addresses = results.map(item => {
      return sanitiseAddress(item.DPA)
    })

    console.log(addresses);

    // Filter addresses that match building details
    if (building?.length) {
      const query = building.toUpperCase()

      addresses = addresses.filter(address => {
        return (
          address?.BUILDING_NAME?.includes(query) ||
          address?.BUILDING_NUMBER?.includes(query)
        )
      })
    }

    // Return the array of address objects
    return addresses
  } catch (error) {
    console.error('Error fetching addresses:', error)
    return [] // swallow the error and return an empty array
    // throw error
  }
}

// Get the address for a specific UPRN
// https://docs.os.uk/os-apis/accessing-os-apis/os-places-api/getting-started-with-example-queries-using-node.js#running-a-uprn-query
const findByUPRN = async (uprn, options = {}) => {
  // Construct the URL to fetch OS Places data
  const url = `https://api.os.uk/search/places/v1/uprn?uprn=${uprn}&key=${apiKey}`;

  try {
    // Fetch data from OS Places API
    const response = await axios.get(url)

    // Destructure the "results" array off the data
    const { results } = response.data

    // Map over results and extract the DPA object from each item
    const address = results.map(item => {
      return sanitiseAddress(item.DPA)
    })[0]

    console.log('service', address);


    // Return the array of address objects
    return address
  } catch (error) {
    console.error('Error fetching addresses:', error)
    return {} // swallow the error and return an empty object
    // throw error
  }
}

module.exports = {
  find,
  findByPostcode,
  findByUPRN
}
