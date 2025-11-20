module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'last_signed_in_at', {
      type: Sequelize.DATE,
      allowNull: true
    })

    await queryInterface.addColumn('user_revisions', 'last_signed_in_at', {
      type: Sequelize.DATE,
      allowNull: true
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('user_revisions', 'last_signed_in_at')
    await queryInterface.removeColumn('users', 'last_signed_in_at')
  }
}
