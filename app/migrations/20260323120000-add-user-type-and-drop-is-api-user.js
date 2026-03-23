module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'type', {
      type: Sequelize.ENUM('support', 'provider', 'api'),
      allowNull: false,
      defaultValue: 'support'
    })

    await queryInterface.addColumn('user_revisions', 'type', {
      type: Sequelize.ENUM('support', 'provider', 'api'),
      allowNull: false,
      defaultValue: 'support'
    })

    // Backfill types from existing flags/relations
    await queryInterface.sequelize.query(
      "UPDATE users SET type = 'provider' WHERE id IN (SELECT user_id FROM provider_users WHERE deleted_at IS NULL)"
    )
    await queryInterface.sequelize.query(
      "UPDATE users SET type = 'api' WHERE is_api_user = 1"
    )
    await queryInterface.sequelize.query(
      'UPDATE user_revisions SET type = (SELECT type FROM users WHERE users.id = user_revisions.user_id)'
    )

    await queryInterface.removeColumn('user_revisions', 'is_api_user')
    await queryInterface.removeColumn('users', 'is_api_user')
  },

  async down(queryInterface, Sequelize) {
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

    await queryInterface.sequelize.query(
      "UPDATE users SET is_api_user = CASE WHEN type = 'api' THEN 1 ELSE 0 END"
    )
    await queryInterface.sequelize.query(
      "UPDATE user_revisions SET is_api_user = CASE WHEN type = 'api' THEN 1 ELSE 0 END"
    )

    await queryInterface.removeColumn('user_revisions', 'type')
    await queryInterface.removeColumn('users', 'type')
  }
}
