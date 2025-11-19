const { Sequelize, Op } = require('sequelize')

const { getProviderLastUpdated } = require('../helpers/activityLog')
const { govukDate } = require('../helpers/date')
const { isAccreditedProvider, getAccreditationDetails } = require('../helpers/accreditation')
const { getAcademicYearDetails } = require('../helpers/academicYear')
const { partnershipExistsForProviderPair, getEligiblePartnerProviders } = require('../helpers/partnership')
const { appendSection } = require('../helpers/string')
const { validateDateInput, getDateParts } = require('../helpers/validation/date')
const { AcademicYear, Provider, ProviderPartnership, ProviderPartnershipAcademicYear, ProviderPartnershipRevision } = require('../models')
const { saveAcademicYearPartnerships } = require('../services/partnerships')
const Pagination = require('../helpers/pagination')

const formatProviderItems = (providers) => {
  return providers
    .map(provider => ({
      text: provider.operatingName,
      value: provider.id,
      hint: { text: `UKPRN: ${provider.ukprn}` }
    }))
    .sort((a, b) => a.text.localeCompare(b.text))
    .slice(0, 15)
}

const formatAccreditationItems = (accreditations) => {
  return accreditations.map(accreditation => {
    const startsOn = govukDate(accreditation.startsOn)
    const endsOn = accreditation.endsOn ? `, ends on ${govukDate(accreditation.endsOn)}` : ''

    return {
      text: accreditation.number,
      value: accreditation.id,
      hint: { text: `Starts on ${startsOn}${endsOn}` }
    }
  })
}

const getCurrentAcademicYearStart = (now = new Date(), timeZone = 'Europe/London') => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone, year: 'numeric', month: 'numeric', day: 'numeric'
  }).formatToParts(now)
  const y = Number(parts.find(p => p.type === 'year').value)
  const m = Number(parts.find(p => p.type === 'month').value) // 1–12
  const d = Number(parts.find(p => p.type === 'day').value)
  // If on/after 1 Aug => current AY starts this calendar year; else previous year
  return (m > 8 || (m === 8 && d >= 1)) ? y : (y - 1)
}

const getAcademicYearStatusLabel = (academicYear, currentAcademicYearStart = getCurrentAcademicYearStart()) => {
  if (!academicYear || !academicYear.startsOn) {
    return null
  }

  const startDate = new Date(academicYear.startsOn)
  if (Number.isNaN(startDate.getTime())) {
    return null
  }

  const startYear = startDate.getUTCFullYear()

  if (startYear === currentAcademicYearStart) {
    return 'current'
  }

  if (startYear === currentAcademicYearStart - 1) {
    return 'last'
  }

  if (startYear === currentAcademicYearStart + 1) {
    return 'next'
  }

  return null
}

const getAcademicYearStartCodeFromDate = (value) => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  return getCurrentAcademicYearStart(date)
}

const formatAcademicYearItems = (academicYears, { includeStatusLabels = false } = {}) => {
  const currentAcademicYearStart = includeStatusLabels ? getCurrentAcademicYearStart() : null

  return academicYears.map(academicYear => {
    const startsOn = govukDate(academicYear.startsOn)
    const endsOn = academicYear.endsOn ? `, ends on ${govukDate(academicYear.endsOn)}` : ''
    const label = includeStatusLabels
      ? getAcademicYearStatusLabel(academicYear, currentAcademicYearStart)
      : null
    const text = label ? `${academicYear.name} - ${label}` : academicYear.name

    return {
      text,
      value: academicYear.id,
      hint: { text: `Starts on ${startsOn}${endsOn}` }
    }
  })
}

/**
 * List academic years that can be linked to a partnership based on the
 * previously entered start/end dates. We expose the year containing the start
 * date and everything after it, but stop before the year that contains the end
 * date so users can't pick an academic year that extends beyond the partnership.
 */
const listAcademicYearsForSelection = async ({ startsOn, endsOn } = {}) => {
  const currentAYStart = getCurrentAcademicYearStart()
  const cutoffCode = currentAYStart + 1
  const where = {
    deletedAt: null,
    [Op.and]: []
  }
  const codeAsInteger = Sequelize.cast(Sequelize.col('code'), 'INTEGER')

  where[Op.and].push(
    Sequelize.where(
      codeAsInteger,
      { [Op.lte]: cutoffCode }
    )
  )

  const startCode = getAcademicYearStartCodeFromDate(startsOn)
  if (startCode !== null) {
    where[Op.and].push(
      Sequelize.where(
        codeAsInteger,
        { [Op.gte]: startCode }
      )
    )
  }

  const endCode = getAcademicYearStartCodeFromDate(endsOn)
  if (endCode !== null) {
    where[Op.and].push(
      Sequelize.where(
        codeAsInteger,
        { [Op.lt]: endCode }
      )
    )
  }

  return AcademicYear.findAll({
    where,
    order: [['startsOn', 'ASC']]
  })
}

const normaliseAcademicYearSelection = (selection) => {
  if (!selection) return []
  if (Array.isArray(selection)) return selection.filter(Boolean)
  return selection ? [selection] : []
}

const formatDateForInput = (value) => {
  if (!value) return {}
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return {}
  return {
    day: String(date.getUTCDate()),
    month: String(date.getUTCMonth() + 1),
    year: String(date.getUTCFullYear())
  }
}

const validatePartnershipDateRange = ({ startsOnInput, endsOnInput }) => {
  const errors = []
  let startsOnFieldErrors = null
  let endsOnFieldErrors = null
  let startsOnIso = null
  let endsOnIso = null

  const startResult = validateDateInput(
    getDateParts(startsOnInput),
    {
      label: 'date the partnership started',
      baseId: 'startsOn',
      constraint: 'todayOrPast',
      minYear: 1990,
      maxYear: 2050
    }
  )

  if (!startResult.valid) {
    errors.push(startResult.summaryError)
    startsOnFieldErrors = startResult.fieldFlags || null
  } else {
    startsOnIso = startResult.iso
  }

  const endParts = getDateParts(endsOnInput)
  const hasEndInput = !!(endParts.day || endParts.month || endParts.year)

  if (hasEndInput) {
    const endResult = validateDateInput(
      endParts,
      {
        label: 'date the partnership ends',
        baseId: 'endsOn',
        minYear: 1990,
        maxYear: 2050,
        constraint: startsOnIso ? { onOrAfter: new Date(startsOnIso) } : undefined
      }
    )

    if (!endResult.valid) {
      errors.push(endResult.summaryError)
      endsOnFieldErrors = endResult.fieldFlags || null
    } else {
      endsOnIso = endResult.iso
    }
  }

  return {
    errors,
    startsOnFieldErrors,
    endsOnFieldErrors,
    startsOnIso,
    endsOnIso
  }
}

