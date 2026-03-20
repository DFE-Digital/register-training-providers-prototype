module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('provider_users', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: true
      },
      provider_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      user_id: {
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
    await queryInterface.addIndex('provider_users', {
      fields: ['provider_id'],
      name: 'idx_provider_users_provider_id'
    })
    await queryInterface.addIndex('provider_users', {
      fields: ['user_id'],
      name: 'idx_provider_users_user_id'
    })
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('provider_users')
  }
}
