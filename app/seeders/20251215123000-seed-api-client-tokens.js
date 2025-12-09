const crypto = require('crypto')
const { v4: uuidv4 } = require('uuid')

const createRevision = require('./helpers/createRevision')
const createActivityLog = require('./helpers/createActivityLog')

const hashToken = (token) => {
  const secret = process.env.API_CLIENT_TOKEN_SECRET || 'seed-secret'
  return crypto.createHmac('sha256', secret).update(token).digest('hex')
}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction()

    try {
      await queryInterface.bulkDelete('api_client_tokens', null, { transaction })
      await queryInterface.bulkDelete('api_client_token_revisions', null, { transaction })
      await queryInterface.bulkDelete('activity_logs', {
        entity_type: 'api_client_token'
      }, { transaction })

      const systemUserId = '354751f2-c5f7-483c-b9e4-b6103f50f970'
      const now = new Date()
      const addDays = (days) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
      const createdAt = addDays(-200)

      const apiClients = [
        { clientName: 'Admissions portal', status: 'active', expiresAt: addDays(90) },
        { clientName: 'Funding statements', status: 'active', expiresAt: addDays(150) },
        { clientName: 'Reports dashboard', status: 'active', expiresAt: addDays(210) },
        { clientName: 'Onboarding portal', status: 'active', expiresAt: addDays(45) },
        { clientName: 'Compliance checker', status: 'active', expiresAt: addDays(60) },
        { clientName: 'Outreach toolkit', status: 'active', expiresAt: addDays(180) },
        { clientName: 'Monitoring API', status: 'active', expiresAt: addDays(240) },
        { clientName: 'Mobile provider app', status: 'active', expiresAt: addDays(320) },
        { clientName: 'Legacy data feed', status: 'expired', expiresAt: addDays(-30) },
        { clientName: 'Sandbox integration', status: 'expired', expiresAt: addDays(-75) },
        { clientName: 'CSV bulk import', status: 'expired', expiresAt: addDays(-120) },
        { clientName: 'Analytics prototype', status: 'expired', expiresAt: addDays(-10) },
        { clientName: 'Legacy CRM mirror', status: 'expired', expiresAt: addDays(-190) },
        { clientName: 'Data lake sync', status: 'expired', expiresAt: addDays(-220) },
        { clientName: 'Audit archive', status: 'expired', expiresAt: addDays(-365) },
        { clientName: 'Staging connector', status: 'expired', expiresAt: addDays(-45) },
        { clientName: 'Research partner', status: 'revoked', expiresAt: addDays(60), revokedAt: addDays(-5) },
        { clientName: 'Third-party CRM', status: 'revoked', expiresAt: addDays(10), revokedAt: addDays(-20) },
        { clientName: 'Data broker', status: 'revoked', expiresAt: addDays(-40), revokedAt: addDays(-40) },
        { clientName: 'Internal test harness', status: 'revoked', expiresAt: addDays(30), revokedAt: addDays(-15) },
        { clientName: 'QA automation suite', status: 'revoked', expiresAt: addDays(5), revokedAt: addDays(-7) },
        { clientName: 'External support desk', status: 'revoked', expiresAt: addDays(120), revokedAt: addDays(-60) },
        { clientName: 'Partner marketplace feed', status: 'revoked', expiresAt: addDays(75), revokedAt: addDays(-12) }
      ]

      for (const [index, client] of apiClients.entries()) {
        const id = uuidv4()
        const tokenHash = hashToken(`seed-${client.status}-${index}-${client.clientName}`)
        const changeTimestamp = client.status === 'revoked' ? client.revokedAt || now : now
        const baseFields = {
          id,
          client_name: client.clientName,
          token_hash: tokenHash,
          status: client.status,
          expires_at: client.expiresAt,
          created_at: createdAt,
          created_by_id: systemUserId,
          updated_at: changeTimestamp,
          updated_by_id: systemUserId,
          revoked_at: client.status === 'revoked' ? client.revokedAt || now : null,
          revoked_by_id: client.status === 'revoked' ? systemUserId : null,
          deleted_at: null,
          deleted_by_id: null
        }

        await queryInterface.bulkInsert('api_client_tokens', [baseFields], { transaction })

        const {
          id: _id,
          token_hash: _tokenHash,
          created_at: _createdAt,
          created_by_id: _createdById,
          updated_at: _updatedAt,
          updated_by_id: _updatedById,
          deleted_at: _deletedAt,
          deleted_by_id: _deletedById,
          ...revisionData
        } = baseFields

        const revisionId = await createRevision({
          revisionTable: 'api_client_token_revisions',
          entityId: id,
          revisionData,
          revisionNumber: 1,
          revisionById: systemUserId,
          revisionAt: changeTimestamp,
          fkColumn: 'api_client_token_id'
        }, queryInterface, transaction)

        await createActivityLog({
          revisionTable: 'api_client_token_revisions',
          revisionId,
          entityType: 'api_client_token',
          entityId: id,
          revisionNumber: 1,
          changedById: systemUserId,
          changedAt: changeTimestamp
        }, queryInterface, transaction)
      }

      await transaction.commit()
    } catch (error) {
      console.error('API client token seeding error:', error)
      await transaction.rollback()
      throw error
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('activity_logs', {
      entity_type: 'api_client_token'
    })
    await queryInterface.bulkDelete('api_client_token_revisions', null, {})
    await queryInterface.bulkDelete('api_client_tokens', null, {})
  }
}
