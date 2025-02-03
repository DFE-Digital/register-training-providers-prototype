module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('providers', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: true
      },
      operating_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      legal_name: {
        type: Sequelize.STRING
      },
      type: {
        type: Sequelize.ENUM('hei', 'scitt', 'school')
      },
      ukprn: {
        type: Sequelize.STRING,
        allowNull: false
      },
      urn: {
        type: Sequelize.STRING
      },
      code: {
        type: Sequelize.STRING,
        allowNull: false
      },
      website: {
        type: Sequelize.STRING,
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
    await queryInterface.dropTable('providers')
  }
}
