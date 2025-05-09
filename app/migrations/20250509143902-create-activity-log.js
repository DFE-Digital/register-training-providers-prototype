module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('activity_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      revision_table: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'The name of the table where the revision occurred (e.g. provider_revisions)',
      },
      revision_id: {
        type: Sequelize.UUID,
        allowNull: false,
        comment: 'The ID of the revision record (e.g. in provider_revisions)',
      },
      entity_type: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'High-level type of entity (e.g. provider, user)',
      },
      entity_id: {
        type: Sequelize.UUID,
        allowNull: false,
        comment: 'The ID of the entity affected by the revision (e.g. provider.id)',
      },
      revision_number: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      changed_by_id: {
        type: Sequelize.UUID,
        allowNull: true,
        comment: 'The user who made the change',
      },
      changed_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('activity_logs');
  }
};