const toISODateString = (value) => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString().slice(0, 10)
}

const forcePartnershipRevision = async ({ partnership, userId }) => {
  const latestRevision = await ProviderPartnershipRevision.findOne({
    where: { providerPartnershipId: partnership.id },
    order: [['revisionNumber', 'DESC']]
  })

  const revisionNumber = latestRevision ? latestRevision.revisionNumber + 1 : 1

  await ProviderPartnershipRevision.create({
    providerPartnershipId: partnership.id,
    accreditedProviderId: partnership.accreditedProviderId,
    trainingPartnerId: partnership.trainingPartnerId,
    startsOn: partnership.startsOn,
    endsOn: partnership.endsOn,
    revisionNumber,
    revisionAt: new Date(),
    revisionById: userId
  }, { activityAction: 'update' })
}

const initialisePartnershipEditSession = (req, partnership) => {
  req.session.data = req.session.data || {}
  const existing = req.session.data.partnershipEdit

  if (!existing || existing.partnershipId !== partnership.id) {
    req.session.data.partnershipEdit = {
      partnershipId: partnership.id,
      partnershipDates: {
        startsOnIso: toISODateString(partnership.startsOn),
        endsOnIso: toISODateString(partnership.endsOn)
      }
    }
    req.session.data.startsOn = formatDateForInput(partnership.startsOn)
    req.session.data.endsOn = formatDateForInput(partnership.endsOn)
    delete req.session.data.academicYears
  }

  return req.session.data.partnershipEdit
}

const clearPartnershipEditSession = (req) => {
  if (!req.session?.data) return
  delete req.session.data.startsOn
  delete req.session.data.endsOn
  delete req.session.data.academicYears
  delete req.session.data.partnershipEdit
}

/// ------------------------------------------------------------------------ ///
/// List provider partnerships
/// ------------------------------------------------------------------------ ///

exports.providerPartnershipsList = async (req, res) => {
  delete req.session.data.partnership
  delete req.session.data.search
  delete req.session.data.provider
  delete req.session.data.academicYears
  delete req.session.data.startsOn
  delete req.session.data.endsOn
  delete req.session.data.partnershipDates
  delete req.session.data.partnershipEdit

  const page = parseInt(req.query.page, 10) || 1
  const limit = parseInt(req.query.limit, 10) || 25
  const offset = (page - 1) * limit

  const { providerId } = req.params
  const provider = await Provider.findByPk(providerId)

  // Run in parallel: accreditation flag + last update (by providerId)
  const [isAccredited, lastUpdate] = await Promise.all([
    isAccreditedProvider({ providerId }),
    getProviderLastUpdated(providerId, { includeDeletedChildren: true })
  ])

  // Fetch all academic year links for partnerships involving this provider
  const academicYearLinks = await ProviderPartnershipAcademicYear.findAll({
    where: {
      deletedAt: null
    },
    include: [
      {
        model: ProviderPartnership,
        as: 'partnership',
        where: {
          deletedAt: null,
          [Op.or]: [
            { trainingPartnerId: provider.id },
            { accreditedProviderId: provider.id }
          ]
        },
        include: [
          {
            model: Provider,
            as: 'trainingPartner',
            attributes: ['id', 'operatingName', 'legalName', 'ukprn', 'deletedAt']
          },
          {
            model: Provider,
            as: 'accreditedProvider',
            attributes: ['id', 'operatingName', 'legalName', 'ukprn', 'deletedAt']
          }
        ]
      },
      {
        model: AcademicYear,
        as: 'academicYear',
        where: {
          deletedAt: null
        },
        attributes: ['id', 'name', 'startsOn', 'endsOn', 'code']
      }
    ],
    order: [
      [{ model: AcademicYear, as: 'academicYear' }, 'startsOn', 'ASC']
    ]
  })

  const currentAcademicYearStart = getCurrentAcademicYearStart()

  // Group by partnership id (one row per partnership when rendered)
  const grouped = {}

  for (const link of academicYearLinks) {
    const partnership = link.partnership
    if (!partnership) {
      continue
    }

    const accreditedProvider = partnership.accreditedProvider
    const trainingPartner = partnership.trainingPartner
    const partnershipId = partnership.id
    const isAccreditedSide = provider.id === partnership.accreditedProviderId

    if (!grouped[partnershipId]) {
      grouped[partnershipId] = {
        id: partnershipId,
        accreditedProvider,
        trainingPartner,
        startsOn: partnership.startsOn,
        endsOn: partnership.endsOn,
        academicYears: [],
        isAccreditedSide,
        createdAt: partnership.createdAt
      }
    }

    if (link.academicYear) {
      const label = getAcademicYearStatusLabel(link.academicYear, currentAcademicYearStart)
      const name = label ? `${link.academicYear.name} - ${label}` : link.academicYear.name

      grouped[partnershipId].academicYears.push({
        id: link.academicYear.id,
        name,
        startsOn: link.academicYear.startsOn,
        endsOn: link.academicYear.endsOn
      })
    }
  }

  const partnerships = Object.values(grouped)

  // ▼ Add linkability + hrefs based on soft-delete flags
  for (const p of partnerships) {
    const partnerDeleted = !!p.trainingPartner.deletedAt
    const accreditedDeleted = !!p.accreditedProvider.deletedAt

    p.partnerIsLinkable = !partnerDeleted
    p.accreditedIsLinkable = !accreditedDeleted

    // Build hrefs only when linkable; append `/partnerships` once.
    p.partnerHref = p.partnerIsLinkable
      ? appendSection(`/providers/${p.trainingPartner.id}`, 'partnerships')
      : null

    p.accreditedHref = p.accreditedIsLinkable
      ? appendSection(`/providers/${p.accreditedProvider.id}`, 'partnerships')
      : null
  }

  // Sort and paginate (unchanged)
  partnerships.sort((a, b) => {
    const aName = a.isAccreditedSide ? a.trainingPartner.operatingName : a.accreditedProvider.operatingName
    const bName = b.isAccreditedSide ? b.trainingPartner.operatingName : b.accreditedProvider.operatingName
    return aName.localeCompare(bName)
  })

  for (const p of partnerships) {
    p.academicYears.sort((a, b) => new Date(a.startsOn) - new Date(b.startsOn))
  }

  const totalCount = partnerships.length
  const paginatedData = partnerships.slice(offset, offset + limit)
  const pagination = new Pagination(paginatedData, totalCount, page, limit)

  res.render('providers/partnerships/index', {
    provider,
    isAccredited,
    lastUpdate,
    partnerships: pagination.getData(),
    pagination,
    actions: {
      new: `/providers/${providerId}/partnerships/new`,
      delete: `/providers/${providerId}/partnerships`,
      change: `/providers/${providerId}/partnerships`
    }
  })
}

