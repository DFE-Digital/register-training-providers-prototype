/**
 * Adds performance indexes to the activity_logs table:
 *  - (changed_by_id) - for filtering by user
 *  - (entity_type, entity_id) - composite index for finding all logs for a specific entity
 *  - (changed_at) - for time-based queries and sorting
 *  - (revision_table, revision_id) - composite index for revision lookups
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1) Index on changed_by_id for filtering activity by user
    await queryInterface.addIndex('activity_logs', {
      name: 'idx_activity_logs_changed_by_id',
      fields: ['changed_by_id']
    })

    // 2) Composite index on entity_type + entity_id for efficient entity lookups
    await queryInterface.addIndex('activity_logs', {
      name: 'idx_activity_logs_entity_type_entity_id',
      fields: ['entity_type', 'entity_id']
    })

    // 3) Index on changed_at for time-based sorting and filtering
    await queryInterface.addIndex('activity_logs', {
      name: 'idx_activity_logs_changed_at',
      fields: ['changed_at']
    })

    // 4) Composite index on revision_table + revision_id for revision lookups
    await queryInterface.addIndex('activity_logs', {
      name: 'idx_activity_logs_revision_table_revision_id',
      fields: ['revision_table', 'revision_id']
    })
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes in reverse order
    await queryInterface.removeIndex('activity_logs', 'idx_activity_logs_revision_table_revision_id')
    await queryInterface.removeIndex('activity_logs', 'idx_activity_logs_changed_at')
    await queryInterface.removeIndex('activity_logs', 'idx_activity_logs_entity_type_entity_id')
    await queryInterface.removeIndex('activity_logs', 'idx_activity_logs_changed_by_id')
  }
}
