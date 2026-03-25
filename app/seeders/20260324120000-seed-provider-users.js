const fs = require('fs')
const path = require('path')
const { v4: uuidv4 } = require('uuid')

const createRevision = require('./helpers/createRevision')
const createActivityLog = require('./helpers/createActivityLog')

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction()

    try {
      await queryInterface.bulkDelete('activity_logs', {
        entity_type: 'provider_user'
      }, { transaction })
      await queryInterface.bulkDelete('provider_user_revisions', null, { transaction })
      await queryInterface.bulkDelete('provider_users', null, { transaction })

      const dataPath = path.join(__dirname, '/data/20260217144416-seed-providers.json')
      const rawData = fs.readFileSync(dataPath, 'utf8')
      const providers = JSON.parse(rawData)

      const niotProviders = providers.filter((provider) =>
        typeof provider.operatingName === 'string' && provider.operatingName.startsWith('NIoT')
      )
      const uclProvider = providers.find((provider) => provider.operatingName === 'UCL, University College London')
      const niotAlbanProvider = providers.find((provider) => provider.operatingName === 'NIoT@Alban TSH')

      if (!uclProvider) {
        throw new Error('Could not find provider: UCL, University College London')
      }
      if (!niotAlbanProvider) {
        throw new Error('Could not find provider: NIoT@Alban TSH')
      }

      const createdAt = new Date()
      const systemUserId = '354751f2-c5f7-483c-b9e4-b6103f50f970'
      const revisionNumber = 1

      const userIds = {
        johnBarnard: '8c1e5a61-1a3a-4d0f-bf2d-8c078d3a5450',
        lauraMueller: '93ed24a3-61e8-4d75-8466-8f71f0930c88',
        ellaLombardi: 'b0ad7c0e-5fc6-4dd7-8a85-44b4d80d3af1',
        martaGarcia: '0ccff9c3-64dc-4b5a-b9a0-241f3c50dfb1'
      }

      const providerUserEntries = []

      for (const provider of niotProviders) {
        providerUserEntries.push({
          userId: userIds.johnBarnard,
          providerId: provider.id,
          role: 'admin'
        })
      }

      providerUserEntries.push({
        userId: userIds.lauraMueller,
        providerId: uclProvider.id,
        role: 'admin'
      })

      providerUserEntries.push({
        userId: userIds.ellaLombardi,
        providerId: uclProvider.id,
        role: 'user'
      })

      providerUserEntries.push({
        userId: userIds.martaGarcia,
        providerId: niotAlbanProvider.id,
        role: 'user'
      })

      for (const entry of providerUserEntries) {
        const providerUserId = uuidv4()

        const baseFields = {
          id: providerUserId,
          provider_id: entry.providerId,
          user_id: entry.userId,
          role: entry.role,
          is_active: true,
          created_at: createdAt,
          created_by_id: systemUserId,
          updated_at: createdAt,
          updated_by_id: systemUserId
        }

        await queryInterface.bulkInsert('provider_users', [baseFields], { transaction })

        const { id: _, ...revisionData } = baseFields

        const revisionId = await createRevision({
          revisionTable: 'provider_user_revisions',
          entityId: providerUserId,
          revisionData,
          revisionNumber,
          revisionById: systemUserId,
          revisionAt: createdAt
        }, queryInterface, transaction)

        await createActivityLog({
          revisionTable: 'provider_user_revisions',
          revisionId,
          entityType: 'provider_user',
          entityId: providerUserId,
          revisionNumber,
          changedById: systemUserId,
          changedAt: createdAt
        }, queryInterface, transaction)
      }

      await transaction.commit()
    } catch (error) {
      console.error('Provider user seeding error with revisions and activity logs:', error)
      await transaction.rollback()
      throw error
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('activity_logs', {
      entity_type: 'provider_user'
    })
    await queryInterface.bulkDelete('provider_user_revisions', null, {})
    await queryInterface.bulkDelete('provider_users', null, {})
  }
}