/// ------------------------------------------------------------------------ ///
/// Show single provider partnership
/// ------------------------------------------------------------------------ ///

// exports.providerPartnershipDetails = async (req, res) => {
//   // clear session partnership data
//   delete req.session.data.search
//   delete req.session.data.provider
//   delete req.session.data.accreditations

//   // get the provider and partnership IDs from the request
//   const { providerId, partnershipId } = req.params

//   // get the current provider
//   const provider = await Provider.findByPk(providerId)

//   // calculate if the provider is accredited
//   const isAccredited = await isAccreditedProvider({ providerId })

//   const partnership = await ProviderPartnership.findByPk(partnershipId, {
//     include: [
//       {
//         model: Provider,
//         as: 'trainingPartner'
//       },
//       {
//         model: Provider,
//         as: 'accreditedProvider'
//       }
//     ]
//   })

//   res.render('providers/partnerships/show', {
//     provider,
//     partnership,
//     isAccredited,
//     actions: {
//       back: `/providers/${providerId}`,
//       cancel: `/providers/${providerId}/partnerships`,
//       delete: `/providers/${providerId}/partnerships`
//     }
//   })
// }

/// ------------------------------------------------------------------------ ///
/// New provider partnership
/// ------------------------------------------------------------------------ ///

exports.newProviderPartnership_get = async (req, res) => {
  // get the providerId from the request for use in subsequent queries
  const { providerId } = req.params

  // get the current provider
  const provider = await Provider.findByPk(providerId)

  // calculate if the provider is accredited
  const isAccredited = await isAccreditedProvider({ providerId })

  req.session.data = req.session.data || {}
  delete req.session.data.startsOn
  delete req.session.data.endsOn
  delete req.session.data.partnershipDates
  delete req.session.data.academicYears

  // if (req.query.referrer === 'check') {
  //   delete req.session.data.provider.id
  // }

  let back = `/providers/${providerId}/partnerships`
  if (req.query.referrer === 'check') {
    back = `/providers/${providerId}/partnerships/new/check`
  }

  res.render('providers/partnerships/find', {
    provider,
    isAccredited,
    actions: {
      back,
      cancel: `/providers/${providerId}/partnerships`,
      save: `/providers/${providerId}/partnerships/new`
    }
  })
}

exports.newProviderPartnership_post = async (req, res) => {
  // get the providerId from the request for use in subsequent queries
  const { providerId } = req.params

  // get the current provider
  const provider = await Provider.findByPk(providerId)

  // calculate if the provider is accredited
  const isAccredited = await isAccreditedProvider({ providerId })

  const errors = []

  if (!req.session.data.search.length) {
    const error = {}
    error.fieldName = 'provider'
    error.href = '#provider'
    if (isAccredited) {
      error.text = 'Enter training partner name, UKPRN or URN'
    } else {
      error.text = 'Enter accredited provider name, UKPRN or URN'
    }
    errors.push(error)
  }

  if (errors.length) {
    let back = `/providers/${providerId}/partnerships`
    if (req.query.referrer === 'check') {
      back = `/providers/${providerId}/partnerships/new/check`
    }

    res.render('providers/partnerships/find', {
      provider,
      isAccredited,
      errors,
      actions: {
        back,
        cancel: `/providers/${providerId}/partnerships`,
        save: `/providers/${providerId}/partnerships/new`
      }
    })
  } else {
    const selectedProviderId = req.session.data?.provider?.id

    if (!selectedProviderId) {
      return res.redirect(`/providers/${providerId}/partnerships/new/choose`)
    }

    res.redirect(`/providers/${providerId}/partnerships/new/dates`)
  }
}

exports.newProviderPartnershipDuplicate_get = async (req, res) => {
  // get the provider and partnership IDs from the request
  const { providerId } = req.params
  const provider = await Provider.findByPk(providerId)

  const partner = await Provider.findByPk(req.session.data.provider.id)

  res.render('providers/partnerships/duplicate', {
    provider,
    partner,
    actions: {
      back: `/providers/${providerId}/partnerships/new`,
      cancel: `/providers/${providerId}/partnerships`,
      change: `/providers/${providerId}/partnerships/new`
    }
  })
}

exports.newProviderPartnershipChoose_get = async (req, res) => {
  const { providerId } = req.params
  const provider = await Provider.findByPk(providerId)
  const isAccredited = await isAccreditedProvider({ providerId })

  const query = req.session.data.search || ''
  const providers = await getEligiblePartnerProviders({ isAccredited, query })
  const providerItems = formatProviderItems(providers)

  res.render('providers/partnerships/choose', {
    provider,
    isAccredited,
    providerItems,
    providerCount: providers.length,
    searchTerm: query,
    actions: {
      back: `/providers/${providerId}/partnerships/new`,
      cancel: `/providers/${providerId}/partnerships`,
      save: `/providers/${providerId}/partnerships/new/choose`
    }
  })
}

