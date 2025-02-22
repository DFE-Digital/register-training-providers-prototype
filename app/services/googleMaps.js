const apiKey = process.env.GOOGLE_PLACES_API_KEY

const geocodeAddress = async (addressString) => {
  // Call Google Geocoding API
  // Encode the address string to make it URL-safe
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addressString)}&key=${apiKey}`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.status !== 'OK' || !data.results.length) {
    // Handle no results or API errors
    console.error('Geocoding failed:', data);
    return res.status(400).send('Could not geocode this address');
  }

  // Extract latitude, longitude, and place_id from the first result
  const geocodedResult = data.results[0]

  const { lat, lng } = geocodedResult.geometry.location
  const placeId = geocodedResult.place_id

  return { latitude: lat, longitude: lng, placeId }
}

module.exports = {
  geocodeAddress
}
