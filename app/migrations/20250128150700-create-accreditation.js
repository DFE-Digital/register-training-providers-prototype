module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('accreditations', {
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
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE
      },
      updated_by: {
        type: Sequelize.UUID
      }
    })
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('accreditations')
  }
}
