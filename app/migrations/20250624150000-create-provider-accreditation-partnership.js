module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('provider_accreditation_partnerships', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: true
      },
      provider_accreditation_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      partner_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      created_by_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_by_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      deleted_at: {
        type: Sequelize.DATE
      },
      deleted_by_id: {
        type: Sequelize.UUID
      }
    })

    // indexes
    await queryInterface.addIndex('provider_accreditation_partnerships', {
      fields: ['provider_accreditation_id'],
      name: 'idx_provider_accreditation_partnerships_provider_accreditation_id'
    })
    await queryInterface.addIndex('provider_accreditation_partnerships', {
      fields: ['partner_id'],
      name: 'idx_provider_accreditation_partnerships_partner_id'
    })
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('provider_accreditation_partnerships')
  }
}
