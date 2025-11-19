module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('provider_partnerships', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: true
      },
      accredited_provider_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      training_partner_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      starts_on: {
        type: Sequelize.DATE,
        allowNull: false
      },
      ends_on: {
        type: Sequelize.DATE
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
    await queryInterface.addIndex('provider_partnerships', {
      fields: ['accredited_provider_id'],
      name: 'idx_provider_partnerships_accredited_provider_id'
    })
    await queryInterface.addIndex('provider_partnerships', {
      fields: ['training_partner_id'],
      name: 'idx_provider_partnerships_training_partner_id'
    })
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('provider_partnerships')
  }
}
