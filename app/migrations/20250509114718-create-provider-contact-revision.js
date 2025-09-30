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

    // indexes
    await queryInterface.addIndex('provider_contact_revisions', {
      fields: ['provider_id'],
      name: 'idx_provider_contact_revisions_provider_id'
    })
    await queryInterface.addIndex('provider_contact_revisions', {
      fields: ['provider_contact_id'],
      name: 'idx_provider_contact_revisions_provider_contact_id'
    })
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('provider_contact_revisions')
  }
}
