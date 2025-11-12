module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('provider_partnership_academic_year_revisions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: true
      },
      provider_partnership_academic_year_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'provider_partnership_academic_years',
          key: 'id'
        }
      },
      partnership_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'provider_partnerships',
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
        type: Sequelize.UUID,
        allowNull: true
      }
    })

    // indexes
    await queryInterface.addIndex('provider_partnership_academic_year_revisions', {
      fields: ['provider_partnership_academic_year_id'],
      name: 'idx_provider_partnership_academic_year_revisions_provider_partnership_academic_year_id'
    })
    await queryInterface.addIndex('provider_partnership_academic_year_revisions', {
      fields: ['partnership_id'],
      name: 'idx_provider_partnership_academic_year_revisions_partnership_id'
    })
    await queryInterface.addIndex('provider_partnership_academic_year_revisions', {
      fields: ['academic_year_id'],
      name: 'idx_provider_partnership_academic_year_revisions_academic_year_id'
    })
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('provider_partnership_academic_year_revisions')
  }
}