exports.newProviderPartnershipChoose_post = async (req, res) => {
  const { providerId } = req.params
  const provider = await Provider.findByPk(providerId)
  const isAccredited = await isAccreditedProvider({ providerId })

  const query = req.session.data.search || ''
  const selectedProviderId = req.session.data?.provider?.id
  const providers = await getEligiblePartnerProviders({ isAccredited, query })
  const providerItems = formatProviderItems(providers)

  const errors = []

  if (!selectedProviderId) {
    errors.push({
      fieldName: 'provider',
      href: '#provider',
      text: isAccredited
        ? 'Select a training partner'
        : 'Select an accredited provider'
    })
  }

  if (errors.length > 0) {
    res.render('providers/partnerships/choose', {
      provider,
      isAccredited,
      providerItems,
      providerCount: providers.length,
      searchTerm: query,
      errors,
      actions: {
        back: `/providers/${providerId}/partnerships/new`,
        cancel: `/providers/${providerId}/partnerships`,
        save: `/providers/${providerId}/partnerships/new/choose`
      }
    })
  } else {
    delete req.session.data.startsOn
    delete req.session.data.endsOn
    delete req.session.data.partnershipDates
    delete req.session.data.academicYears
    res.redirect(`/providers/${providerId}/partnerships/new/dates`)
  }
}

exports.newProviderPartnershipDates_get = async (req, res) => {
  const { providerId } = req.params
  req.session.data = req.session.data || {}
  const isAccredited = await isAccreditedProvider({ providerId })

  const selectedProviderId = req.session.data?.provider?.id
  if (!selectedProviderId) {
    return res.redirect(`/providers/${providerId}/partnerships/new/choose`)
  }

  const providers = isAccredited
  ? { accreditedProviderId: providerId, trainingPartnerId: selectedProviderId }
  : { accreditedProviderId: selectedProviderId, trainingPartnerId: providerId }

  const accreditedProvider = await Provider.findByPk(providers.accreditedProviderId)
  const trainingPartner = await Provider.findByPk(providers.trainingPartnerId)

  const startsOnStored = req.session.data.startsOn
  const endsOnStored = req.session.data.endsOn
  const startsOn = (startsOnStored && Object.keys(startsOnStored).length)
    ? startsOnStored
    : formatDateForInput(req.session.data.partnershipDates?.startsOnIso)
  const endsOn = (endsOnStored && Object.keys(endsOnStored).length)
    ? endsOnStored
    : formatDateForInput(req.session.data.partnershipDates?.endsOnIso)

  const fromCheck = req.query.referrer === 'check'
  const back = fromCheck
    ? `/providers/${providerId}/partnerships/new/check`
    : `/providers/${providerId}/partnerships/new`
  const save = fromCheck
    ? `/providers/${providerId}/partnerships/new/dates?referrer=check`
    : `/providers/${providerId}/partnerships/new/dates`

  res.render('providers/partnerships/dates', {
    accreditedProvider,
    trainingPartner,
    isAccredited,
    startsOn,
    endsOn,
    actions: {
      back,
      cancel: `/providers/${providerId}/partnerships`,
      save
    }
  })
}

exports.newProviderPartnershipDates_post = async (req, res) => {
  const { providerId } = req.params
  req.session.data = req.session.data || {}
  const isAccredited = await isAccreditedProvider({ providerId })

  const selectedProviderId = req.session.data?.provider?.id

  if (!selectedProviderId) {
    return res.redirect(`/providers/${providerId}/partnerships/new/choose`)
  }

  const providers = isAccredited
  ? { accreditedProviderId: providerId, trainingPartnerId: selectedProviderId }
  : { accreditedProviderId: selectedProviderId, trainingPartnerId: providerId }

  const accreditedProvider = await Provider.findByPk(providers.accreditedProviderId)
  const trainingPartner = await Provider.findByPk(providers.trainingPartnerId)

  req.session.data.startsOn = req.session.data.startsOn || {}
  req.session.data.endsOn = req.session.data.endsOn || {}
  req.session.data.partnershipDates = req.session.data.partnershipDates || {}

  const startsOnInput = req.session.data.startsOn
  const endsOnInput = req.session.data.endsOn

  const {
    errors,
    startsOnFieldErrors,
    endsOnFieldErrors,
    startsOnIso,
    endsOnIso
  } = validatePartnershipDateRange({
    startsOnInput,
    endsOnInput
  })

  const fromCheck = req.query.referrer === 'check'
  const back = fromCheck
    ? `/providers/${providerId}/partnerships/new/check`
    : `/providers/${providerId}/partnerships/new`
  const save = fromCheck
    ? `/providers/${providerId}/partnerships/new/dates?referrer=check`
    : `/providers/${providerId}/partnerships/new/dates`

  if (errors.length > 0) {
    res.render('providers/partnerships/dates', {
      accreditedProvider,
      trainingPartner,
      isAccredited,
      startsOn: startsOnInput,
      endsOn: endsOnInput,
      startsOnFieldErrors,
      endsOnFieldErrors,
      errors,
      actions: {
        back,
        cancel: `/providers/${providerId}/partnerships`,
        save
      }
    })
  } else {
    req.session.data.partnershipDates.startsOnIso = startsOnIso
    req.session.data.partnershipDates.endsOnIso = endsOnIso

    const hasOverlappingPartnership = await partnershipExistsForProviderPair(
      providers,
      {
        bidirectional: true,
        overlapsWith: {
          startsOn: startsOnIso,
          endsOn: endsOnIso
        }
      }
    )

    if (hasOverlappingPartnership) {
      return res.redirect(`/providers/${providerId}/partnerships/new/duplicate`)
    }

    if (fromCheck) {
      res.redirect(`/providers/${providerId}/partnerships/new/check`)
    } else {
      res.redirect(`/providers/${providerId}/partnerships/new/academic-years`)
    }
  }
}

