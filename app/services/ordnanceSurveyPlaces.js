const axios = require('axios')
const apiKey = process.env.OS_PLACES_API_KEY

const filterAddresses = (addresses) => {

  return data
}

// https://docs.os.uk/os-apis/accessing-os-apis/os-places-api/getting-started-with-example-queries-using-node.js#running-a-find-query
const find = async (query, params = {}) => {
  const maxresults = params.maxresults || 25

  // Construct the URL to fetch OS Places data
  const url = `https://api.os.uk/search/places/v1/find?query=${encodeURIComponent(query)}&maxresults=${maxresults}&key=${apiKey}`;

  try {
    // Fetch data from OS Places API
    const response = await axios.get(url)

    // Destructure the "results" array off the data
    const { results } = response.data

    // Map over results and extract the DPA object from each item
    const addresses = results.map(item => item.DPA)

    // Return the array of address objects
    return addresses
  } catch (error) {
    console.error('Error fetching addresses:', error)
    return [] // swallow the error
    // throw error // or return [] if you want to swallow the error
  }
}

// https://docs.os.uk/os-apis/accessing-os-apis/os-places-api/getting-started-with-example-queries-using-node.js#running-a-postcode-query
const findByPostcode = async (postcode, building = null, params = {}) => {
  const maxresults = params.maxresults || 25

  // Construct the URL to fetch OS Places data
  const url = `https://api.os.uk/search/places/v1/postcode?postcode=${encodeURIComponent(postcode)}&maxresults=${maxresults}&key=${apiKey}`

  try {
    // Fetch data from OS Places API
    const response = await axios.get(url)

    // Destructure the "results" array off the data
    const { results } = response.data

    // Map over results and extract the DPA object from each item
    let addresses = results.map(item => item.DPA)

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
    return [] // swallow the error
    // throw error // or return [] if you want to swallow the error
  }
}

// https://docs.os.uk/os-apis/accessing-os-apis/os-places-api/getting-started-with-example-queries-using-node.js#running-a-uprn-query
const findByUPRN = async (uprn, params = {}) => {
  const maxresults = params.maxresults || 25

  // Construct the URL to fetch OS Places data
  const url = `https://api.os.uk/search/places/v1/uprn?uprn=${encodeURIComponent(uprn)}&maxresults=${maxresults}&key=${apiKey}`;

  try {
    // Fetch data from OS Places API
    const response = await axios.get(url)

    // Destructure the "results" array off the data
    const { results } = response.data

    // Map over results and extract the DPA object from each item
    const addresses = results.map(item => item.DPA)

    // Return the array of address objects
    return addresses
  } catch (error) {
    console.error('Error fetching addresses:', error)
    return [] // swallow the error
    // throw error // or return [] if you want to swallow the error
  }
}

module.exports = {
  find,
  findByPostcode,
  findByUPRN
}
