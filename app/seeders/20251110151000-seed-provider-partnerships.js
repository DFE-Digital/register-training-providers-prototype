const fs = require('fs')
const path = require('path')

const createRevision = require('./helpers/createRevision')
const createActivityLog = require('./helpers/createActivityLog')

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction()

    try {
      await queryInterface.bulkDelete('provider_partnerships', null, { transaction })
      await queryInterface.bulkDelete('provider_partnership_revisions', null, { transaction })
      await queryInterface.bulkDelete('activity_logs', {
        entity_type: 'provider_partnership'
      }, { transaction })

      const dataPath = path.join(__dirname, '/data/20250207143556-seed-provider-partnership.json')
      const rawData = fs.readFileSync(dataPath, 'utf8')
      const providerPartnerships = JSON.parse(rawData)

      const createdAt = new Date()
      const userId = '354751f2-c5f7-483c-b9e4-b6103f50f970'

      for (const providerPartnership of providerPartnerships) {
        const providerPartnershipId = providerPartnership.id
        const revisionNumber = 1

        // Prepare base fields for both insert and revision
        const baseFields = {
          id: providerPartnershipId,
          accredited_provider_id: providerPartnership.accreditedProviderId,
          training_provider_id: providerPartnership.trainingProviderId,
          starts_on: new Date('2024-08-01'),
          created_at: createdAt,
          created_by_id: userId,
          updated_at: createdAt,
          updated_by_id: userId
        }

        // 1. Insert partnership
        await queryInterface.bulkInsert('provider_partnerships', [baseFields], { transaction })

        // 2. Insert revision using helper
        const { id: _, ...revisionData } = baseFields

        const revisionId = await createRevision({
          revisionTable: 'provider_partnership_revisions',
          entityId: providerPartnershipId,
          revisionData,
          revisionNumber,
          userId,
          timestamp: createdAt
        }, queryInterface, transaction)

        // 3. Insert activity log using helper
        await createActivityLog({
          revisionTable: 'provider_partnership_revisions',
          revisionId,
          entityType: 'provider_partnership',
          entityId: providerPartnershipId,
          revisionNumber,
          changedById: userId,
          changedAt: createdAt
        }, queryInterface, transaction)
      }

      await transaction.commit()
    } catch (error) {
      console.error('Provider partnership seeding error with revisions and activity logs:', error)
      await transaction.rollback()
      throw error
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('activity_logs', {
      entity_type: 'provider_partnership'
    })
    await queryInterface.bulkDelete('provider_partnership_revisions', null, {})
    await queryInterface.bulkDelete('provider_partnerships', null, {})
  }
}
