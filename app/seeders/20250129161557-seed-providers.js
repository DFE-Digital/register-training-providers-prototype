const fs = require('fs')
const path = require('path')

const createRevision = require('./helpers/createRevision')
const createActivityLog = require('./helpers/createActivityLog')
const { nullIfEmpty } = require('../helpers/string')

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction()

    try {
      await queryInterface.bulkDelete('providers', null, { transaction })
      await queryInterface.bulkDelete('provider_revisions', null, { transaction })
      await queryInterface.bulkDelete('activity_logs', {
        entity_type: 'provider'
      }, { transaction })

      const dataPath = path.join(__dirname, '20250129161557-seed-providers.json')
      const rawData = fs.readFileSync(dataPath, 'utf8')
      const providers = JSON.parse(rawData)

      const createdAt = new Date()
      const userId = '354751f2-c5f7-483c-b9e4-b6103f50f970'

      for (const provider of providers) {
        const providerId = provider.id
        const revisionNumber = 1

        // Prepare base fields for both insert and revision
        const baseFields = {
          id: providerId,
          operating_name: provider.operatingName,
          legal_name: provider.legalName,
          type: provider.type,
          ukprn: provider.ukprn,
          urn: nullIfEmpty(provider.urn),
          code: provider.code,
          website: provider.website,
          created_at: createdAt,
          created_by_id: userId,
          updated_at: createdAt,
          updated_by_id: userId
        }

        // 1. Insert provider
        await queryInterface.bulkInsert('providers', [baseFields], { transaction })

        // 2. Insert revision using helper
        // const revisionId = await createRevision({
        //   revisionTable: 'provider_revisions',
        //   entityId: providerId,
        //   revisionData: baseFields,
        //   revisionNumber,
        //   userId,
        //   timestamp: createdAt
        // }, queryInterface, transaction)

        // 3. Insert activity log using helper
        // await createActivityLog({
        //   revisionTable: 'provider_revisions',
        //   revisionId,
        //   entityType: 'provider',
        //   entityId: providerId,
        //   revisionNumber,
        //   changedById: userId,
        //   changedAt: createdAt
        // }, queryInterface, transaction)
      }

      await transaction.commit()
    } catch (error) {
      console.error('Provider seeding error with revisions and activity logs:', error)
      await transaction.rollback()
      throw error
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('activity_logs', {
      entity_type: 'provider'
    })
    await queryInterface.bulkDelete('provider_revisions', null, {})
    await queryInterface.bulkDelete('providers', null, {})
  }
}
