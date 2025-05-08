module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('provider_revisions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: true
      },
      provider_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'providers',
          key: 'id'
        }
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
    await queryInterface.dropTable('provider_revisions')
  }
}
