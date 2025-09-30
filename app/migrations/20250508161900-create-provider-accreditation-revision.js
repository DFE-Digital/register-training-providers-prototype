module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('provider_accreditation_revisions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: true
      },
      provider_accreditation_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'provider_accreditations',
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
      number: {
        type: Sequelize.STRING,
        allowNull: false
      },
      starts_on: {
        type: Sequelize.DATE,
        allowNull: false
      },
      ends_on: {
        type: Sequelize.DATE
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
    await queryInterface.dropTable('provider_accreditation_revisions')
  }
}
