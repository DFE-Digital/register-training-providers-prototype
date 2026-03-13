const fs = require('fs')
const path = require('path')

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction()

    try {
      await queryInterface.bulkDelete('provider_contact_types', null, { transaction })

      const dataPath = path.join(__dirname, '/data/20260313122000-seed-provider-contact-types.json')
      const rawData = fs.readFileSync(dataPath, 'utf8')
      const contactTypes = JSON.parse(rawData)

      const createdAt = new Date()
      const userId = '354751f2-c5f7-483c-b9e4-b6103f50f970'

      const rows = contactTypes.map((contactType) => ({
        id: contactType.id,
        name: contactType.name,
        rank: contactType.rank,
        created_at: createdAt,
        created_by_id: userId,
        updated_at: createdAt,
        updated_by_id: userId
      }))

      if (rows.length > 0) {
        await queryInterface.bulkInsert('provider_contact_types', rows, { transaction })
      }

      await transaction.commit()
    } catch (error) {
      console.error('Provider contact type seeding error:', error)
      await transaction.rollback()
      throw error
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('provider_contact_types', null, {})
  }
}
