module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('organisations', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: true
      },
      organisation_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      organisation_type: {
        type: Sequelize.STRING,
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE
      },
      created_by_id: {
        type: Sequelize.UUID
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
    await queryInterface.dropTable('organisations')
  }
}