exports.newProviderPartnershipAcademicYears_get = async (req, res) => {
  const { providerId } = req.params
  req.session.data = req.session.data || {}
  const isAccredited = await isAccreditedProvider({ providerId })

  if (!req.session.data.partnershipDates?.startsOnIso) {
    return res.redirect(`/providers/${providerId}/partnerships/new/dates`)
  }

  const selectedProviderId = req.session.data?.provider?.id
  if (!selectedProviderId) {
    return res.redirect(`/providers/${providerId}/partnerships/new`)
  }

  const providers = isAccredited
  ? { accreditedProviderId: providerId, trainingPartnerId: selectedProviderId }
  : { accreditedProviderId: selectedProviderId, trainingPartnerId: providerId }

  const accreditedProvider = await Provider.findByPk(providers.accreditedProviderId)
  const trainingPartner = await Provider.findByPk(providers.trainingPartnerId)

  const partnershipDates = req.session.data.partnershipDates || {}
  const academicYears = await listAcademicYearsForSelection({
    startsOn: partnershipDates.startsOnIso,
    endsOn: partnershipDates.endsOnIso
  })

  const academicYearItems = formatAcademicYearItems(academicYears, { includeStatusLabels: true })
  const selectedAcademicYears = normaliseAcademicYearSelection(req.session.data?.academicYears)
  const fromCheck = req.query.referrer === 'check'
  const back = fromCheck
    ? `/providers/${providerId}/partnerships/new/check`
    : `/providers/${providerId}/partnerships/new/dates`
  const save = fromCheck
    ? `/providers/${providerId}/partnerships/new/academic-years?referrer=check`
    : `/providers/${providerId}/partnerships/new/academic-years`

  res.render('providers/partnerships/academic-years', {
    accreditedProvider,
    trainingPartner,
    isAccredited,
    academicYearItems,
    selectedAcademicYears,
    actions: {
      back,
      cancel: `/providers/${providerId}/partnerships`,
      save
    }
  })
}

exports.newProviderPartnershipAcademicYears_post = async (req, res) => {
  const { providerId } = req.params
  req.session.data = req.session.data || {}
  const isAccredited = await isAccreditedProvider({ providerId })

  if (!req.session.data.partnershipDates?.startsOnIso) {
    return res.redirect(`/providers/${providerId}/partnerships/new/dates`)
  }

  const selectedProviderId = req.session.data?.provider?.id
  if (!selectedProviderId) {
    return res.redirect(`/providers/${providerId}/partnerships/new`)
  }

  const providers = isAccredited
  ? { accreditedProviderId: providerId, trainingPartnerId: selectedProviderId }
  : { accreditedProviderId: selectedProviderId, trainingPartnerId: providerId }

  const accreditedProvider = await Provider.findByPk(providers.accreditedProviderId)
  const trainingPartner = await Provider.findByPk(providers.trainingPartnerId)

  const partnershipDates = req.session.data.partnershipDates || {}
  const academicYears = await listAcademicYearsForSelection({
    startsOn: partnershipDates.startsOnIso,
    endsOn: partnershipDates.endsOnIso
  })

  const academicYearItems = formatAcademicYearItems(academicYears, { includeStatusLabels: true })
  const selectedAcademicYears = normaliseAcademicYearSelection(req.session.data?.academicYears)

  const errors = []
  const fromCheck = req.query.referrer === 'check'
  const back = fromCheck
    ? `/providers/${providerId}/partnerships/new/check`
    : `/providers/${providerId}/partnerships/new/dates`
  const save = fromCheck
    ? `/providers/${providerId}/partnerships/new/academic-years?referrer=check`
    : `/providers/${providerId}/partnerships/new/academic-years`

  if (!selectedAcademicYears.length) {
    const error = {}
    error.fieldName = 'academicYears'
    error.href = '#academicYears'
    error.text = 'Select academic year'
    errors.push(error)
  }

  if (errors.length > 0) {
    res.render('providers/partnerships/academic-years', {
      accreditedProvider,
      trainingPartner,
      isAccredited,
      academicYearItems,
      selectedAcademicYears,
      errors,
      actions: {
        back,
        cancel: `/providers/${providerId}/partnerships`,
        save
      }
    })
  } else {
    res.redirect(`/providers/${providerId}/partnerships/new/check`)
  }
}

exports.newProviderPartnershipCheck_get = async (req, res) => {
  const { providerId } = req.params
  const isAccredited = await isAccreditedProvider({ providerId })

  const selectedProviderId = req.session.data?.provider?.id
  if (!selectedProviderId) {
    return res.redirect(`/providers/${providerId}/partnerships/new/choose`)
  }
  req.session.data = req.session.data || {}

  if (!req.session.data.partnershipDates?.startsOnIso) {
    return res.redirect(`/providers/${providerId}/partnerships/new/dates`)
  }

  const providers = isAccredited
    ? { accreditedProviderId: providerId, trainingPartnerId: selectedProviderId }
    : { accreditedProviderId: selectedProviderId, trainingPartnerId: providerId }

  const accreditedProvider = await Provider.findByPk(providers.accreditedProviderId)
  const trainingPartner = await Provider.findByPk(providers.trainingPartnerId)

  const selectedAcademicYears = await getAcademicYearDetails(req.session.data?.academicYears)

  const academicYearItems = formatAcademicYearItems(selectedAcademicYears, { includeStatusLabels: true })
  const partnershipDates = {
    startsOn: govukDate(req.session.data.partnershipDates.startsOnIso),
    endsOn: req.session.data.partnershipDates.endsOnIso
      ? govukDate(req.session.data.partnershipDates.endsOnIso)
      : null
  }

  res.render('providers/partnerships/check-your-answers', {
    accreditedProvider,
    trainingPartner,
    isAccredited,
    academicYearItems,
    partnershipDates,
    actions: {
      back: `/providers/${providerId}/partnerships/new/academic-years?referrer=check`,
      cancel: `/providers/${providerId}/partnerships`,
      change: `/providers/${providerId}/partnerships/new`,
      save: `/providers/${providerId}/partnerships/new/check`
    }
  })
}

