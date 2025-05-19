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

      const dataPath = path.join(__dirname, '20250207143556-seed-provider-partnership.json')
      const rawData = fs.readFileSync(dataPath, 'utf8')
      const providerPartnerships = JSON.parse(rawData)

      const createdAt = new Date()
      const userId = '354751f2-c5f7-483c-b9e4-b6103f50f970'
      const revisionNumber = 1

      for (const partnership of providerPartnerships) {
        if (!partnership.trainingProviderId) continue
        if (partnership.trainingProviderId === partnership.accreditedProviderId) continue

        const id = partnership.id

        const baseFields = {
          id,
          training_provider_id: partnership.trainingProviderId,
          accredited_provider_id: partnership.accreditedProviderId,
          created_at: createdAt,
          created_by_id: userId,
          updated_at: createdAt,
          updated_by_id: userId
        }

        // 1. Insert provider_partnership
        await queryInterface.bulkInsert('provider_partnerships', [baseFields], { transaction })

        // 2. Insert revision (omit id)
        const { id: _, ...revisionData } = baseFields

        const revisionId = await createRevision({
          revisionTable: 'provider_partnership_revisions',
          entityId: id,
          revisionData,
          revisionNumber,
          userId,
          timestamp: createdAt
        }, queryInterface, transaction)

        // 3. Log activity
        await createActivityLog({
          revisionTable: 'provider_partnership_revisions',
          revisionId,
          entityType: 'provider_partnership',
          entityId: id,
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
