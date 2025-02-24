const fs = require('fs')
const path = require('path')

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Remove all entries from the 'provider_addresses' table
    await queryInterface.bulkDelete('provider_addresses', null, {})

    try {
      // Read and parse JSON file
      const dataPath = path.join(__dirname, '20250129161618-seed-provider-addresses.json')
      const rawData = fs.readFileSync(dataPath, 'utf8')
      const providerAddresses = JSON.parse(rawData)

      const createdAt = new Date()
      const userId = '354751f2-c5f7-483c-b9e4-b6103f50f970'

      // Map JSON keys to database column names
      const formattedProviderAddresses = providerAddresses
        .filter(providerAddress => providerAddress.line1 && providerAddress.town && providerAddress.postcode) // filter out addresses where line1, town, or postcode are null or undefined
        .map(providerAddress => ({
          id: providerAddress.id,
          provider_id: providerAddress.providerId,
          line_1: providerAddress.line1, // JSON "line1" → DB "line_1"
          line_2: providerAddress.line2, // JSON "line2" → DB "line_2"
          line_3: providerAddress.line3, // JSON "line3" → DB "line_3"
          town: providerAddress.town,// JSON "town" → DB "town"
          county: providerAddress.county,// JSON "county" → DB "county"
          postcode: providerAddress.postcode,// JSON "postcode" → DB "postcode"
          latitude: providerAddress.latitude, // JSON "latitude" → DB "latitude"
          longitude: providerAddress.longitude, // JSON "longitude" → DB "longitude"
          created_at: createdAt,
          created_by_id: userId, // Default user
          updated_at: createdAt,
          updated_by_id: userId // Default user
        }))

      // Insert transformed data into the 'provider_addresses' table
      await queryInterface.bulkInsert('provider_addresses', formattedProviderAddresses, {})
    } catch (error) {
      console.error('Provider address seeding error:', error);
      throw error; // Ensure the process fails visibly
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Remove all entries from the 'provider_addresses' table
    await queryInterface.bulkDelete('provider_addresses', null, {})
  }
}
