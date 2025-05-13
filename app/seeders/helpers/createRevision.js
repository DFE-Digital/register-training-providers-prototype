const { v4: uuidv4 } = require('uuid')

/**
 * Creates a revision record in the given revision table
 *
 * @param {Object} options
 * @param {string} options.revisionTable - Name of the revision table (e.g. 'provider_revisions')
 * @param {string} options.entityId - ID of the original entity (e.g. provider.id)
 * @param {Object} options.revisionData - Data to insert into the revision table (excluding id, timestamps)
 * @param {number} options.revisionNumber - Revision number (e.g. 1)
 * @param {string} options.userId - UUID of the user creating the revision
 * @param {Date} options.timestamp - Timestamp for created_at/updated_at
 * @param {Object} queryInterface - Sequelize queryInterface instance
 * @param {Object} [transaction] - Optional Sequelize transaction
 * @returns {string} revisionId
 */
const createRevision = async ({
  revisionTable,
  entityId,
  revisionData,
  revisionNumber,
  userId,
  timestamp
}, queryInterface, transaction) => {
  const revisionId = uuidv4()
  const now = timestamp || new Date()

  // Remove any accidental `id` property
  const { id: _, ...cleanedRevisionData } = revisionData

  const fullRevisionData = {
    id: revisionId,
    [`${revisionTable.replace('_revisions', '')}_id`]: entityId, // e.g. provider_id
    revision_number: revisionNumber,
    ...cleanedRevisionData,
    created_by_id: userId,
    created_at: now,
    updated_at: now
  }

  await queryInterface.bulkInsert(revisionTable, [fullRevisionData], { transaction })
  return revisionId
}

module.exports = createRevision
