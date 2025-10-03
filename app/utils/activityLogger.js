/**
 * Log a revision to the activity log.
 *
 * @param {Object} payload
 * @param {string} payload.revisionTable
 * @param {string} payload.revisionId
 * @param {string} payload.entityType
 * @param {string} payload.entityId
 * @param {number} payload.revisionNumber
 * @param {'create'|'update'|'delete'} payload.action
 * @param {string} [payload.changedById]
 * @param {Date}   [payload.changedAt]
 * @param {Object} [options] - Passed straight to Sequelize .create() (e.g., { transaction, logging }).
 * @param {import('sequelize').Transaction} [options.transaction]
 * @param {Function|boolean} [options.logging]
 * @returns {Promise<void>}
 */
let ActivityLog

const logActivity = async (payload, options = {}) => {
  if (!ActivityLog) {
    const db = require('../models')
    ActivityLog = db.ActivityLog
  }

  const { transaction, logging } = options
  await ActivityLog.create(payload, { transaction, logging })
}

module.exports = { logActivity }
