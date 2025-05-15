const { Op } = require('sequelize')
const {
  ActivityLog,
  Provider,
  ProviderAccreditationRevision,
  ProviderAddressRevision,
  ProviderContactRevision,
  ProviderRevision,
  User,
  UserRevision
} = require('../models')

const { govukDate } = require('./date')
const { getProviderTypeLabel } = require('./content')

/**
 * Maps revision table names to their associated include alias.
 * @type {Object.<string, string>}
 */
const revisionAssociationMap = {
  provider_revisions: 'providerRevision',
  provider_accreditation_revisions: 'providerAccreditationRevision',
  provider_address_revisions: 'providerAddressRevision',
  provider_contact_revisions: 'providerContactRevision',
  user_revisions: 'userRevision'
}

/**
 * Maps revision table names to their Sequelize model.
 * @type {Object.<string, import('sequelize').Model>}
 */
const revisionModels = {
  provider_revisions: ProviderRevision,
  provider_accreditation_revisions: ProviderAccreditationRevision,
  provider_address_revisions: ProviderAddressRevision,
  provider_contact_revisions: ProviderContactRevision,
  user_revisions: UserRevision
}

/**
 * Gets the Sequelize model for the given revision table.
 * @param {string} revisionTable
 * @returns {import('sequelize').Model}
 */
const getRevisionModel = (revisionTable) => revisionModels[revisionTable]

/**
 * Returns the foreign key used in a revision table.
 * @param {string} revisionTable
 * @returns {'providerId'|'userId'}
 */
const getEntityKey = (revisionTable) => {
  switch (revisionTable) {
    case 'user_revisions':
      return 'userId'
    default:
      return 'providerId'
  }
}

/**
 * Formats a raw ActivityLog instance into a summary object.
 * @param {import('sequelize').Model} log
 * @returns {Object}
 */
const formatActivityLog = (log) => {
  try {
    const logJson = log.toJSON()
    const alias = revisionAssociationMap[log.revisionTable]
    const revision = log[alias] || null
    logJson.revision = revision ? revision.toJSON?.() || revision : null
    logJson.summary = getRevisionSummary({
      revision: logJson.revision,
      revisionTable: log.revisionTable,
      ...logJson
    })
    return logJson
  } catch (err) {
    console.error(`Error processing activity log ${log.id}:`, err)
    return {
      ...log.toJSON(),
      revision: null,
      summary: {
        label: 'Error loading revision',
        fields: []
      }
    }
  }
}

/**
 * Fetches global or filtered activity logs.
 * @param {Object} options
 * @param {string|null} [options.entityId]
 * @param {number} [options.limit=25]
 * @param {number} [options.offset=0]
 * @returns {Promise<Object[]>}
 */
const getActivityLogs = async ({ entityId = null, limit = 25, offset = 0 }) => {
  const whereClause = entityId ? { entityId } : {}

  const activityLogs = await ActivityLog.findAll({
    where: whereClause,
    include: [
      {
        model: ProviderRevision,
        as: 'providerRevision',
        include: [{ model: Provider, as: 'provider' }]
      },
      {
        model: ProviderAccreditationRevision,
        as: 'providerAccreditationRevision',
        include: [{ model: Provider, as: 'provider' }]
      },
      {
        model: ProviderAddressRevision,
        as: 'providerAddressRevision',
        include: [{ model: Provider, as: 'provider' }]
      },
      {
        model: ProviderContactRevision,
        as: 'providerContactRevision',
        include: [{ model: Provider, as: 'provider' }]
      },
      {
        model: UserRevision,
        as: 'userRevision'
      },
      {
        model: User,
        as: 'changedByUser'
      }
    ],
    order: [['changedAt', 'DESC']],
    limit,
    offset
  })

  return activityLogs.map(formatActivityLog)
}

/**
 * Fetches activity logs related to a specific provider.
 * @param {Object} options
 * @param {string} options.providerId
 * @param {number} [options.limit=25]
 * @param {number} [options.offset=0]
 * @returns {Promise<Object[]>}
 */
