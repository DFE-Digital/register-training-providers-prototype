const { Sequelize, Op } = require('sequelize')

const { getProviderLastUpdated } = require('../helpers/activityLog')
const { govukDate } = require('../helpers/date')
const { isAccreditedProvider, getAccreditationDetails } = require('../helpers/accreditation')
const { getAcademicYearDetails } = require('../helpers/academicYear')
const { partnershipExistsForProviderPair, getEligiblePartnerProviders } = require('../helpers/partnership')
const { appendSection } = require('../helpers/string')
const { AcademicYear, Provider, ProviderAccreditation, ProviderAccreditationPartnership, ProviderPartnership } = require('../models')
const { saveAccreditationPartnerships, saveAcademicYearPartnerships } = require('../services/partnerships')
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

const formatAcademicYearItems = (academicYears) => {
  return academicYears.map(academicYear => {
    const startsOn = govukDate(academicYear.startsOn)
    const endsOn = academicYear.endsOn ? `, ends on ${govukDate(academicYear.endsOn)}` : ''

    return {
      text: academicYear.name,
      value: academicYear.id,
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

/// ------------------------------------------------------------------------ ///
/// List provider partnerships
/// ------------------------------------------------------------------------ ///

exports.providerPartnershipsList = async (req, res) => {
  delete req.session.data.partnership
  delete req.session.data.search
  delete req.session.data.provider
  // delete req.session.data.accreditations
  delete req.session.data.academicYears

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

  // Fetch all active partnership rows involving this provider
  const allPartnershipRows = await ProviderAccreditationPartnership.findAll({
    where: {
      deletedAt: null
    },
    include: [
      {
        model: ProviderAccreditation,
        as: 'providerAccreditation',
        where: {
          deletedAt: null,
        },
        include: [
          {
            model: Provider,
            as: 'provider',
            attributes: ['id', 'operatingName', 'legalName', 'ukprn', 'deletedAt']
          }
        ]
      },
      {
        model: Provider,
        as: 'partner',
        attributes: ['id', 'operatingName', 'legalName', 'ukprn', 'deletedAt']
      }
    ]
  })

  // Only keep rows where this provider is *either* the accredited provider or the partner
  const filteredRows = allPartnershipRows.filter(row =>
    row.partnerId === provider.id || row.providerAccreditation.providerId === provider.id
  )

  // Group by trainingProviderId + accreditedProviderId
  const grouped = {}

  for (const row of filteredRows) {
    const accreditedProvider = row.providerAccreditation.provider
    const accreditedProviderId = accreditedProvider.id
    const trainingPartner = row.partner
    const trainingPartnerId = trainingPartner.id

    const isAccreditedSide = provider.id === accreditedProviderId
    const key = `${trainingPartnerId}::${accreditedProviderId}`

    if (!grouped[key]) {
      grouped[key] = {
        id: row.id,
        accreditedProvider,
        trainingPartner,
        accreditations: [],
        isAccreditedSide,
        createdAt: row.createdAt
      }
    }

    grouped[key].accreditations.push({
      id: row.providerAccreditation.id,
      number: row.providerAccreditation.number,
      startsOn: row.providerAccreditation.startsOn,
      endsOn: row.providerAccreditation.endsOn
    })
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
    p.accreditations.sort((a, b) => a.number.localeCompare(b.number))
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
//         as: 'trainingProvider'
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

    const hasExistingPartnership = await partnershipExistsForProviderPair(
      isAccredited
        ? { accreditedProviderId: providerId, trainingProviderId: selectedProviderId }
        : { accreditedProviderId: selectedProviderId, trainingProviderId: providerId }
    )

    if (hasExistingPartnership) {
      res.redirect(`/providers/${providerId}/partnerships/new/duplicate`)
    } else {
      if (selectedProviderId) {
        res.redirect(`/providers/${providerId}/partnerships/new/academic-years`)
      } else {
        res.redirect(`/providers/${providerId}/partnerships/new/choose`)
      }
    }
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
  } else {
    const hasExistingPartnership = await partnershipExistsForProviderPair(
      isAccredited
        ? { accreditedProviderId: providerId, trainingProviderId: selectedProviderId }
        : { accreditedProviderId: selectedProviderId, trainingProviderId: providerId }
    )

    if (hasExistingPartnership) {
      errors.push({
        fieldName: 'provider',
        href: '#provider',
        text: isAccredited
          ? 'Training partner has already been added'
          : 'Accredited provider has already been added'
      })
    }
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
    res.redirect(`/providers/${providerId}/partnerships/new/academic-years`)
  }
}

exports.newProviderPartnershipAcademicYears_get = async (req, res) => {
  const { providerId } = req.params
  const isAccredited = await isAccreditedProvider({ providerId })

  const selectedProviderId = req.session.data?.provider?.id

  const providers = isAccredited
  ? { accreditedProviderId: providerId, trainingProviderId: selectedProviderId }
  : { accreditedProviderId: selectedProviderId, trainingProviderId: providerId }

  const accreditedProvider = await Provider.findByPk(providers.accreditedProviderId)
  const trainingProvider = await Provider.findByPk(providers.trainingProviderId)

  const currentAYStart = getCurrentAcademicYearStart()
  const cutoffCode = currentAYStart + 1

  const academicYears = await AcademicYear.findAll({
    where: {
      deletedAt: null,
      // model stores code as STRING; cast to integer for numeric compare
      [Op.and]: [
        Sequelize.where(
          Sequelize.cast(Sequelize.col('code'), 'INTEGER'),
          { [Op.lte]: cutoffCode }
        )
      ]
    },
    order: [['startsOn', 'ASC']]
  })

  const academicYearItems = formatAcademicYearItems(academicYears)
  const selectedAcademicYears = req.session.data?.academicYears

  res.render('providers/partnerships/academic-years', {
    accreditedProvider,
    trainingProvider,
    isAccredited,
    academicYearItems,
    selectedAcademicYears,
    actions: {
      back: `/providers/${providerId}/partnerships/new`,
      cancel: `/providers/${providerId}/partnerships`,
      save: `/providers/${providerId}/partnerships/new/academic-years`
    }
  })
}

exports.newProviderPartnershipAcademicYears_post = async (req, res) => {
  const { providerId } = req.params
  const isAccredited = await isAccreditedProvider({ providerId })

  const selectedProviderId = req.session.data?.provider?.id

  const providers = isAccredited
  ? { accreditedProviderId: providerId, trainingProviderId: selectedProviderId }
  : { accreditedProviderId: selectedProviderId, trainingProviderId: providerId }

  const accreditedProvider = await Provider.findByPk(providers.accreditedProviderId)
  const trainingProvider = await Provider.findByPk(providers.trainingProviderId)

  const currentAYStart = getCurrentAcademicYearStart()
  const cutoffCode = currentAYStart + 1

  const academicYears = await AcademicYear.findAll({
    where: {
      deletedAt: null,
      // model stores code as STRING; cast to integer for numeric compare
      [Op.and]: [
        Sequelize.where(
          Sequelize.cast(Sequelize.col('code'), 'INTEGER'),
          { [Op.lte]: cutoffCode }
        )
      ]
    },
    order: [['startsOn', 'ASC']]
  })

  const academicYearItems = formatAcademicYearItems(academicYears)
  const selectedAcademicYears = req.session.data?.academicYears

  const errors = []

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
      trainingProvider,
      isAccredited,
      academicYearItems,
      selectedAcademicYears,
      errors,
      actions: {
        back: `/providers/${providerId}/partnerships/new`,
        cancel: `/providers/${providerId}/partnerships`,
        save: `/providers/${providerId}/partnerships/new/academic-years`
      }
    })
  } else {
    res.redirect(`/providers/${providerId}/partnerships/new/check`)
  }
}

// exports.newProviderPartnershipAccreditations_get = async (req, res) => {
//   const { providerId } = req.params
//   const isAccredited = await isAccreditedProvider({ providerId })

//   const selectedProviderId = req.session.data?.provider?.id

//   const selectedAccreditations = req.session.data?.accreditations

//   const providers = isAccredited
//   ? { accreditedProviderId: providerId, trainingProviderId: selectedProviderId }
//   : { accreditedProviderId: selectedProviderId, trainingProviderId: providerId }

//   const accreditedProvider = await Provider.findByPk(providers.accreditedProviderId)
//   const trainingProvider = await Provider.findByPk(providers.trainingProviderId)

//   const providerAccreditations = await ProviderAccreditation.findAll({
//     where: {
//       providerId: providers.accreditedProviderId,
//       deletedAt: null
//     },
//     order: [
//       // 1) earliest start first
//       ['startsOn', 'ASC'],

//       // 2) end date: real dates first, nulls last, then earliest end first
//       [Sequelize.literal('"ProviderAccreditation"."ends_on" IS NULL'), 'ASC'],
//       ['endsOn', 'ASC'],

//       // 3) accreditation number (cast in case it's stored as TEXT)
//       [Sequelize.cast(Sequelize.col('number'), 'INTEGER'), 'ASC']
//     ]
//   })

//   const accreditationItems = formatAccreditationItems(providerAccreditations)

//   res.render('providers/partnerships/accreditations', {
//     accreditedProvider,
//     trainingProvider,
//     isAccredited,
//     accreditationItems,
//     selectedAccreditations,
//     actions: {
//       back: `/providers/${providerId}/partnerships/new`,
//       cancel: `/providers/${providerId}/partnerships`,
//       save: `/providers/${providerId}/partnerships/new/accreditations`
//     }
//   })
// }

// exports.newProviderPartnershipAccreditations_post = async (req, res) => {
//   const { providerId } = req.params
//   const isAccredited = await isAccreditedProvider({ providerId })

//   const selectedProviderId = req.session.data?.provider?.id

//   const selectedAccreditations = req.session.data?.accreditations

//   const providers = isAccredited
//   ? { accreditedProviderId: providerId, trainingProviderId: selectedProviderId }
//   : { accreditedProviderId: selectedProviderId, trainingProviderId: providerId }

//   const accreditedProvider = await Provider.findByPk(providers.accreditedProviderId)
//   const trainingProvider = await Provider.findByPk(providers.trainingProviderId)

//   const providerAccreditations = await ProviderAccreditation.findAll({
//     where: {
//       providerId: providers.accreditedProviderId,
//       deletedAt: null
//     },
//     order: [
//       // 1) earliest start first
//       ['startsOn', 'ASC'],

//       // 2) end date: real dates first, nulls last, then earliest end first
//       [Sequelize.literal('"ProviderAccreditation"."ends_on" IS NULL'), 'ASC'],
//       ['endsOn', 'ASC'],

//       // 3) accreditation number (cast in case it's stored as TEXT)
//       [Sequelize.cast(Sequelize.col('number'), 'INTEGER'), 'ASC']
//     ]
//   })

//   const accreditationItems = formatAccreditationItems(providerAccreditations)

//   const errors = []

//   if (!selectedAccreditations.length) {
//     const error = {}
//     error.fieldName = 'accreditations'
//     error.href = '#accreditations'
//     error.text = 'Select an accreditation'
//     errors.push(error)
//   }

//   if (errors.length > 0) {
//     res.render('providers/partnerships/accreditations', {
//       accreditedProvider,
//       trainingProvider,
//       isAccredited,
//       accreditationItems,
//       selectedAccreditations,
//       errors,
//       actions: {
//         back: `/providers/${providerId}/partnerships/new`,
//         cancel: `/providers/${providerId}/partnerships`,
//         save: `/providers/${providerId}/partnerships/new/accreditations`
//       }
//     })
//   } else {
//     res.redirect(`/providers/${providerId}/partnerships/new/check`)
//   }
// }

exports.newProviderPartnershipCheck_get = async (req, res) => {
  const { providerId } = req.params
  const isAccredited = await isAccreditedProvider({ providerId })

  const selectedProviderId = req.session.data?.provider?.id

  const providers = isAccredited
    ? { accreditedProviderId: providerId, trainingProviderId: selectedProviderId }
    : { accreditedProviderId: selectedProviderId, trainingProviderId: providerId }

  const accreditedProvider = await Provider.findByPk(providers.accreditedProviderId)
  const trainingProvider = await Provider.findByPk(providers.trainingProviderId)

  // get the selected accreditations
  // const selectedAccreditations = await getAccreditationDetails(req.session.data?.accreditations)

  // const accreditationItems = formatAccreditationItems(selectedAccreditations)

  // get the selected accreditations
  const selectedAcademicYears = await getAcademicYearDetails(req.session.data?.academicYears)

  const academicYearItems = formatAcademicYearItems(selectedAcademicYears)

  res.render('providers/partnerships/check-your-answers', {
    accreditedProvider,
    trainingProvider,
    isAccredited,
    // accreditationItems,
    academicYearItems,
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

  // get the provider from the session data
  const { provider } = req.session.data

  // get the signed in user
  const { user } = req.session.passport

  // calculate if the provider is accredited
  const isAccredited = await isAccreditedProvider({ providerId })

  // await saveAccreditationPartnerships({
  //   accreditationIds: req.session.data?.accreditations,
  //   partnerId: isAccredited ? provider.id : providerId,
  //   userId: user.id
  // })

  // save the partnership and get the partnershipId
  const partnership = await ProviderPartnership.create({
    accreditedProviderId: isAccredited ? provider.id : providerId,
    trainingProviderId: isAccredited ? providerId : provider.id,
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

  req.flash('success', 'Partnership added')
  res.redirect(`/providers/${providerId}/partnerships`)
}

/// ------------------------------------------------------------------------ ///
/// Edit provider partnership
/// ------------------------------------------------------------------------ ///

exports.editProviderPartnershipAccreditations_get = async (req, res) => {
  const { providerId, partnershipId } = req.params

  const currentProvider = await Provider.findByPk(providerId)

  // Load the original partnership record (one row)
  const initial = await ProviderAccreditationPartnership.findByPk(partnershipId, {
    include: [
      {
        model: ProviderAccreditation,
        as: 'providerAccreditation',
        include: [{ model: Provider, as: 'provider' }]
      },
      {
        model: Provider,
        as: 'partner'
      }
    ]
  })

  if (!initial) return res.status(404).send('Partnership not found')

  const trainingProvider = initial.partner
  const accreditedProvider = initial.providerAccreditation.provider
  const accreditedProviderId = accreditedProvider.id
  const partnerId = initial.partnerId

  // Get all accreditations for the accredited provider
  const providerAccreditations = await ProviderAccreditation.findAll({
    where: {
      providerId: accreditedProviderId,
      deletedAt: null
    }
  })

  // Get all *active* rows for this same partnership
  const activePartnerships = await ProviderAccreditationPartnership.findAll({
    where: {
      partnerId,
      deletedAt: null
    },
    include: [
      {
        model: ProviderAccreditation,
        as: 'providerAccreditation',
        where: {
          providerId: accreditedProviderId,
          deletedAt: null
        }
      }
    ]
  })

  const selectedAccreditations = req.session.data.accreditations || activePartnerships.map(p => p.providerAccreditationId)
  const accreditationItems = formatAccreditationItems(providerAccreditations)

  res.render('providers/partnerships/accreditations', {
    currentProvider,
    accreditedProvider,
    trainingProvider,
    isAccredited: currentProvider.id === accreditedProvider.id,
    accreditationItems,
    selectedAccreditations,
    actions: {
      back: `/providers/${providerId}/partnerships`,
      cancel: `/providers/${providerId}/partnerships`,
      save: `/providers/${providerId}/partnerships/${partnershipId}/accreditations`
    }
  })
}


exports.editProviderPartnershipAccreditations_post = async (req, res) => {
  const { providerId, partnershipId } = req.params
  const currentProvider = await Provider.findByPk(providerId)

  let selectedAccreditations = req.session.data.accreditations
  selectedAccreditations = Array.isArray(selectedAccreditations)
    ? selectedAccreditations
    : [selectedAccreditations]

  // Load the initial row to reconstruct the full partnership
  const initial = await ProviderAccreditationPartnership.findByPk(partnershipId, {
    include: [
      {
        model: ProviderAccreditation,
        as: 'providerAccreditation',
        include: [{ model: Provider, as: 'provider' }]
      },
      {
        model: Provider,
        as: 'partner'
      }
    ]
  })

  if (!initial) return res.status(404).send('Partnership not found')

  const trainingProvider = initial.partner
  const accreditedProvider = initial.providerAccreditation.provider
  const accreditedProviderId = accreditedProvider.id

  const providerAccreditations = await ProviderAccreditation.findAll({
    where: {
      providerId: accreditedProviderId,
      deletedAt: null
    }
  })

  const accreditationItems = formatAccreditationItems(providerAccreditations)

  const errors = []
  if (!selectedAccreditations.length) {
    errors.push({
      fieldName: 'accreditations',
      href: '#accreditations',
      text: 'Select an accreditation'
    })
  }

  if (errors.length > 0) {
    res.render('providers/partnerships/accreditations', {
      currentProvider,
      accreditedProvider,
      trainingProvider,
      isAccredited: currentProvider.id === accreditedProvider.id,
      accreditationItems,
      selectedAccreditations,
      errors,
      actions: {
        back: `/providers/${providerId}/partnerships`,
        cancel: `/providers/${providerId}/partnerships`,
        save: `/providers/${providerId}/partnerships/${partnershipId}/accreditations`
      }
    })
  } else {
    res.redirect(`/providers/${providerId}/partnerships/${partnershipId}/check`)
  }
}

exports.editProviderPartnershipCheck_get = async (req, res) => {
  const { providerId, partnershipId } = req.params
  const currentProvider = await Provider.findByPk(providerId)

  const selectedAccreditations = req.session.data?.accreditations || []

  // Load one row from the partnership to reconstruct both providers
  const initial = await ProviderAccreditationPartnership.findByPk(partnershipId, {
    include: [
      {
        model: ProviderAccreditation,
        as: 'providerAccreditation',
        include: [{ model: Provider, as: 'provider' }]
      },
      {
        model: Provider,
        as: 'partner'
      }
    ]
  })

  const trainingProvider = initial.partner
  const accreditedProvider = initial.providerAccreditation.provider
  const accreditedProviderId = accreditedProvider.id

  const providerAccreditations = await ProviderAccreditation.findAll({
    where: {
      id: selectedAccreditations,
      providerId: accreditedProviderId,
      deletedAt: null
    }
  })

  providerAccreditations.sort((a, b) => a.number.localeCompare(b.number))

  const accreditationItems = formatAccreditationItems(providerAccreditations)

  res.render('providers/partnerships/check-your-answers', {
    currentProvider,
    accreditedProvider,
    trainingProvider,
    isAccredited: currentProvider.id === accreditedProvider.id,
    accreditationItems,
    actions: {
      back: `/providers/${providerId}/partnerships/${partnershipId}/accreditations`,
      change: `/providers/${providerId}/partnerships/${partnershipId}`,
      cancel: `/providers/${providerId}/partnerships`,
      save: `/providers/${providerId}/partnerships/${partnershipId}/check`
    }
  })
}

exports.editProviderPartnershipCheck_post = async (req, res) => {
  const { providerId, partnershipId } = req.params
  const { user } = req.session.passport
  const now = new Date()

  const selectedAccreditations = req.session.data?.accreditations || []
  if (!selectedAccreditations.length) {
    return res.redirect(`/providers/${providerId}/partnerships/${partnershipId}/accreditations`)
  }

  // Get one existing partnership row to reconstruct the context
  const initial = await ProviderAccreditationPartnership.findByPk(partnershipId, {
    include: [
      {
        model: ProviderAccreditation,
        as: 'providerAccreditation',
        include: [{ model: Provider, as: 'provider' }]
      }
    ]
  })

  if (!initial) return res.status(404).send('Partnership not found')

  const partnerId = initial.partnerId
  const accreditedProviderId = initial.providerAccreditation.provider.id

  // Get *all active* rows for this partnership
  const existingPartnerships = await ProviderAccreditationPartnership.findAll({
    where: {
      partnerId,
      deletedAt: null
    },
    include: [
      {
        model: ProviderAccreditation,
        as: 'providerAccreditation',
        where: {
          providerId: accreditedProviderId
        }
      }
    ]
  })

  const existingIds = existingPartnerships.map(p => p.providerAccreditationId.toString())

  const toDelete = existingPartnerships.filter(p => !selectedAccreditations.includes(p.providerAccreditationId.toString()))
  const toAdd = selectedAccreditations.filter(id => !existingIds.includes(id))

  // Soft-delete removed accreditations
  for (const record of toDelete) {
    await record.update({
      deletedAt: now,
      deletedById: user.id
    })
  }

  // Add new partnerships
  for (const accreditationId of toAdd) {
    await ProviderAccreditationPartnership.create({
      providerAccreditationId: accreditationId,
      partnerId,
      createdAt: now,
      createdById: user.id,
      updatedAt: now,
      updatedById: user.id
    })
  }

  // Clear session
  delete req.session.data.accreditations

  req.flash('success', 'Partnership updated')
  res.redirect(`/providers/${providerId}/partnerships`)
}

/// ------------------------------------------------------------------------ ///
/// Delete provider partnership
/// ------------------------------------------------------------------------ ///

exports.deleteProviderPartnership_get = async (req, res) => {
  const { providerId, partnershipId } = req.params

  const provider = await Provider.findByPk(providerId)

  const partnership = await ProviderAccreditationPartnership.findByPk(partnershipId, {
    include: [
      {
        model: ProviderAccreditation,
        as: 'providerAccreditation',
        include: [
          {
            model: Provider,
            as: 'provider'
          }
        ]
      },
      {
        model: Provider,
        as: 'partner'
      }
    ]
  })

  if (!provider || !partnership) {
    return res.status(404).render('errors/404')
  }

  // Determine relationship direction
  const isAccredited = partnership.providerAccreditation.provider.id === provider.id

  const accreditedProvider = partnership.providerAccreditation.provider
  const trainingProvider = partnership.partner

  const titlePartnerName = isAccredited
    ? trainingProvider.operatingName
    : accreditedProvider.operatingName

  const captionProviderName = isAccredited
    ? accreditedProvider.operatingName
    : trainingProvider.operatingName

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
    // 1) Load the clicked row to reconstruct the pair
    const clicked = await ProviderAccreditationPartnership.findByPk(partnershipId, {
      include: [
        {
          model: ProviderAccreditation,
          as: 'providerAccreditation',
          include: [{ model: Provider, as: 'provider' }]
        }
      ],
      transaction: t
    })

    if (!clicked) {
      await t.rollback()
      return res.status(404).send('Partnership not found')
    }

    const partnerId = clicked.partnerId
    const accreditedProviderId = clicked.providerAccreditation.provider.id
    const now = new Date()

    // 2) Load ALL active rows for this pair (one per accreditation)
    const allActiveRowsForPair = await ProviderAccreditationPartnership.findAll({
      where: { partnerId, deletedAt: null },
      include: [{
        model: ProviderAccreditation,
        as: 'providerAccreditation',
        required: true,
        where: { providerId: accreditedProviderId, deletedAt: null }
      }],
      transaction: t
    })

    if (allActiveRowsForPair.length === 0) {
      // Nothing to delete; treat as already deleted
      await t.commit()
      req.flash('success', 'Partnership deleted')
      return res.redirect(`/providers/${providerId}/partnerships`)
    }

    // 3) Soft-delete every row with instance.update so hooks fire per row
    for (const row of allActiveRowsForPair) {
      await row.update(
        { deletedAt: now, deletedById: user.id, updatedById: user.id },
        { transaction: t } // instance.update => runs afterUpdate hook
      )
    }

    await t.commit()
    req.flash('success', 'Partnership deleted')
    res.redirect(`/providers/${providerId}/partnerships`)
  } catch (err) {
    await t.rollback()
    console.error('[delete partnership]', err)
    res.status(500).send('Failed to delete partnership')
  }
}
