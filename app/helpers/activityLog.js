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

const revisionAssociationMap = {
  provider_revisions: 'providerRevision',
  provider_accreditation_revisions: 'providerAccreditationRevision',
  provider_address_revisions: 'providerAddressRevision',
  provider_contact_revisions: 'providerContactRevision',
  user_revisions: 'userRevision'
}

// Shared formatter
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

// Global / entityId-based
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

// Provider-specific
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

// User-specific
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

// Shared revision summary
const getRevisionSummary = ({ revision, revisionTable, ...log }) => {
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
      activity = `Provider ${log.action}d`
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

module.exports = {
  getActivityLogs,
  getProviderActivityLogs,
  getProviderActivityTotalCount,
  getUserActivityLogs,
  getUserActivityTotalCount
}