const getProviderActivityLogs = async ({ providerId, limit = 25, offset = 0 }) => {
  if (!providerId) throw new Error('providerId is required')

  const queries = []

  const sharedIncludes = (model, as) => [
    {
      model,
      as,
      where: { providerId },
      include: [{ model: Provider, as: 'provider' }]
    },
    { model: User, as: 'changedByUser' }
  ]

  queries.push(ActivityLog.findAll({
    where: { revisionTable: 'provider_revisions' },
    include: sharedIncludes(ProviderRevision, 'providerRevision')
  }))

  queries.push(ActivityLog.findAll({
    where: { revisionTable: 'provider_accreditation_revisions' },
    include: sharedIncludes(ProviderAccreditationRevision, 'providerAccreditationRevision')
  }))

  queries.push(ActivityLog.findAll({
    where: { revisionTable: 'provider_address_revisions' },
    include: sharedIncludes(ProviderAddressRevision, 'providerAddressRevision')
  }))

  queries.push(ActivityLog.findAll({
    where: { revisionTable: 'provider_contact_revisions' },
    include: sharedIncludes(ProviderContactRevision, 'providerContactRevision')
  }))

  const allLogs = (await Promise.all(queries)).flat()

  // Sort and paginate manually
  allLogs.sort((a, b) => new Date(b.changedAt) - new Date(a.changedAt))
  const paginated = allLogs.slice(offset, offset + limit)

  return paginated.map(formatActivityLog)
}

/**
 * Returns the total activity log count for a given provider.
 * @param {Object} options
 * @param {string} options.providerId
 * @returns {Promise<number>}
 */
const getProviderActivityTotalCount = async ({ providerId }) => {
  if (!providerId) throw new Error('providerId is required')

  const results = await Promise.all([
    ActivityLog.count({
      where: { revisionTable: 'provider_revisions' },
      include: [
        {
          model: ProviderRevision,
          as: 'providerRevision',
          required: true,
          where: { providerId }
        }
      ]
    }),
    ActivityLog.count({
      where: { revisionTable: 'provider_accreditation_revisions' },
      include: [
        {
          model: ProviderAccreditationRevision,
          as: 'providerAccreditationRevision',
          required: true,
          where: { providerId }
        }
      ]
    }),
    ActivityLog.count({
      where: { revisionTable: 'provider_address_revisions' },
      include: [
        {
          model: ProviderAddressRevision,
          as: 'providerAddressRevision',
          required: true,
          where: { providerId }
        }
      ]
    }),
    ActivityLog.count({
      where: { revisionTable: 'provider_contact_revisions' },
      include: [
        {
          model: ProviderContactRevision,
          as: 'providerContactRevision',
          required: true,
          where: { providerId }
        }
      ]
    })
  ])

  return results.reduce((sum, count) => sum + count, 0)
}

/**
 * Fetches activity logs made by a specific user.
 * @param {Object} options
 * @param {string} options.userId
 * @param {string|string[]|null} [options.revisionTable]
 * @param {number} [options.limit=25]
 * @param {number} [options.offset=0]
 * @returns {Promise<Object[]>}
 */
const getUserActivityLogs = async ({ userId, revisionTable = null, limit = 25, offset = 0 }) => {
  if (!userId) throw new Error('userId is required')

  const whereClause = { changedById: userId }

  if (revisionTable) {
    whereClause.revisionTable = Array.isArray(revisionTable) ? { [Op.in]: revisionTable } : revisionTable
  }

  const activityLogs = await ActivityLog.findAll({
    where: whereClause,
    include: [
      {
        model: ProviderRevision,
        as: 'providerRevision',
        include: [{ model: Provider, as: 'provider' }]
      },
      {
        model: ProviderAccreditationRevision,
        as: 'providerAccreditationRevision',
        include: [{ model: Provider, as: 'provider' }]
      },
      {
        model: ProviderAddressRevision,
        as: 'providerAddressRevision',
        include: [{ model: Provider, as: 'provider' }]
      },
      {
        model: ProviderContactRevision,
        as: 'providerContactRevision',
        include: [{ model: Provider, as: 'provider' }]
      },
      {
        model: UserRevision,
        as: 'userRevision'
      },
      {
        model: User,
        as: 'changedByUser'
      }
    ],
    order: [['changedAt', 'DESC']],
    limit,
    offset
  })

  return activityLogs.map(formatActivityLog)
}

