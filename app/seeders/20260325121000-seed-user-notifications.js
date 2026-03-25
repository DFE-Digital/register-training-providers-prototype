const { v4: uuidv4 } = require('uuid')

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction()

    try {
      await queryInterface.bulkDelete('user_notifications', null, { transaction })

      const createdAt = new Date()
      const systemUserId = '354751f2-c5f7-483c-b9e4-b6103f50f970'

      const users = [
        '3faa7586-951b-495c-9999-e5fc4367b507',
        systemUserId,
        '41a420d8-8dc4-40a7-b724-31b5e512cffc',
        '99c07212-6395-40b5-9776-9210645a5028',
        '8c1e5a61-1a3a-4d0f-bf2d-8c078d3a5450',
        '93ed24a3-61e8-4d75-8466-8f71f0930c88',
        'b0ad7c0e-5fc6-4dd7-8a85-44b4d80d3af1',
        '0ccff9c3-64dc-4b5a-b9a0-241f3c50dfb1'
      ]

      const rows = users.map((userId) => ({
        id: uuidv4(),
        user_id: userId,
        notification_frequency: 'daily',
        provider_details: true,
        provider_accreditations: true,
        provider_addresses: true,
        provider_contacts: true,
        provider_partnerships: true,
        provider_users: true,
        created_at: createdAt,
        created_by_id: systemUserId,
        updated_at: createdAt,
        updated_by_id: systemUserId
      }))

      if (rows.length > 0) {
        await queryInterface.bulkInsert('user_notifications', rows, { transaction })
      }

      await transaction.commit()
    } catch (error) {
      console.error('User notification seeding error:', error)
      await transaction.rollback()
      throw error
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('user_notifications', null, {})
  }
}
