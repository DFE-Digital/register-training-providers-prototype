const { v4: uuidv4 } = require('uuid')

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
