const fs = require('fs')
const path = require('path')

const createRevision = require('./helpers/createRevision')
const createActivityLog = require('./helpers/createActivityLog')

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction()

    try {
      await queryInterface.bulkDelete('provider_accreditations', null, { transaction })
      await queryInterface.bulkDelete('provider_accreditation_revisions', null, { transaction })
      await queryInterface.bulkDelete('activity_logs', {
        entity_type: 'provider_accreditation'
      }, { transaction })

      const dataPath = path.join(__dirname, '/data/20260217144418-seed-provider-accreditations.json')
      const rawData = fs.readFileSync(dataPath, 'utf8')
      const accreditations = JSON.parse(rawData)

      const createdAt = new Date()
      const userId = '354751f2-c5f7-483c-b9e4-b6103f50f970'

      const now = new Date()
      const accreditedProviderIds = new Set()

      for (const accreditation of accreditations) {
        if (!accreditation.number) continue

        const accreditationId = accreditation.id
        const revisionNumber = 1
        const startsOn = new Date(accreditation.startsOn)
        const endsOn = accreditation.endsOn ? new Date(accreditation.endsOn) : null

        const baseFields = {
          id: accreditationId,
          provider_id: accreditation.providerId,
          number: accreditation.number,
          starts_on: startsOn,
          ends_on: endsOn,
          created_at: createdAt,
          created_by_id: userId,
          updated_at: createdAt,
          updated_by_id: userId
        }

        // 1. Insert into base table
        await queryInterface.bulkInsert('provider_accreditations', [baseFields], { transaction })

        // 2. Create revision
        const { id: _, ...revisionData } = baseFields

        const revisionId = await createRevision({
          revisionTable: 'provider_accreditation_revisions',
          entityId: accreditationId,
          revisionData,
          revisionNumber,
          userId,
          timestamp: createdAt
        }, queryInterface, transaction)

        // 3. Create activity log
        await createActivityLog({
          revisionTable: 'provider_accreditation_revisions',
          revisionId,
          entityType: 'provider_accreditation',
          entityId: accreditationId,
          revisionNumber,
          changedById: userId,
          changedAt: createdAt
        }, queryInterface, transaction)

        if (startsOn <= now && (!endsOn || endsOn >= now)) {
          accreditedProviderIds.add(accreditation.providerId)
        }
      }

      if (accreditedProviderIds.size > 0) {
        await queryInterface.bulkUpdate(
          'providers',
          { is_accredited: true },
          { id: Array.from(accreditedProviderIds) },
          { transaction }
        )

        await queryInterface.bulkUpdate(
          'provider_revisions',
          { is_accredited: true },
          { provider_id: Array.from(accreditedProviderIds) },
          { transaction }
        )
      }

      await transaction.commit()
    } catch (error) {
      console.error('Provider accreditation seeding error with revisions and activity logs:', error)
      await transaction.rollback()
      throw error
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('activity_logs', {
      entity_type: 'provider_accreditation'
    })
    await queryInterface.bulkDelete('provider_accreditation_revisions', null, {})
    await queryInterface.bulkDelete('provider_accreditations', null, {})
  }
}
