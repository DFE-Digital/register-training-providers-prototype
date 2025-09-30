const { v4: uuidv4 } = require('uuid')

/**
 * Create a single revision row in a *_revisions table.
 *
 * Assumes revision tables have:
 *  - <entity>_id (FK)
 *  - revision_number (INTEGER)
 *  - revision_by_id (UUID, nullable)
 *  - revision_at (DATE)
 *  - business columns (no created_/updated_/deleted_ fields)
 *
 * @param {Object} opts
 * @param {string} opts.revisionTable   e.g. 'user_revisions'
 * @param {string} opts.entityId        UUID of source row
 * @param {Object} opts.revisionData    snapshot of business fields (snake_case)
 * @param {number} opts.revisionNumber  e.g. 1
 * @param {string} [opts.revisionById]  actor user id (nullable)
 * @param {Date}   [opts.revisionAt]    timestamp (defaults to now)
 * @param {string} [opts.fkColumn]      override FK column if non-standard
 * @param {Object} queryInterface
 * @param {Object} [transaction]
 * @returns {string} revisionId
 */
const createRevision = async (
  {
    revisionTable,
    entityId,
    revisionData = {},
    revisionNumber,
    revisionById = null,
    revisionAt = new Date(),
    fkColumn
  },
  queryInterface,
  transaction
) => {
  // Discover actual columns on the revision table
  const columns = await queryInterface.describeTable(revisionTable)
  const allow = new Set(Object.keys(columns))

  // Infer FK column (e.g. 'user_revisions' -> 'user_id') unless provided
  const inferredFk = fkColumn || `${revisionTable.replace(/_revisions$/, '')}_id`

  // Build base meta
  const id = uuidv4()
  const meta = {
    id,
    [inferredFk]: entityId,
    revision_number: revisionNumber,
    revision_by_id: revisionById || null,
    revision_at: revisionAt
  }

  // Strip unwanted audit keys and accidental id from the snapshot
  const {
    id: _ignoreId,
    created_by_id: _cby,
    created_at: _cat,
    updated_by_id: _uby,
    updated_at: _uat,
    deleted_by_id: _dby,
    deleted_at: _dat,
    ...businessIn
  } = revisionData

  // Keep only keys that exist on the revision table
  const business = {}
  for (const [k, v] of Object.entries(businessIn)) {
    if (allow.has(k)) business[k] = v
  }

  // Compose final row and extra-defensively drop any key not in schema
  const row = { ...business, ...meta }
  for (const key of Object.keys(row)) {
    if (!allow.has(key)) delete row[key]
  }

  await queryInterface.bulkInsert(revisionTable, [row], { transaction })
  return id
}

module.exports = createRevision
