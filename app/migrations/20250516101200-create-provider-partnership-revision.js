module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('provider_partnership_revisions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: true
      },
      provider_partnership_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'provider_partnerships',
          key: 'id'
        }
      },
      accredited_provider_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      training_provider_id: {
        type: Sequelize.UUID,
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
    await queryInterface.addIndex('provider_partnership_revisions', {
      fields: ['provider_partnership_id'],
      name: 'idx_provider_partnership_revisions_provider_partnership_id'
    })
    await queryInterface.addIndex('provider_partnership_revisions', {
      fields: ['accredited_provider_id'],
      name: 'idx_provider_partnership_revisions_accredited_provider_id'
    })
    await queryInterface.addIndex('provider_partnership_revisions', {
      fields: ['training_provider_id'],
      name: 'idx_provider_partnership_revisions_training_provider_id'
    })
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('provider_partnership_revisions')
  }
}
