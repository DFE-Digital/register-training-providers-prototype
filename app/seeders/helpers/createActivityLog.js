const { v4: uuidv4 } = require('uuid')

/**
 * Insert a single activity log entry for a revision-driven change.
 *
 * This is intended for use inside Sequelize **seeders** (or data migration scripts)
 * where you have access to the `queryInterface` and an optional transaction.
 *
 * The row written to `activity_logs` is append-only and records:
 * - which revision table/row changed
 * - which domain entity was affected
 * - the revision number
 * - who changed it and when
 *
 * @typedef {Object} CreateActivityLogOptions
 * @property {string} revisionTable - Name of the revision table (e.g. `"provider_revisions"`).
 * @property {string} revisionId - UUID of the revision row that triggered this activity.
 * @property {string} entityType - Logical entity type (e.g. `"provider"`, `"provider_contact"`).
 * @property {string} entityId - UUID of the affected entity (not the revision id).
 * @property {number} revisionNumber - Sequential revision number (starting at 1).
 * @property {string} changedById - UUID of the user (or system actor) who made the change.
 * @property {Date|string|number} [changedAt] - When the change occurred; defaults to `new Date()`.
 *
 * @param {CreateActivityLogOptions} params - Options describing the activity to record.
 * @param {import('sequelize').QueryInterface} queryInterface - Sequelize QueryInterface from the seeder context.
 * @param {import('sequelize').Transaction} [transaction] - Optional transaction to bind the insert to.
 * @returns {Promise<void>} Resolves when the activity row has been inserted.
 *
 * @example
 * // Inside a seeder:
 * await createActivityLog({
 *   revisionTable: 'provider_revisions',
 *   revisionId: 'a2f3…',
 *   entityType: 'provider',
 *   entityId: 'b9c1…',
 *   revisionNumber: 3,
 *   changedById: 'user-123…',
 *   changedAt: '2025-09-30T12:00:00Z'
 * }, queryInterface, transaction)
 */
const createActivityLog = async ({
  revisionTable,
  revisionId,
  entityType,
  entityId,
  revisionNumber,
  changedById,
  changedAt
}, queryInterface, transaction) => {
  const now = changedAt || new Date()

  await queryInterface.bulkInsert('activity_logs', [{
    id: uuidv4(),
    revision_table: revisionTable,
    revision_id: revisionId,
    entity_type: entityType,
    entity_id: entityId,
    revision_number: revisionNumber,
    action: 'create',
    changed_by_id: changedById,
    changed_at: now
  }], { transaction })
}

module.exports = createActivityLog
