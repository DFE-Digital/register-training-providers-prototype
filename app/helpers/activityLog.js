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

const revisionAssociationMap = {
  provider_revisions: 'providerRevision',
  provider_accreditation_revisions: 'providerAccreditationRevision',
  provider_address_revisions: 'providerAddressRevision',
  provider_contact_revisions: 'providerContactRevision',
  user_revisions: 'userRevision'
}

const getActivityLogs = async ({ entityId = null, limit = 25, offset = 0 }) => {
  const whereClause = entityId ? { entityId } : {}

  const activityLogs = await ActivityLog.findAll({
    where: whereClause,
    include: [
      {
        model: ProviderRevision,
        as: 'providerRevision',
        include: [{ model: require('../models').Provider, as: 'provider' }]
      },
      {
        model: ProviderAccreditationRevision,
        as: 'providerAccreditationRevision',
        include: [{ model: require('../models').Provider, as: 'provider' }]
      },
      {
        model: ProviderAddressRevision,
        as: 'providerAddressRevision',
        include: [{ model: require('../models').Provider, as: 'provider' }]
      },
      {
        model: ProviderContactRevision,
        as: 'providerContactRevision',
        include: [{ model: require('../models').Provider, as: 'provider' }]
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

  const withRevisions = activityLogs.map((log) => {
    try {
      const logJson = log.toJSON()
      const alias = revisionAssociationMap[log.revisionTable]
      const revision = log[alias] || null
      logJson.revision = revision ? revision.toJSON?.() || revision : null
      logJson.summary = getRevisionSummary({ revision: logJson.revision, revisionTable: log.revisionTable, ...logJson })
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
  })

  return withRevisions
}

const getProviderActivityLogs = async ({ providerId = null, limit = 25, offset = 0 }) => {
  if (!providerId) {
    throw new Error('providerId is required for this function')
  }

  const queries = []

  // ProviderRevision logs
  queries.push(
    ActivityLog.findAll({
      where: { revisionTable: 'provider_revisions' },
      include: [
        {
          model: ProviderRevision,
          as: 'providerRevision',
          where: { providerId },
          include: [{ model: Provider, as: 'provider' }]
        },
        { model: User, as: 'changedByUser' }
      ]
    })
  )

  // ProviderAccreditationRevision logs
  queries.push(
    ActivityLog.findAll({
      where: { revisionTable: 'provider_accreditation_revisions' },
      include: [
        {
          model: ProviderAccreditationRevision,
          as: 'providerAccreditationRevision',
          where: { providerId },
          include: [{ model: Provider, as: 'provider' }]
        },
        { model: User, as: 'changedByUser' }
      ]
    })
  )

  // ProviderAddressRevision logs
  queries.push(
    ActivityLog.findAll({
      where: { revisionTable: 'provider_address_revisions' },
      include: [
        {
          model: ProviderAddressRevision,
          as: 'providerAddressRevision',
          where: { providerId },
          include: [{ model: Provider, as: 'provider' }]
        },
        { model: User, as: 'changedByUser' }
      ]
    })
  )

  // ProviderContactRevision logs
  queries.push(
    ActivityLog.findAll({
      where: { revisionTable: 'provider_contact_revisions' },
      include: [
        {
          model: ProviderContactRevision,
          as: 'providerContactRevision',
          where: { providerId },
          include: [{ model: Provider, as: 'provider' }]
        },
        { model: User, as: 'changedByUser' }
      ]
    })
  )

  const results = (await Promise.all(queries)).flat()

  // Sort by changedAt descending
  results.sort((a, b) => new Date(b.changedAt) - new Date(a.changedAt))

  // Apply pagination manually after sorting
  const paginated = results.slice(offset, offset + limit)

  const enriched = paginated.map((log) => {
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
  })

  return enriched
}

// const getRevisionSummary = (log) => {
//   const { revision, revisionTable } = log
//   if (!revision) return {}

//   switch (revisionTable) {
//     case 'provider_revisions':
//       return {
//         label: `Provider ${log.action}d`,
//         id: revision.providerId,
//         title: revision.operatingName,
//         action: `/providers/${revision.providerId}`,
//         fields: [
//           { label: 'Provider type', value: revision.type },
//           { label: 'Operating name', value: revision.operatingName },
//           { label: 'Legal name', value: revision.legalName },
//           { label: 'UK provider reference number (UKPRN)', value: revision.ukprn },
//           { label: 'Unique reference number (URN)', value: revision.urn },
//           { label: 'Provider code', value: revision.code }
//         ]
//       }

//     case 'provider_accreditation_revisions':
//       return {
//         label: `Provider accreditation ${log.action}d`,
//         id: revision.providerId,
//         title: revision.operatingName,
//         action: `/providers/${revision.providerId}`,
//         fields: [
//           { label: 'Accreditation number', value: revision.number },
//           { label: 'Starts on', value: revision.startsOn },
//           { label: 'Ends on', value: revision.endsOn }
//         ]
//       }

//     case 'provider_address_revisions':
//       return {
//         label: `Provider address ${log.action}d`,
//         id: revision.providerId,
//         title: revision.operatingName,
//         action: `/providers/${revision.providerId}`,
//         fields: [
//           { label: 'Address line 1', value: revision.line1 },
//           { label: 'Address line 2', value: revision.line2 },
//           { label: 'Address line 3', value: revision.line3 },
//           { label: 'Town or city', value: revision.town },
//           { label: 'Postcode', value: revision.postcode },
//           { label: 'Latitude', value: revision.latitude },
//           { label: 'Longitude', value: revision.longitude }
//         ]
//       }

//     case 'provider_contact_revisions':
//       return {
//         label: `Provider contact ${log.action}d`,
//         id: revision.providerId,
//         title: revision.operatingName,
//         action: `/providers/${revision.providerId}`,
//         fields: [
//           { label: 'First name', value: revision.firstName },
//           { label: 'Last name', value: revision.lastName },
//           { label: 'Email address', value: revision.email },
//           { label: 'Phone', value: revision.telephone }
//         ]
//       }

//     case 'user_revisions':
//       return {
//         label: `User ${log.action}d`,
//         id: revision.userId,
//         title: `${revision.firstName} ${revision.lastName}`,
//         action: `/users/${revision.userId}`,
//         fields: [
//           { label: 'First name', value: revision.firstName },
//           { label: 'Last name', value: revision.lastName },
//           { label: 'Email address', value: revision.email }
//         ]
//       }

//     default:
//       return {
//         label: 'Unknown revision type',
//         fields: []
//       }
//   }
// }

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

      fields.push({ key: 'Provider type', value: revision.type })
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
      label = `${providerName} – address details`
      href = `/providers/${revision.providerId}/addresses`

      fields.push({ key: 'Address line 1', value: revision.line1 })
      fields.push({ key: 'Address line 2', value: revision.line2 })
      fields.push({ key: 'Address line 3', value: revision.line3 })
      fields.push({ key: 'Town or city', value: revision.town })
      fields.push({ key: 'County', value: revision.county })
      fields.push({ key: 'Postcode', value: revision.postcode })
      break
    }

    case 'provider_contact_revisions': {
      const provider = revision.provider
      const providerName = provider?.operatingName || provider?.legalName || 'Provider'
      activity = `Provider contact ${log.action}d`
      label = `${providerName} – contact details`
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
      label = `${providerName} – accreditation`
      href = `/providers/${revision.providerId}/accreditations`

      fields.push({ key: 'Accreditation number', value: revision.number })
      fields.push({ key: 'Accreditation starts on', value: revision.startsOn })
      fields.push({ key: 'Accreditation ends on', value: revision.endsOn })
      break
    }

    case 'user_revisions':
      activity = `User ${log.action}d`
      label = `${revision.firstName} ${revision.lastName}` || revision.email || 'User'
      href = `/users/${revision.userId}`
      id = revision.userId

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
  getProviderActivityLogs
}
