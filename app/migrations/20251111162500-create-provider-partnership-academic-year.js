module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('provider_partnership_academic_years', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: true
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
    await queryInterface.addIndex('provider_partnership_academic_years', {
      fields: ['partnership_id'],
      name: 'idx_provider_partnership_academic_years_partnership_id'
    })
    await queryInterface.addIndex('provider_partnership_academic_years', {
      fields: ['academic_year_id'],
      name: 'idx_provider_partnership_academic_years_academic_year_id'
    })
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('provider_partnership_academic_years')
  }
}