exports.newProviderPartnershipCheck_post = async (req, res) => {
  // get the providerId from the request for use in subsequent queries
  const { providerId } = req.params

  req.session.data = req.session.data || {}
  // get the provider from the session data
  const { provider } = req.session.data

  // get the signed in user
  const { user } = req.session.passport

  // calculate if the provider is accredited
  const isAccredited = await isAccreditedProvider({ providerId })

  if (!req.session.data.partnershipDates?.startsOnIso) {
    return res.redirect(`/providers/${providerId}/partnerships/new/dates`)
  }

  if (!provider?.id) {
    return res.redirect(`/providers/${providerId}/partnerships/new`)
  }

  const accreditedProviderId = isAccredited ? providerId : provider.id
  const trainingPartnerId = isAccredited ? provider.id : providerId

  const partnershipExists = await partnershipExistsForProviderPair(
    {
      accreditedProviderId,
      trainingPartnerId
    },
    {
      bidirectional: true,
      overlapsWith: {
        startsOn: req.session.data.partnershipDates.startsOnIso,
        endsOn: req.session.data.partnershipDates.endsOnIso
      }
    }
  )

  if (partnershipExists) {
    return res.redirect(`/providers/${providerId}/partnerships/new/duplicate`)
  }

  // save the partnership and get the partnershipId
  const partnership = await ProviderPartnership.create({
    accreditedProviderId,
    trainingPartnerId,
    startsOn: req.session.data.partnershipDates.startsOnIso,
    endsOn: req.session.data.partnershipDates.endsOnIso,
    createdById: user.id,
    updatedById: user.id
  })

  // save the academic years for the partnership
  await saveAcademicYearPartnerships({
    academicYearIds: req.session.data?.academicYears,
    partnershipId: partnership.id,
    userId: user.id
  })

  delete req.session.data.search
  delete req.session.data.provider
  // delete req.session.data.accreditations
  delete req.session.data.academicYears
  delete req.session.data.startsOn
  delete req.session.data.endsOn
  delete req.session.data.partnershipDates

  req.flash('success', 'Partnership added')
  res.redirect(`/providers/${providerId}/partnerships`)
}

/// ------------------------------------------------------------------------ ///
/// Edit provider partnership
/// ------------------------------------------------------------------------ ///

exports.editProviderPartnershipDates_get = async (req, res) => {
  const { providerId, partnershipId } = req.params
  req.session.data = req.session.data || {}

  const [currentProvider, partnership] = await Promise.all([
    Provider.findByPk(providerId),
    ProviderPartnership.findByPk(partnershipId, {
      include: [
        { model: Provider, as: 'trainingPartner' },
        { model: Provider, as: 'accreditedProvider' }
      ]
    })
  ])

  if (!currentProvider || !partnership) {
    return res.status(404).render('errors/404')
  }

  initialisePartnershipEditSession(req, partnership)

  const fromCheck = req.query.referrer === 'check'
  const back = fromCheck
    ? `/providers/${providerId}/partnerships/${partnershipId}/check`
    : `/providers/${providerId}/partnerships`
  const save = fromCheck
    ? `/providers/${providerId}/partnerships/${partnershipId}/dates?referrer=check`
    : `/providers/${providerId}/partnerships/${partnershipId}/dates`

  res.render('providers/partnerships/dates', {
    currentProvider,
    accreditedProvider: partnership.accreditedProvider,
    trainingPartner: partnership.trainingPartner,
    isAccredited: currentProvider.id === partnership.accreditedProviderId,
    startsOn: req.session.data.startsOn || formatDateForInput(partnership.startsOn),
    endsOn: req.session.data.endsOn || formatDateForInput(partnership.endsOn),
    actions: {
      back,
      cancel: `/providers/${providerId}/partnerships`,
      save
    }
  })
}

exports.editProviderPartnershipDates_post = async (req, res) => {
  const { providerId, partnershipId } = req.params
  req.session.data = req.session.data || {}
  req.session.data.startsOn = req.session.data.startsOn || {}
  req.session.data.endsOn = req.session.data.endsOn || {}

  const [currentProvider, partnership] = await Promise.all([
    Provider.findByPk(providerId),
    ProviderPartnership.findByPk(partnershipId, {
      include: [
        { model: Provider, as: 'trainingPartner' },
        { model: Provider, as: 'accreditedProvider' }
      ]
    })
  ])

  if (!currentProvider || !partnership) {
    return res.status(404).render('errors/404')
  }

  initialisePartnershipEditSession(req, partnership)

  const {
    errors,
    startsOnFieldErrors,
    endsOnFieldErrors,
    startsOnIso,
    endsOnIso
  } = validatePartnershipDateRange({
    startsOnInput: req.session.data.startsOn,
    endsOnInput: req.session.data.endsOn
  })

  const fromCheck = req.query.referrer === 'check'
  const back = fromCheck
    ? `/providers/${providerId}/partnerships/${partnershipId}/check`
    : `/providers/${providerId}/partnerships`
  const save = fromCheck
    ? `/providers/${providerId}/partnerships/${partnershipId}/dates?referrer=check`
    : `/providers/${providerId}/partnerships/${partnershipId}/dates`

  if (errors.length) {
    return res.render('providers/partnerships/dates', {
      currentProvider,
      accreditedProvider: partnership.accreditedProvider,
      trainingPartner: partnership.trainingPartner,
      isAccredited: currentProvider.id === partnership.accreditedProviderId,
      startsOn: req.session.data.startsOn,
      endsOn: req.session.data.endsOn,
      startsOnFieldErrors,
      endsOnFieldErrors,
      errors,
      actions: {
        back,
        cancel: `/providers/${providerId}/partnerships`,
        save
      }
    })
  }

  req.session.data.partnershipEdit = req.session.data.partnershipEdit || { partnershipId }
  req.session.data.partnershipEdit.startsOn = req.session.data.startsOn
  req.session.data.partnershipEdit.endsOn = req.session.data.endsOn
  req.session.data.partnershipEdit.partnershipDates = {
    startsOnIso,
    endsOnIso
  }

  const nextUrl = fromCheck
    ? `/providers/${providerId}/partnerships/${partnershipId}/academic-years?referrer=check`
    : `/providers/${providerId}/partnerships/${partnershipId}/academic-years`

  res.redirect(nextUrl)
}

