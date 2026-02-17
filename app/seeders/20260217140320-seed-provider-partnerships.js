const fs = require('fs')
const path = require('path')
const { v4: uuidv4 } = require('uuid')

const createRevision = require('./helpers/createRevision')
const createActivityLog = require('./helpers/createActivityLog')

const DEFAULT_START_DATE = '2024-08-01'
const DEFAULT_ACADEMIC_YEAR_IDS = [
  'aff3b34d-9522-454a-9c03-6a34ae5df0bc', // 2024 to 2025
  'b20143dc-e829-4ed2-ba88-1939b6c4078b', // 2025 to 2026
  'e02e7aa0-ef79-4681-a7dc-ab37958e9f31' // 2026 to 2027
]

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { Op } = Sequelize
    const transaction = await queryInterface.sequelize.transaction()

    try {
      await queryInterface.bulkDelete('activity_logs', {
        entity_type: {
          [Op.in]: ['provider_partnership', 'provider_partnership_academic_year']
        }
      }, { transaction })
      await queryInterface.bulkDelete('provider_partnership_academic_year_revisions', null, { transaction })
      await queryInterface.bulkDelete('provider_partnership_revisions', null, { transaction })
      await queryInterface.bulkDelete('provider_partnership_academic_years', null, { transaction })
      await queryInterface.bulkDelete('provider_partnerships', null, { transaction })
      const dataPath = path.join(__dirname, '/data/20260217140320-seed-provider-partnership.json')
      const rawData = fs.readFileSync(dataPath, 'utf8')
      const providerPartnerships = JSON.parse(rawData)

      const createdAt = new Date()
      const userId = '354751f2-c5f7-483c-b9e4-b6103f50f970'

      for (const providerPartnership of providerPartnerships) {
        const providerPartnershipId = providerPartnership.id
        const revisionNumber = 1

        const startsOnDate = providerPartnership.startsOn
          ? new Date(providerPartnership.startsOn)
          : new Date(DEFAULT_START_DATE)
        const endsOnDate = providerPartnership.endsOn ? new Date(providerPartnership.endsOn) : null

        // Prepare base fields for both insert and revision
        const baseFields = {
          id: providerPartnershipId,
          accredited_provider_id: providerPartnership.accreditedProviderId,
          training_partner_id: providerPartnership.trainingPartnerId,
          starts_on: startsOnDate,
          created_at: createdAt,
          created_by_id: userId,
          updated_at: createdAt,
          updated_by_id: userId
        }
        if (endsOnDate) {
          baseFields.ends_on = endsOnDate
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

        const academicYearIds = Array.isArray(providerPartnership.academicYearIds) && providerPartnership.academicYearIds.length
          ? providerPartnership.academicYearIds
          : DEFAULT_ACADEMIC_YEAR_IDS

        for (const academicYearId of academicYearIds) {
          const linkId = uuidv4()
          const linkFields = {
            id: linkId,
            partnership_id: providerPartnershipId,
            academic_year_id: academicYearId,
            created_at: createdAt,
            created_by_id: userId,
            updated_at: createdAt,
            updated_by_id: userId
          }

          await queryInterface.bulkInsert('provider_partnership_academic_years', [linkFields], { transaction })

          const { id: _linkId, ...linkRevisionData } = linkFields
          const academicYearRevisionId = await createRevision({
            revisionTable: 'provider_partnership_academic_year_revisions',
            entityId: linkId,
            revisionData: linkRevisionData,
            revisionNumber: 1,
            userId,
            timestamp: createdAt
          }, queryInterface, transaction)

          await createActivityLog({
            revisionTable: 'provider_partnership_academic_year_revisions',
            revisionId: academicYearRevisionId,
            entityType: 'provider_partnership_academic_year',
            entityId: linkId,
            revisionNumber: 1,
            changedById: userId,
            changedAt: createdAt
          }, queryInterface, transaction)
        }
      }

      await transaction.commit()
    } catch (error) {
      console.error('Provider partnership seeding error with revisions and activity logs:', error)
      await transaction.rollback()
      throw error
    }
  },

  down: async (queryInterface, Sequelize) => {
    const { Op } = Sequelize
    await queryInterface.bulkDelete('activity_logs', {
      entity_type: {
        [Op.in]: ['provider_partnership', 'provider_partnership_academic_year']
      }
    })
    await queryInterface.bulkDelete('provider_partnership_academic_year_revisions', null, {})
    await queryInterface.bulkDelete('provider_partnership_revisions', null, {})
    await queryInterface.bulkDelete('provider_partnership_academic_years', null, {})
    await queryInterface.bulkDelete('provider_partnerships', null, {})
  }
}
