module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('provider_addresses', {
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
      uprn: {
        type: Sequelize.STRING
      },
      line_1:  {
        type: Sequelize.STRING,
        allowNull: false
      },
      line_2: {
        type: Sequelize.STRING
      },
      line_3: {
        type: Sequelize.STRING
      },
      town:  {
        type: Sequelize.STRING,
        allowNull: false
      },
      county: {
        type: Sequelize.STRING
      },
      postcode:  {
        type: Sequelize.STRING,
        allowNull: false
      },
      latitude: {
        type: Sequelize.FLOAT
      },
      longitude: {
        type: Sequelize.FLOAT
      },
      google_place_id: {
        type: Sequelize.STRING
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
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('provider_addresses')
  }
}
