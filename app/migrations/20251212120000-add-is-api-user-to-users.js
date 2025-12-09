module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'is_api_user', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    })

    await queryInterface.addColumn('user_revisions', 'is_api_user', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('user_revisions', 'is_api_user')
    await queryInterface.removeColumn('users', 'is_api_user')
  }
}
