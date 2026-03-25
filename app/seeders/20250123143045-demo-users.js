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
          type: 'support',
          is_active: true
        },
        {
          id: systemUserId,
          first_name: 'Colin',
          last_name: 'Chapman',
          email: 'test2@education.gov.uk',
          type: 'support',
          is_active: true
        },
        {
          id: '41a420d8-8dc4-40a7-b724-31b5e512cffc',
          first_name: 'Hannah',
          last_name: 'Mills',
          email: 'test3@education.gov.uk',
          type: 'api',
          is_active: true
        },
        {
          id: '99c07212-6395-40b5-9776-9210645a5028',
          first_name: 'Mary',
          last_name: 'Lawson',
          email: 'test4@education.gov.uk',
          type: 'support',
          is_active: false
        },
        {
          id: '8c1e5a61-1a3a-4d0f-bf2d-8c078d3a5450',
          first_name: 'John',
          last_name: 'Barnard',
          email: 'john.barnard@example.com',
          type: 'provider',
          is_active: true
        },
        {
          id: '93ed24a3-61e8-4d75-8466-8f71f0930c88',
          first_name: 'Laura',
          last_name: 'Mueller',
          email: 'laura.mueller@example.com',
          type: 'provider',
          is_active: true
        },
        {
          id: 'b0ad7c0e-5fc6-4dd7-8a85-44b4d80d3af1',
          first_name: 'Ella',
          last_name: 'Lombardi',
          email: 'ella.lombardi@example.com',
          type: 'provider',
          is_active: true
        },
        {
          id: '0ccff9c3-64dc-4b5a-b9a0-241f3c50dfb1',
          first_name: 'Marta',
          last_name: 'Garcia',
          email: 'marta.garcia@example.com',
          type: 'provider',
          is_active: true
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
          type: user.type,
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