exports.editProviderPartnershipAcademicYears_get = async (req, res) => {
  const { providerId, partnershipId } = req.params
  const currentProvider = await Provider.findByPk(providerId)
  const partnership = await ProviderPartnership.findByPk(partnershipId, {
    include: [
      { model: Provider, as: 'trainingPartner' },
      { model: Provider, as: 'accreditedProvider' }
    ]
  })

  if (!currentProvider || !partnership) {
    return res.status(404).render('errors/404')
  }

  req.session.data = req.session.data || {}
  initialisePartnershipEditSession(req, partnership)

  const dateFilters = req.session.data.partnershipEdit?.partnershipDates || {}

  const [academicYears, existingAcademicYears] = await Promise.all([
    listAcademicYearsForSelection({
      startsOn: dateFilters.startsOnIso,
      endsOn: dateFilters.endsOnIso
    }),
    ProviderPartnershipAcademicYear.findAll({
      where: { partnershipId, deletedAt: null },
      include: [
        {
          model: AcademicYear,
          as: 'academicYear',
          attributes: ['startsOn']
        }
      ],
      order: [
        [{ model: AcademicYear, as: 'academicYear' }, 'startsOn', 'ASC']
      ]
    })
  ])

  const fallbackSelection = existingAcademicYears.map(link => link.academicYearId.toString())
  let selectedAcademicYears = normaliseAcademicYearSelection(req.session.data.academicYears)

  if (!selectedAcademicYears.length && fallbackSelection.length) {
    selectedAcademicYears = fallbackSelection
    req.session.data.academicYears = selectedAcademicYears
  }
  req.session.data.partnershipEdit = req.session.data.partnershipEdit || { partnershipId }
  req.session.data.partnershipEdit.academicYears = selectedAcademicYears

  const academicYearItems = formatAcademicYearItems(academicYears, { includeStatusLabels: true })
  const cameFromCheck = req.query.referrer === 'check'
  const saveSuffix = cameFromCheck ? '?referrer=check' : ''

  res.render('providers/partnerships/academic-years', {
    currentProvider,
    accreditedProvider: partnership.accreditedProvider,
    trainingPartner: partnership.trainingPartner,
    isAccredited: currentProvider.id === partnership.accreditedProviderId,
    academicYearItems,
    selectedAcademicYears,
    actions: {
      back: cameFromCheck
        ? `/providers/${providerId}/partnerships/${partnershipId}/check`
        : `/providers/${providerId}/partnerships/${partnershipId}/dates`,
      cancel: `/providers/${providerId}/partnerships`,
      save: `/providers/${providerId}/partnerships/${partnershipId}/academic-years${saveSuffix}`
    }
  })
}

exports.editProviderPartnershipAcademicYears_post = async (req, res) => {
  const { providerId, partnershipId } = req.params
  const currentProvider = await Provider.findByPk(providerId)
  const partnership = await ProviderPartnership.findByPk(partnershipId, {
    include: [
      { model: Provider, as: 'trainingPartner' },
      { model: Provider, as: 'accreditedProvider' }
    ]
  })

  if (!currentProvider || !partnership) {
    return res.status(404).render('errors/404')
  }

  req.session.data = req.session.data || {}
  initialisePartnershipEditSession(req, partnership)

  let selectedAcademicYears = normaliseAcademicYearSelection(req.session.data.academicYears)
  const pendingDates = req.session.data.partnershipEdit?.partnershipDates || {}
  const academicYears = await listAcademicYearsForSelection({
    startsOn: pendingDates.startsOnIso,
    endsOn: pendingDates.endsOnIso
  })
  const academicYearItems = formatAcademicYearItems(academicYears, { includeStatusLabels: true })

  const errors = []
  if (!selectedAcademicYears.length) {
    errors.push({
      fieldName: 'academicYears',
      href: '#academicYears',
      text: 'Select academic year'
    })
  }

  const cameFromCheck = req.query.referrer === 'check'
  const saveSuffix = cameFromCheck ? '?referrer=check' : ''

  if (errors.length > 0) {
    res.render('providers/partnerships/academic-years', {
      currentProvider,
      accreditedProvider: partnership.accreditedProvider,
      trainingPartner: partnership.trainingPartner,
      isAccredited: currentProvider.id === partnership.accreditedProviderId,
      academicYearItems,
      selectedAcademicYears,
      errors,
      actions: {
        back: cameFromCheck
          ? `/providers/${providerId}/partnerships/${partnershipId}/check`
          : `/providers/${providerId}/partnerships/${partnershipId}/dates`,
        cancel: `/providers/${providerId}/partnerships`,
        save: `/providers/${providerId}/partnerships/${partnershipId}/academic-years${saveSuffix}`
      }
    })
  } else {
    req.session.data.academicYears = selectedAcademicYears
    req.session.data.partnershipEdit = req.session.data.partnershipEdit || { partnershipId }
    req.session.data.partnershipEdit.academicYears = selectedAcademicYears
    res.redirect(`/providers/${providerId}/partnerships/${partnershipId}/check`)
  }
}

exports.editProviderPartnershipCheck_get = async (req, res) => {
  const { providerId, partnershipId } = req.params
  const currentProvider = await Provider.findByPk(providerId)
  const partnership = await ProviderPartnership.findByPk(partnershipId, {
    include: [
      { model: Provider, as: 'trainingPartner' },
      { model: Provider, as: 'accreditedProvider' }
    ]
  })

  if (!currentProvider || !partnership) {
    return res.status(404).render('errors/404')
  }

  req.session.data = req.session.data || {}
  const editSession = initialisePartnershipEditSession(req, partnership)

  let selectedAcademicYears = normaliseAcademicYearSelection(req.session.data.academicYears)

  if (!selectedAcademicYears.length) {
    const existingAcademicYears = await ProviderPartnershipAcademicYear.findAll({
      where: { partnershipId, deletedAt: null },
      order: [['createdAt', 'ASC']]
    })
    selectedAcademicYears = existingAcademicYears.map(link => link.academicYearId.toString())
    req.session.data.academicYears = selectedAcademicYears
  }
  req.session.data.partnershipEdit.academicYears = selectedAcademicYears

  const academicYearDetails = await getAcademicYearDetails(selectedAcademicYears)
  academicYearDetails.sort((a, b) => new Date(a.startsOn) - new Date(b.startsOn))
  const academicYearItems = formatAcademicYearItems(academicYearDetails, { includeStatusLabels: true })
  const pendingDates = editSession.partnershipDates || {}
  const startsOnValue = pendingDates.startsOnIso || partnership.startsOn
  const hasPendingEndDate = Object.prototype.hasOwnProperty.call(pendingDates, 'endsOnIso')
  const endsOnValue = hasPendingEndDate ? pendingDates.endsOnIso : partnership.endsOn
  const partnershipDates = {
    startsOn: govukDate(startsOnValue),
    endsOn: endsOnValue ? govukDate(endsOnValue) : null
  }

  res.render('providers/partnerships/check-your-answers', {
    currentProvider,
    accreditedProvider: partnership.accreditedProvider,
    trainingPartner: partnership.trainingPartner,
    isAccredited: currentProvider.id === partnership.accreditedProviderId,
    academicYearItems,
    partnershipDates,
    actions: {
      back: `/providers/${providerId}/partnerships/${partnershipId}/academic-years?referrer=check`,
      change: `/providers/${providerId}/partnerships/${partnershipId}`,
      cancel: `/providers/${providerId}/partnerships`,
      save: `/providers/${providerId}/partnerships/${partnershipId}/check`
    }
  })
}