/**
 * Returns the total number of logs created by a user.
 * @param {Object} options
 * @param {string} options.userId
 * @param {string|string[]|null} [options.revisionTable]
 * @returns {Promise<number>}
 */
const getUserActivityTotalCount = async ({ userId, revisionTable = null }) => {
  if (!userId) throw new Error('userId is required')

  const whereClause = { changedById: userId }

  if (revisionTable) {
    whereClause.revisionTable = Array.isArray(revisionTable)
      ? { [Op.in]: revisionTable }
      : revisionTable
  }

  const totalCount = await ActivityLog.count({
    where: whereClause,
    include: [
      {
        model: ProviderRevision,
        as: 'providerRevision',
        required: false,
        include: [{ model: Provider, as: 'provider' }]
      },
      {
        model: ProviderAccreditationRevision,
        as: 'providerAccreditationRevision',
        required: false,
        include: [{ model: Provider, as: 'provider' }]
      },
      {
        model: ProviderAddressRevision,
        as: 'providerAddressRevision',
        required: false,
        include: [{ model: Provider, as: 'provider' }]
      },
      {
        model: ProviderContactRevision,
        as: 'providerContactRevision',
        required: false,
        include: [{ model: Provider, as: 'provider' }]
      },
      {
        model: UserRevision,
        as: 'userRevision',
        required: false
      }
    ]
  })

  return totalCount
}

/**
 * Generates a human-readable summary of a revision for display purposes.
 *
 * @param {Object} options
 * @param {Object|null} options.revision - The revision record, already eager-loaded if needed.
 * @param {string} options.revisionTable - The name of the revision table.
 * @param {string} options.action - Action performed (e.g. 'create', 'update', 'delete').
 * @returns {Object} A structured summary object for UI rendering.
 */
