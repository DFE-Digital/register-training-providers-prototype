module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('user_notifications', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: true
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      notification_frequency: {
        type: Sequelize.ENUM('immediate', 'daily', 'weekly', 'never'),
        allowNull: false
      },
      provider_details: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      provider_accreditations: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      provider_addresses: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      provider_contacts: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      provider_partnerships: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      provider_users: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
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
    await queryInterface.addIndex('user_notifications', {
      fields: ['user_id'],
      name: 'idx_user_notifications_user_id'
    })
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('user_notifications')
  }
}
