module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('provider_academic_year_revisions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: true
      },
      provider_academic_year_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'provider_academic_years',
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
      academic_year_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'academic_years',
          key: 'id'
        }
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
        type: Sequelize.UUID
      }
    })

    await queryInterface.addIndex('provider_academic_year_revisions', {
      fields: ['provider_academic_year_id'],
      name: 'idx_provider_academic_year_revisions_provider_academic_year_id'
    })
    await queryInterface.addIndex('provider_academic_year_revisions', {
      fields: ['provider_id'],
      name: 'idx_provider_academic_year_revisions_provider_id'
    })
    await queryInterface.addIndex('provider_academic_year_revisions', {
      fields: ['academic_year_id'],
      name: 'idx_provider_academic_year_revisions_academic_year_id'
    })
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('provider_academic_year_revisions')
  }
}
