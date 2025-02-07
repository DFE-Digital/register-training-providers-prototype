const fs = require('fs')
const path = require('path')

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Remove all entries from the 'provider_partnerships' table
    await queryInterface.bulkDelete('provider_partnerships', null, {})

    try {
      // Read and parse JSON file
      const dataPath = path.join(__dirname, '20250207143556-seed-provider-partnership.json')
      const rawData = fs.readFileSync(dataPath, 'utf8')
      const providerPartnerships = JSON.parse(rawData)

      const createdAt = new Date()
      const createdById = '354751f2-c5f7-483c-b9e4-b6103f50f970'

      // Map JSON keys to database column names
      const formattedProviderPartnerships = providerPartnerships
        .filter(providerPartnership => providerPartnership.trainingProviderId) // filter out partnerships where provider is null or undefined
        .filter(providerPartnership => providerPartnership.trainingProviderId !== providerPartnership.accreditedProviderId) // filter out partnerships where accredited and training providers are the same
        .map(providerPartnership => ({
          id: providerPartnership.id,
          training_provider_id: providerPartnership.trainingProviderId, // JSON "trainingProviderId" → DB "training_provider_id"
          accredited_provider_id: providerPartnership.accreditedProviderId, // JSON "accreditedProviderId" → DB "accredited_provider_id"
          created_at: createdAt,
          created_by_id: createdById // Default user
        }))

      // Insert transformed data into the 'provider_accreditations' table
      await queryInterface.bulkInsert('provider_partnerships', formattedProviderPartnerships, {})
    } catch (error) {
      console.error('Provider partnership seeding error:', error);
      throw error; // Ensure the process fails visibly
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Remove all entries from the 'provider_partnerships' table
    await queryInterface.bulkDelete('provider_partnerships', null, {})
  }
}
