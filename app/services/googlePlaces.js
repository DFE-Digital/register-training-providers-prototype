const axios = require('axios')

const apiKey = process.env.GOOGLE_PLACES_API_KEY

// Find places that match a free text search
const find = async (query, options = {}) => {

  // Construct the URL to fetch OS Places data
  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&language=en&components=country:uk&key=${apiKey}`;

  try {
    // Fetch data from OS Places API
    const response = await axios.get(url)

    // Destructure the "results" array off the data
    const { results } = response.data

    // Map over results and extract the DPA object from each item
    const addresses = results.map(item => {
      // TODO: parse results
    })

    // Return the array of address objects
    return addresses
  } catch (error) {
    console.error('Error fetching addresses:', error)
    return [] // swallow the error and return an empty array
    // throw error
  }
}

// Get the address for a specific place_id
const findByPlaceId = async (placeId, options = {}) => {
  // Construct the URL to fetch OS Places data
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&language=en&components=country:uk&key=${apiKey}`;

  try {
    // Fetch data from OS Places API
    const response = await axios.get(url)

    // Destructure the "results" array off the data
    const { results } = response.data

    // Map over results and extract the DPA object from each item
    const address = results.map(item => {
      // TODO: parse results
    })

    // Return the array of address objects
    return address
  } catch (error) {
    console.error('Error fetching address:', error)
    return {} // swallow the error and return an empty object
    // throw error
  }
}

module.exports = {
  find,
  findByPlaceId
}
