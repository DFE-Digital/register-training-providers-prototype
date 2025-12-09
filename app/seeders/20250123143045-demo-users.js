const createRevision = require('./helpers/createRevision')
const createActivityLog = require('./helpers/createActivityLog')

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction()

    try {
      await queryInterface.bulkDelete('users', null, { transaction })
      await queryInterface.bulkDelete('user_revisions', null, { transaction })
      await queryInterface.bulkDelete('activity_logs', {
        entity_type: 'user'
      }, { transaction })

      const createdAt = new Date()
      const systemUserId = '354751f2-c5f7-483c-b9e4-b6103f50f970' // Acting user ID for changes
      const revisionNumber = 1

      const users = [
        {
          id: '3faa7586-951b-495c-9999-e5fc4367b507',
          first_name: 'Anne',
          last_name: 'Wilson',
          email: 'test1@education.gov.uk',
          is_api_user: false,
          is_active: true
        },
        {
          id: systemUserId,
          first_name: 'Colin',
          last_name: 'Chapman',
          email: 'test2@education.gov.uk',
          is_api_user: false,
          is_active: true
        },
        {
          id: '41a420d8-8dc4-40a7-b724-31b5e512cffc',
          first_name: 'Hannah',
          last_name: 'Mills',
          email: 'test3@education.gov.uk',
          is_api_user: true,
          is_active: true
        },
        {
          id: '99c07212-6395-40b5-9776-9210645a5028',
          first_name: 'Mary',
          last_name: 'Lawson',
          email: 'test4@education.gov.uk',
          is_api_user: false,
          is_active: false
        }
      ]

      for (const user of users) {
        const baseFields = {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          password: 'bat', // Placeholder password for prototype
          is_active: user.is_active,
          is_api_user: user.is_api_user,
          created_by_id: systemUserId,
          created_at: createdAt,
          updated_by_id: systemUserId,
          updated_at: createdAt
        }

        // 1. Insert into users table
        await queryInterface.bulkInsert('users', [baseFields], { transaction })

        // 2. Create revision
        const { id: _, ...revisionDataWithoutId } = baseFields

        const revisionId = await createRevision({
          revisionTable: 'user_revisions',
          entityId: user.id,
          revisionData: revisionDataWithoutId,
          revisionNumber,
          userId: systemUserId,
          timestamp: createdAt
        }, queryInterface, transaction)

        // 3. Create activity log
        await createActivityLog({
          revisionTable: 'user_revisions',
          revisionId,
          entityType: 'user',
          entityId: user.id,
          revisionNumber,
          changedById: systemUserId,
          changedAt: createdAt
        }, queryInterface, transaction)
      }

      await transaction.commit()
    } catch (error) {
      console.error('User seeding error with revisions and activity logs:', error)
      await transaction.rollback()
      throw error
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('activity_logs', {
      entity_type: 'user'
    })
    await queryInterface.bulkDelete('user_revisions', null, {})
    await queryInterface.bulkDelete('users', null, {})
  }
}
