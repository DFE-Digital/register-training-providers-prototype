const axios = require('axios')
const apiKey = process.env.OS_PLACES_API_KEY

const getAddresses = async (params) => {
  const { postcode } = params
  const maxresults = 25

  // Construct the URL to fetch OS Places data
  const url = `https://api.os.uk/search/places/v1/postcode?postcode=${encodeURIComponent(postcode)}&maxresults=${maxresults}&key=${apiKey}`;

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
  getAddresses
}
