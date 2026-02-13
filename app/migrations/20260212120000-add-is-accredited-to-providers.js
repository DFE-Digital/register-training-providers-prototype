module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('providers', 'is_accredited', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    })

    await queryInterface.addColumn('provider_revisions', 'is_accredited', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('provider_revisions', 'is_accredited')
    await queryInterface.removeColumn('providers', 'is_accredited')
  }
}
