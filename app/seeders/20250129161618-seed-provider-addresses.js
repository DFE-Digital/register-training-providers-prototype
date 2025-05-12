const fs = require('fs')
const path = require('path')

const createRevision = require('./helpers/createRevision')
const createActivityLog = require('./helpers/createActivityLog')

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction()

    try {
      await queryInterface.bulkDelete('provider_addresses', null, { transaction })
      await queryInterface.bulkDelete('provider_address_revisions', null, { transaction })
      await queryInterface.bulkDelete('activity_logs', {
        entity_type: 'provider_address'
      }, { transaction })

      const dataPath = path.join(__dirname, '20250129161618-seed-provider-addresses.json')
      const rawData = fs.readFileSync(dataPath, 'utf8')
      const providerAddresses = JSON.parse(rawData)

      const createdAt = new Date()
      const userId = '354751f2-c5f7-483c-b9e4-b6103f50f970'

      for (const address of providerAddresses) {
        if (!address.line1 || !address.town || !address.postcode) continue

        const addressId = address.id
        const revisionNumber = 1

        const baseFields = {
          id: addressId,
          provider_id: address.providerId,
          line_1: address.line1,
          line_2: address.line2,
          line_3: address.line3,
          town: address.town,
          county: address.county,
          postcode: address.postcode,
          latitude: address.latitude,
          longitude: address.longitude,
          created_at: createdAt,
          created_by_id: userId,
          updated_at: createdAt,
          updated_by_id: userId
        }

        // 1. Insert address
        await queryInterface.bulkInsert('provider_addresses', [baseFields], { transaction })

        // 2. Insert revision
        // const revisionId = await createRevision({
        //   revisionTable: 'provider_address_revisions',
        //   entityId: addressId,
        //   revisionData: baseFields,
        //   revisionNumber,
        //   userId,
        //   timestamp: createdAt
        // }, queryInterface, transaction)

        // 3. Insert activity log
        // await createActivityLog({
        //   revisionTable: 'provider_address_revisions',
        //   revisionId,
        //   entityType: 'provider_address',
        //   entityId: addressId,
        //   revisionNumber,
        //   changedById: userId,
        //   changedAt: createdAt
        // }, queryInterface, transaction)
      }

      await transaction.commit()
    } catch (error) {
      console.error('Provider address seeding error with revisions and activity logs:', error)
      await transaction.rollback()
      throw error
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('activity_logs', {
      entity_type: 'provider_address'
    })
    await queryInterface.bulkDelete('provider_address_revisions', null, {})
    await queryInterface.bulkDelete('provider_addresses', null, {})
  }
}
