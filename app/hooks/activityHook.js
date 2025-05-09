const { logActivity } = require('../utils/activityLogger')

/**
 * Creates a Sequelize-compatible hook to log activity when a revision is created.
 *
 * @param {Object} config
 * @param {string} config.entityType - Logical type of the entity (e.g. 'user', 'provider')
 * @param {string} config.revisionTable - Name of the revision table in the DB
 * @param {string} config.entityIdField - Field name on the revision model that links to the entity
 * @returns {Function} Sequelize hook function (instance, options) => void
 */
function createActivityHook({ entityType, revisionTable, entityIdField }) {
  return async function (instance, options) {
    const revisionId = instance.id
    const entityId = instance[entityIdField]
    const revisionNumber = instance.revisionNumber
    const changedById = instance.updatedById
    const changedAt = instance.updatedAt

    if (!revisionId || !entityId) {
      console.warn(`[ActivityHook] Skipped logging activity — missing revisionId (${revisionId}) or entityId (${entityId})`)
      return
    }

    await logActivity({
      revisionTable,
      revisionId,
      entityType,
      entityId,
      revisionNumber,
      changedById,
      changedAt
    }, options)
  }
}

module.exports = createActivityHook