exports.editProviderPartnershipCheck_post = async (req, res) => {
  const { providerId, partnershipId } = req.params
  const { user } = req.session.passport
  const partnership = await ProviderPartnership.findByPk(partnershipId)

  if (!partnership) {
    return res.status(404).render('errors/404')
  }

  req.session.data = req.session.data || {}
  const editSession = initialisePartnershipEditSession(req, partnership)

  const selectedAcademicYears = normaliseAcademicYearSelection(req.session.data.academicYears)
  if (!selectedAcademicYears.length) {
    return res.redirect(`/providers/${providerId}/partnerships/${partnershipId}/academic-years`)
  }

  const now = new Date()

  const existingLinks = await ProviderPartnershipAcademicYear.findAll({
    where: { partnershipId, deletedAt: null }
  })

  const existingIds = existingLinks.map(link => link.academicYearId.toString())
  const toDelete = existingLinks.filter(link => !selectedAcademicYears.includes(link.academicYearId.toString()))
  const toAdd = selectedAcademicYears.filter(id => !existingIds.includes(id))
  const academicYearsChanged = toAdd.length > 0 || toDelete.length > 0

  for (const record of toDelete) {
    await record.update({
      deletedAt: now,
      deletedById: user.id
    })
  }

  if (toAdd.length) {
    await saveAcademicYearPartnerships({
      academicYearIds: toAdd,
      partnershipId,
      userId: user.id
    })
  }

  const pendingDates = editSession.partnershipDates || {}
  const previousStartsIso = toISODateString(partnership.startsOn)
  const previousEndsIso = toISODateString(partnership.endsOn)
  const startsOnIso = pendingDates.startsOnIso || previousStartsIso
  const endsOnIso = Object.prototype.hasOwnProperty.call(pendingDates, 'endsOnIso')
    ? pendingDates.endsOnIso
    : previousEndsIso
  const datesChanged = previousStartsIso !== startsOnIso || previousEndsIso !== endsOnIso

  await partnership.update({
    startsOn: startsOnIso,
    endsOn: endsOnIso,
    updatedAt: now,
    updatedById: user.id
  })

  if (academicYearsChanged && !datesChanged) {
    await forcePartnershipRevision({ partnership, userId: user.id })
  }

  clearPartnershipEditSession(req)

  req.flash('success', 'Partnership updated')
  res.redirect(`/providers/${providerId}/partnerships`)
}

/// ------------------------------------------------------------------------ ///
/// Delete provider partnership
/// ------------------------------------------------------------------------ ///

exports.deleteProviderPartnership_get = async (req, res) => {
  const { providerId, partnershipId } = req.params

  const provider = await Provider.findByPk(providerId)
  const partnership = await ProviderPartnership.findByPk(partnershipId, {
    include: [
      {
        model: Provider,
        as: 'trainingPartner'
      },
      {
        model: Provider,
        as: 'accreditedProvider'
      }
    ]
  })

  if (!provider || !partnership) {
    return res.status(404).render('errors/404')
  }

  // Determine relationship direction
  const isAccredited = partnership.accreditedProviderId === provider.id

  const accreditedProvider = partnership.accreditedProvider
  const trainingPartner = partnership.trainingPartner

  const titlePartnerName = isAccredited
    ? trainingPartner.operatingName
    : accreditedProvider.operatingName

  const captionProviderName = isAccredited
    ? accreditedProvider.operatingName
    : trainingPartner.operatingName

  res.render('providers/partnerships/delete', {
    provider,
    partnership,
    isAccredited,
    titlePartnerName,
    captionProviderName,
    actions: {
      back: `/providers/${providerId}/partnerships`,
      cancel: `/providers/${providerId}/partnerships`,
      save: `/providers/${providerId}/partnerships/${partnershipId}/delete`
    }
  })
}

exports.deleteProviderPartnership_post = async (req, res) => {
  const { providerId, partnershipId } = req.params
  const { user } = req.session.passport
  const sequelize = require('../models').sequelize
  const t = await sequelize.transaction()

  try {
    const partnership = await ProviderPartnership.findByPk(partnershipId, { transaction: t })

    if (!partnership) {
      await t.rollback()
      return res.status(404).send('Partnership not found')
    }

    const now = new Date()

    const academicYearLinks = await ProviderPartnershipAcademicYear.findAll({
      where: { partnershipId, deletedAt: null },
      transaction: t
    })

    for (const link of academicYearLinks) {
      await link.update(
        {
          deletedAt: now,
          deletedById: user.id,
          updatedAt: now,
          updatedById: user.id
        },
        { transaction: t }
      )
    }

    await partnership.update(
      {
        deletedAt: now,
        deletedById: user.id,
        updatedAt: now,
        updatedById: user.id
      },
      { transaction: t }
    )

    await t.commit()
    req.flash('success', 'Partnership deleted')
    res.redirect(`/providers/${providerId}/partnerships`)
  } catch (err) {
    await t.rollback()
    console.error('[delete partnership]', err)
    res.status(500).send('Failed to delete partnership')
  }
}
