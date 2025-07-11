const { Provider, ProviderPartnership, ProviderAccreditation, ProviderAccreditationPartnership } = require('../models')
const { savePartnerships } = require('../services/partnerships')
const Pagination = require('../helpers/pagination')
const { isAccreditedProvider, getAccreditationDetails } = require('../helpers/accreditation')
const { govukDate } = require('../helpers/date')
const { hasPartnership, getEligiblePartnerProviders } = require('../helpers/partnership')

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

/// ------------------------------------------------------------------------ ///
/// List provider partnerships
/// ------------------------------------------------------------------------ ///

exports.providerPartnershipsList = async (req, res) => {
  delete req.session.data.partnership
  delete req.session.data.search
  delete req.session.data.provider
  delete req.session.data.accreditations

  const page = parseInt(req.query.page, 10) || 1
  const limit = parseInt(req.query.limit, 10) || 25
  const offset = (page - 1) * limit

  const { providerId } = req.params
  const provider = await Provider.findByPk(providerId)

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
            attributes: ['id', 'operatingName', 'legalName', 'ukprn']
          }
        ]
      },
      {
        model: Provider,
        as: 'partner',
        attributes: ['id', 'operatingName', 'legalName', 'ukprn']
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

  // Sort by partner operating name
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

exports.providerPartnershipDetails = async (req, res) => {
  // clear session partnership data
  delete req.session.data.search
  delete req.session.data.provider
  delete req.session.data.accreditations

  // get the provider and partnership IDs from the request
  const { providerId, partnershipId } = req.params

  // get the current provider
  const provider = await Provider.findByPk(providerId)

  // calculate if the provider is accredited
  const isAccredited = await isAccreditedProvider({ providerId })

  const partnership = await ProviderPartnership.findByPk(partnershipId, {
    include: [
      {
        model: Provider,
        as: 'trainingProvider'
      },
      {
        model: Provider,
        as: 'accreditedProvider'
      }
    ]
  })

  res.render('providers/partnerships/show', {
    provider,
    partnership,
    isAccredited,
    actions: {
      back: `/providers/${providerId}`,
      cancel: `/providers/${providerId}/partnerships`,
      delete: `/providers/${providerId}/partnerships`
    }
  })
}

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

    const hasExistingPartnership = await hasPartnership(
      isAccredited
        ? { accreditedProviderId: providerId, trainingProviderId: selectedProviderId }
        : { accreditedProviderId: selectedProviderId, trainingProviderId: providerId }
    )

    if (hasExistingPartnership) {
      res.redirect(`/providers/${providerId}/partnerships/new/duplicate`)
    } else {
      if (selectedProviderId) {
        res.redirect(`/providers/${providerId}/partnerships/new/accreditations`)
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
    const hasExistingPartnership = await hasPartnership(
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
    res.redirect(`/providers/${providerId}/partnerships/new/accreditations`)
  }
}

exports.newProviderPartnershipAccreditations_get = async (req, res) => {
  const { providerId } = req.params
  const isAccredited = await isAccreditedProvider({ providerId })

  const selectedProviderId = req.session.data?.provider?.id

  const selectedAccreditations = req.session.data?.accreditations

  const providers = isAccredited
  ? { accreditedProviderId: providerId, trainingProviderId: selectedProviderId }
  : { accreditedProviderId: selectedProviderId, trainingProviderId: providerId }

  const accreditedProvider = await Provider.findByPk(providers.accreditedProviderId)
  const trainingProvider = await Provider.findByPk(providers.trainingProviderId)

  const providerAccreditations = await ProviderAccreditation.findAll({
    where: {
      providerId: providers.accreditedProviderId,
      deletedAt: null
    }
  })

  const accreditationItems = formatAccreditationItems(providerAccreditations)

  res.render('providers/partnerships/accreditations', {
    accreditedProvider,
    trainingProvider,
    isAccredited,
    accreditationItems,
    selectedAccreditations,
    actions: {
      back: `/providers/${providerId}/partnerships/new`,
      cancel: `/providers/${providerId}/partnerships`,
      save: `/providers/${providerId}/partnerships/new/accreditations`
    }
  })
}

exports.newProviderPartnershipAccreditations_post = async (req, res) => {
  const { providerId } = req.params
  const isAccredited = await isAccreditedProvider({ providerId })

  const selectedProviderId = req.session.data?.provider?.id

  const selectedAccreditations = req.session.data?.accreditations

  const providers = isAccredited
  ? { accreditedProviderId: providerId, trainingProviderId: selectedProviderId }
  : { accreditedProviderId: selectedProviderId, trainingProviderId: providerId }

  const accreditedProvider = await Provider.findByPk(providers.accreditedProviderId)
  const trainingProvider = await Provider.findByPk(providers.trainingProviderId)

  const providerAccreditations = await ProviderAccreditation.findAll({
    where: {
      providerId: providers.accreditedProviderId,
      deletedAt: null
    }
  })

  const accreditationItems = formatAccreditationItems(providerAccreditations)

  const errors = []

  if (!selectedAccreditations.length) {
    const error = {}
    error.fieldName = 'accreditations'
    error.href = '#accreditations'
    error.text = 'Select an accreditation'
    errors.push(error)
  }

  if (errors.length > 0) {
    res.render('providers/partnerships/accreditations', {
      accreditedProvider,
      trainingProvider,
      isAccredited,
      accreditationItems,
      selectedAccreditations,
      errors,
      actions: {
        back: `/providers/${providerId}/partnerships/new`,
        cancel: `/providers/${providerId}/partnerships`,
        save: `/providers/${providerId}/partnerships/new/accreditations`
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

  const providers = isAccredited
    ? { accreditedProviderId: providerId, trainingProviderId: selectedProviderId }
    : { accreditedProviderId: selectedProviderId, trainingProviderId: providerId }

  const accreditedProvider = await Provider.findByPk(providers.accreditedProviderId)
  const trainingProvider = await Provider.findByPk(providers.trainingProviderId)

  // get the selected accreditations
  const selectedAccreditations = await getAccreditationDetails(req.session.data?.accreditations)

  const accreditationItems = formatAccreditationItems(selectedAccreditations)

  res.render('providers/partnerships/check-your-answers', {
    accreditedProvider,
    trainingProvider,
    isAccredited,
    accreditationItems,
    actions: {
      back: `/providers/${providerId}/partnerships/new/accreditations?referrer=check`,
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

  await savePartnerships({
    accreditationIds: req.session.data?.accreditations,
    partnerId: isAccredited ? provider.id : providerId,
    userId: user.id
  })

  delete req.session.data.search
  delete req.session.data.provider
  delete req.session.data.accreditations

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

  const partnership = await ProviderAccreditationPartnership.findByPk(partnershipId)

  await partnership.update({
    deletedAt: new Date(),
    deletedById: user.id,
    updatedById: user.id
  })

  req.flash('success', 'Partnership deleted')
  res.redirect(`/providers/${providerId}/partnerships`)
}
