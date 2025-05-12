/**
 * Log a revision to the activity log
 *
 * @param {Object} options
 * @param {String} options.revisionTable - Name of the revision table (e.g. 'provider_revisions')
 * @param {String} options.revisionId - ID of the new revision
 * @param {String} options.entityType - Type of the entity being changed (e.g. 'provider')
 * @param {String} options.entityId - ID of the entity (e.g. provider.id)
 * @param {Number} options.revisionNumber - Incrementing revision number
 * @param {String} [options.changedById] - User ID who made the change
 * @param {Date} [options.changedAt] - Timestamp of the change
 */

// utils/activityLogger.js
let ActivityLog

const logActivity = async ({
  revisionTable,
  revisionId,
  entityType,
  entityId,
  revisionNumber,
  action,
  changedById,
  changedAt
}) => {
  if (!ActivityLog) {
    // Lazy-load after all models have been registered
    const db = require('../models')
    ActivityLog = db.ActivityLog
  }

  await ActivityLog.create({
    revisionTable,
    revisionId,
    entityType,
    entityId,
    revisionNumber,
    action,
    changedById,
    changedAt
  })
}

module.exports = { logActivity }
