module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('provider_contact_revisions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: true
      },
      provider_contact_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'provider_contacts',
          key: 'id'
        }
      },
      provider_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'providers',
          key: 'id'
        }
      },
      first_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      last_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false
      },
      telephone: {
        type: Sequelize.STRING,
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
      },
      revision_number: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      revision_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      revision_by_id: {
        type: Sequelize.UUID,
        allowNull: true
      }
    })
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('provider_contact_revisions')
  }
}
