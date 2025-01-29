module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('provider_partnerships', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: true
      },
      training_provider_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      accredited_provider_id: {
        type: Sequelize.UUID,
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
    await queryInterface.dropTable('provider_partnerships')
  }
}