const getRevisionSummary = async ({ revision, revisionTable, ...log }) => {
  if (!revision) {
    return {
      label: 'Revision details unavailable',
      fields: []
    }
  }

  // Set default summary
  const action = log.action
  let activity = ''
  let label = ''
  let href = ''
  const fields = []

  switch (revisionTable) {
    case 'provider_revisions':
      const previousRevision = getPreviousRevision({
        revisionTable,
        revisionId: log.revisionId,
        entityId: log.entityId
      })

      if (revision.archivedAt) {
        activity = 'Provider archived'
      } else if (previousRevision.archivedAt) {
        activity = 'Provider unarchived'
      } else {
        activity = `Provider ${log.action}d`
      }

      label = revision.operatingName || revision.name || 'Provider'
      href = `/providers/${revision.providerId}/`

      fields.push({ key: 'Provider type', value: getProviderTypeLabel(revision.type) })
      fields.push({ key: 'Operating name', value: revision.operatingName })
      fields.push({ key: 'Legal name', value: revision.legalName })
      fields.push({ key: 'UK provider reference number (UKPRN)', value: revision.ukprn })
      fields.push({ key: 'Unique reference number (URN)', value: revision.urn })
      fields.push({ key: 'Provider code', value: revision.code })
      break

    case 'provider_address_revisions': {
      const provider = revision.provider
      const providerName = provider?.operatingName || provider?.legalName || 'Provider'
      activity = `Provider address ${log.action}d`
      label = providerName // `${providerName} – address details`
      href = `/providers/${revision.providerId}/addresses`

      fields.push({ key: 'Address line 1', value: revision.line1 })
      fields.push({ key: 'Address line 2', value: revision.line2 })
      fields.push({ key: 'Address line 3', value: revision.line3 })
      fields.push({ key: 'Town or city', value: revision.town })
      fields.push({ key: 'County', value: revision.county })
      fields.push({ key: 'Postcode', value: revision.postcode })
      fields.push({ key: 'Latitude', value: revision.latitude })
      fields.push({ key: 'Longitude', value: revision.longitude })
      break
    }

    case 'provider_contact_revisions': {
      const provider = revision.provider
      const providerName = provider?.operatingName || provider?.legalName || 'Provider'
      activity = `Provider contact ${log.action}d`
      label = providerName // `${providerName} – contact details`
      href = `/providers/${revision.providerId}/contacts`

      fields.push({ key: 'First name', value: revision.firstName })
      fields.push({ key: 'Last name', value: revision.lastName })
      fields.push({ key: 'Email address', value: revision.email })
      fields.push({ key: 'Telephone', value: revision.telephone })
      break
    }

    case 'provider_accreditation_revisions': {
      const provider = revision.provider
      const providerName = provider?.operatingName || provider?.legalName || 'Provider'
      activity = `Provider accreditation ${log.action}d`
      label = providerName // `${providerName} – accreditation`
      href = `/providers/${revision.providerId}/accreditations`

      fields.push({ key: 'Accreditation number', value: revision.number })
      fields.push({ key: 'Date accreditation starts', value: govukDate(revision.startsOn) })
      fields.push({ key: 'Date accreditation ends', value: revision.endsOn ? govukDate(revision.endsOn) : null })
      break
    }

    case 'user_revisions':
      activity = `User ${log.action}d`
      label = `${revision.firstName} ${revision.lastName}` || revision.email || 'User'
      href = `/users/${revision.userId}`

      fields.push({ key: 'First name', value: revision.firstName })
      fields.push({ key: 'Last name', value: revision.lastName })
      fields.push({ key: 'Email address', value: revision.email })
      break

    default:
      label = 'Unknown revision'
  }

  return {
    action,
    activity,
    label,
    href,
    fields
  }
}

/**
 * Retrieves the previous revision for a given entity.
 *
 * @param {Object} options
 * @param {string} options.revisionTable - Name of the revision table.
 * @param {string} options.revisionId - ID of the current revision.
 * @param {string} options.entityId - ID of the associated provider or user.
 * @returns {Promise<Object|null>} The previous revision, or null if none exists.
 */
const getPreviousRevision = async ({ revisionTable, revisionId, entityId }) => {
  if (!revisionTable || !revisionId || !entityId) throw new Error('revisionTable, revisionId, and entityId are required')

  const revisionModel = getRevisionModel(revisionTable)
  if (!revisionModel) throw new Error(`Unknown revision table: ${revisionTable}`)

  const revisions = await revisionModel.findAll({
    where: { [`${getEntityKey(revisionTable)}`]: entityId },
    order: [['revisionNumber', 'ASC']]
  })

  const index = revisions.findIndex(r => r.id === revisionId)

  if (index > 0) {
    return revisions[index - 1]
  }

  return null // no previous revision
}

/**
 * Retrieves the latest revision for a given entity.
 *
 * @param {Object} options
 * @param {string} options.revisionTable - Name of the revision table.
 * @param {string} options.entityId - ID of the associated provider or user.
 * @returns {Promise<Object|null>} The most recent revision record, or null.
 */
const getLatestRevision = async ({ revisionTable, entityId }) => {
  if (!revisionTable || !entityId) throw new Error('revisionTable and entityId are required')

  const revisionModel = getRevisionModel(revisionTable)
  if (!revisionModel) throw new Error(`Unknown revision table: ${revisionTable}`)

  const latest = await revisionModel.findOne({
    where: { [`${getEntityKey(revisionTable)}`]: entityId },
    order: [['revisionNumber', 'DESC']]
  })

  return latest
}

module.exports = {
  getActivityLogs,
  getProviderActivityLogs,
  getProviderActivityTotalCount,
  getUserActivityLogs,
  getUserActivityTotalCount,
  getPreviousRevision,
  getLatestRevision
}
