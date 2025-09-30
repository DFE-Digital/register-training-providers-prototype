module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('provider_address_revisions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: true
      },
      provider_address_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'provider_addresses',
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
      uprn: {
        type: Sequelize.STRING
      },
      line_1:  {
        type: Sequelize.STRING,
        allowNull: false
      },
      line_2: {
        type: Sequelize.STRING
      },
      line_3: {
        type: Sequelize.STRING
      },
      town:  {
        type: Sequelize.STRING,
        allowNull: false
      },
      county: {
        type: Sequelize.STRING
      },
      postcode:  {
        type: Sequelize.STRING,
        allowNull: false
      },
      latitude: {
        type: Sequelize.FLOAT
      },
      longitude: {
        type: Sequelize.FLOAT
      },
      google_place_id: {
        type: Sequelize.STRING
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
    await queryInterface.addIndex('provider_address_revisions', {
      fields: ['provider_id'],
      name: 'idx_provider_address_revisions_provider_id'
    })
    await queryInterface.addIndex('provider_address_revisions', {
      fields: ['provider_address_id'],
      name: 'idx_provider_address_revisions_provider_address_id'
    })
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('provider_address_revisions')
  }
}
