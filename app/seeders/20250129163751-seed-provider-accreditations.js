const fs = require('fs')
const path = require('path')

module.exports = {
  up: async (queryInterface, Sequelize) => {

    await queryInterface.bulkDelete('provider_accreditations', null, {})

    try {
      // Read and parse JSON file
      const dataPath = path.join(__dirname, '20250129163751-seed-provider-accreditations.json')
      const rawData = fs.readFileSync(dataPath, 'utf8')
      const providerAccreditations = JSON.parse(rawData)

      // Map JSON keys to database column names
      const formattedProviderAccreditations = providerAccreditations.map(providerAccreditation => ({
        id: providerAccreditation.id,
        provider_id: providerAccreditation.providerId, // JSON "providerId" → DB "provider_id"
        number: providerAccreditation.number,// JSON "number" → DB "number"
        starts_on: providerAccreditation.startsOn, // JSON "startsOn" → DB "starts_on"
        created_at: new Date(),
        created_by_id: '354751f2-c5f7-483c-b9e4-b6103f50f970' // Default user
      }))

      // Insert transformed data into the 'Users' table
      await queryInterface.bulkInsert('provider_accreditations', formattedProviderAccreditations, {})
    } catch (error) {
      console.error('Provider accreditation seeding error:', error);
      throw error; // Ensure the process fails visibly
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Remove all entries from the 'provider_accreditations' table
    await queryInterface.bulkDelete('provider_accreditations', null, {})
  }
}
