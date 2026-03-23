module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('provider_users', 'role', {
      type: Sequelize.ENUM('user', 'admin'),
      allowNull: false,
      defaultValue: 'user'
    })

    await queryInterface.addColumn('provider_users', 'is_active', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('provider_users', 'is_active')
    await queryInterface.removeColumn('provider_users', 'role')
  }
}
