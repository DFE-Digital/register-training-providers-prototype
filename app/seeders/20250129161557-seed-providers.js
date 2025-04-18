const fs = require('fs')
const path = require('path')

const { nullIfEmpty } = require('../helpers/string')

module.exports = {
  up: async (queryInterface, Sequelize) => {

    await queryInterface.bulkDelete('providers', null, {})

    try {
      // Read and parse JSON file
      const dataPath = path.join(__dirname, '20250129161557-seed-providers.json')
      const rawData = fs.readFileSync(dataPath, 'utf8')
      const providers = JSON.parse(rawData)

      const createdAt = new Date()
      const userId = '354751f2-c5f7-483c-b9e4-b6103f50f970'

      // Map JSON keys to database column names
      const formattedProviders = providers.map(provider => ({
        id: provider.id,
        operating_name: provider.operatingName, // JSON "operatingName" → DB "operating_name"
        legal_name: provider.legalName, // JSON "legalName" → DB "legal_name"
        type: provider.type, // JSON "type" → DB "type"
        ukprn: provider.ukprn, // JSON "ukprn" → DB "ukprn"
        urn: nullIfEmpty(provider.urn), // JSON "urn" → DB "urn"
        code: provider.code, // JSON "code" → DB "code"
        website: provider.website, // JSON "website" → DB "website"
        created_at: createdAt,
        created_by_id: userId, // Default user
        updated_at: createdAt,
        updated_by_id: userId // Default user
      }))

      // Insert transformed data into the 'providers' table
      await queryInterface.bulkInsert('providers', formattedProviders, {})
    } catch (error) {
      console.error('Provider seeding error:', error);
      throw error; // Ensure the process fails visibly
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Remove all entries from the 'providers' table
    await queryInterface.bulkDelete('providers', null, {})
  }
}
