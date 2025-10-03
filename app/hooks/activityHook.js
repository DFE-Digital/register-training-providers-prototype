/**
 * Activity logging hook for revision tables.
 * Infers or accepts an explicit action and writes an activity log entry.
 */

const { logActivity } = require('../utils/activityLogger')

/**
 * @typedef {'create'|'update'|'delete'} ActivityAction
 */

/**
 * @typedef {Object} ActivityHookConfig
 * @property {string} entityType     - Logical entity type (e.g. 'provider_contact')
 * @property {string} revisionTable  - Name of the revision table (e.g. 'provider_contact_revisions')
 * @property {string} entityIdField  - FK field on the revision model that links back to the entity (e.g. 'providerContactId')
 */

/**
 * Options passed through Sequelize into hooks when a revision is created.
 * We extend the normal Sequelize CreateOptions with our own optional `activityAction`.
 * @typedef {Object} ActivityHookOptions
 * @property {ActivityAction} [activityAction] - Explicit action to log; if omitted, it is inferred from revisionNumber.
 * // Note: Sequelize also passes many other properties on options (transaction, logging, etc.).
 */

/**
 * A Sequelize `afterCreate`-compatible hook factory that records activity
 * for each new revision row.
 *
 * It expects the `instance` to be a *revision* row with at least:
 *  - `id` (UUID)
 *  - `revisionNumber` (number)
 *  - `revisionById` (UUID|null)
 *  - `revisionAt` (Date|null)
 *  - The FK defined by `entityIdField` (e.g. `providerContactId`)
 *
 * @param {ActivityHookConfig} param0 - Hook configuration
 * @returns {(instance: import('sequelize').Model, options: ActivityHookOptions) => Promise<void>}
 */
const activityHook = ({ entityType, revisionTable, entityIdField }) => {
  return async (instance, options = {}) => {
    const revisionId = instance.id
    const entityId = instance[entityIdField]
    const revisionNumber = instance.revisionNumber

    /** @type {ActivityAction} */
    const action = options.activityAction ?? (revisionNumber === 1 ? 'create' : 'update')

    // Use revision fields (these exist on revision rows)
    const changedById = instance.revisionById ?? null
    const changedAt = instance.revisionAt ?? new Date()

    if (!revisionId || !entityId) {
      console.warn(
        `[ActivityHook] Skipped logging — missing revisionId (${revisionId}) or entityId (${entityId})`
      )
      return
    }

    await logActivity(
      {
        revisionTable,
        revisionId,
        entityType,
        entityId,
        revisionNumber,
        action,
        changedById,
        changedAt
      },
      options
    )
  }
}

module.exports = activityHook
