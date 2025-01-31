module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('provider_contacts', {
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
      first_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      last_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false
      },
      telephone: {
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
    await queryInterface.dropTable('provider_contacts')
  }
}
