const fs = require('fs')
const path = require('path')

const createRevision = require('./helpers/createRevision')
const createActivityLog = require('./helpers/createActivityLog')

/**
 * Get the latest accreditation id for a provider (by created_at DESC).
 * Assumes the table is `provider_accreditations` with columns:
 *   id (UUID), provider_id (UUID), created_at (DATETIME)
 */
async function getLatestAccreditationId(queryInterface, providerId, transaction) {
  const [rows] = await queryInterface.sequelize.query(
    `
      SELECT id
      FROM provider_accreditations
      WHERE provider_id = :providerId
      ORDER BY created_at DESC
      LIMIT 1
    `,
    {
      replacements: { providerId },
      transaction
    }
  )
  return rows && rows.length ? rows[0].id : null
}

module.exports = {
  up: async (queryInterface) => {
    const transaction = await queryInterface.sequelize.transaction()

    try {
      // 1) Clear existing data for a clean reseed (mirror your old pattern)
      await queryInterface.bulkDelete('provider_accreditation_partnerships', null, { transaction })
      await queryInterface.bulkDelete('provider_accreditation_partnership_revisions', null, { transaction })
      await queryInterface.bulkDelete('activity_logs', {
        entity_type: 'provider_accreditation_partnership'
      }, { transaction })

      // 2) Read previous partnership pairings
      const dataPath = path.join(__dirname, '/data/20250207143556-seed-provider-partnership.json')
      const rawData = fs.readFileSync(dataPath, 'utf8')
      const providerPartnerships = JSON.parse(rawData)

      const createdAt = new Date()
      const userId = '354751f2-c5f7-483c-b9e4-b6103f50f970'
      const revisionNumber = 1

      for (const p of providerPartnerships) {
        // Guard rails
        if (!p.trainingProviderId || !p.accreditedProviderId) continue
        if (p.trainingProviderId === p.accreditedProviderId) continue

        // Resolve latest accreditation for the accredited provider
        const latestAccreditationId = await getLatestAccreditationId(
          queryInterface,
          p.accreditedProviderId,
          transaction
        )

        if (!latestAccreditationId) {
          console.warn(`⚠️  No accreditation found for accredited provider ${p.accreditedProviderId}; skipping.`)
          continue
        }

        // Use the same partnership id from the old file (keeps traceability),
        // or generate your own if you prefer.
        const id = p.id

        const baseFields = {
          id,
          provider_accreditation_id: latestAccreditationId, // FK -> provider_accreditations.id
          partner_id: p.trainingProviderId,        // FK -> providers.id
          created_at: createdAt,
          created_by_id: userId,
          updated_at: createdAt,
          updated_by_id: userId
        }

        // 3) Insert provider_accreditation_partnership
        await queryInterface.bulkInsert('provider_accreditation_partnerships', [baseFields], { transaction })

        // 4) Insert revision (omit id)
        const { id: _omit, ...revisionData } = baseFields
        const revisionId = await createRevision({
          revisionTable: 'provider_accreditation_partnership_revisions',
          entityId: id,
          revisionData,
          revisionNumber,
          userId,
          timestamp: createdAt
        }, queryInterface, transaction)

        // 5) Log activity
        await createActivityLog({
          revisionTable: 'provider_accreditation_partnership_revisions',
          revisionId,
          entityType: 'provider_accreditation_partnership',
          entityId: id,
          revisionNumber,
          changedById: userId,
          changedAt: createdAt
        }, queryInterface, transaction)
      }

      await transaction.commit()
      console.log('✅ Seeded provider_accreditation_partnerships + revisions + activity logs')
    } catch (error) {
      console.error('❌ Seeding error:', error)
      await transaction.rollback()
      throw error
    }
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('activity_logs', {
      entity_type: 'provider_accreditation_partnership'
    })
    await queryInterface.bulkDelete('provider_accreditation_partnership_revisions', null, {})
    await queryInterface.bulkDelete('provider_accreditation_partnerships', null, {})
  }
}
