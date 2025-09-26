module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('providers', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: true
      },
      operating_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      legal_name: {
        type: Sequelize.STRING
      },
      type: {
        type: Sequelize.ENUM('hei','other','school')
      },
      ukprn: {
        type: Sequelize.STRING,
        allowNull: false
      },
      urn: {
        type: Sequelize.STRING
      },
      code: {
        type: Sequelize.STRING,
        allowNull: false
      },
      website: {
        type: Sequelize.STRING,
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
      archived_at: {
        type: Sequelize.DATE
      },
      archived_by_id: {
        type: Sequelize.UUID
      },
      deleted_at: {
        type: Sequelize.DATE
      },
      deleted_by_id: {
        type: Sequelize.UUID
      }
    })

    // indexes
    await queryInterface.addIndex('providers', {
      fields: ['ukprn'],
      name: 'idx_providers_ukprn'
    })
    await queryInterface.addIndex('providers', {
      fields: ['urn'],
      name: 'idx_providers_urn'
    })
    await queryInterface.addIndex('providers', {
      fields: ['code'],
      name: 'idx_providers_code'
    })
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('providers')
  }
}
