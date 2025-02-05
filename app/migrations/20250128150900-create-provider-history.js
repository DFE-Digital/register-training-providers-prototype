module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('provider_histories', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: true
      },
      provider_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      operating_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      legal_name: {
        type: Sequelize.STRING,
        allowNull: true
      },
      ukprn: {
        type: Sequelize.STRING,
        allowNull: false
      },
      urn: {
        type: Sequelize.STRING,
        allowNull: false
      },
      code: {
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
        type: Sequelize.DATE
      },
      updated_by_id: {
        type: Sequelize.UUID
      }
    })
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('provider_histories')
  }
}
