const { Provider, ProviderPartnership, ProviderAccreditation } = require('../models')
const Pagination = require('../helpers/pagination')
const { isAccreditedProvider } = require('../helpers/accreditation')
const { hasPartnership, getEligiblePartnerProviders } = require('../helpers/partnership')

const { Op } = require('sequelize')

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

/// ------------------------------------------------------------------------ ///
/// List provider partnerships
/// ------------------------------------------------------------------------ ///

exports.providerPartnershipsList = async (req, res) => {
  // Clear session data
  delete req.session.data.partnership
  delete req.session.data.search
  delete req.session.data.provider

  const page = parseInt(req.query.page, 10) || 1
  const limit = parseInt(req.query.limit, 10) || 25
  const offset = (page - 1) * limit

  // get the providerId from the request for use in subsequent queries
  const { providerId } = req.params

  // get the current provider
  const provider = await Provider.findByPk(providerId)

  // calculate if the provider is accredited
  const isAccredited = await isAccreditedProvider({ providerId })

  // Get the total number of partnerships for pagination metadata
  let totalCount = 0

  if (isAccredited) {
    totalCount = await ProviderPartnership.count({
      where: { accreditedProviderId: providerId, deletedAt: null }
    })

    // fetch the trainingPartnerships sorted
    provider.partnerships = await provider.getTrainingPartnerships({
      through: {
        where: { deletedAt: null },
      },
      order: [['operatingName', 'ASC']],
      limit,
      offset
    })
  } else {
    totalCount = await ProviderPartnership.count({
      where: { trainingProviderId: providerId, deletedAt: null }
    })

    // fetch the accreditedPartnerships sorted
    provider.partnerships = await provider.getAccreditedPartnerships({
      through: {
        where: { deletedAt: null },
      },
      order: [['operatingName', 'ASC']],
      limit,
      offset
    })
  }

  // Create your Pagination object
  // using the chunk + the overall total count
  const pagination = new Pagination(provider.partnerships, totalCount, page, limit)

  res.render('providers/partnerships/index', {
    provider,
    isAccredited,
    // Partnerships for *this* page
    partnerships: pagination.getData(),
    // The pagination metadata (pageItems, nextPage, etc.)
    pagination,
    actions: {
      new: `/providers/${providerId}/partnerships/new`,
      delete: `/providers/${providerId}/partnerships`,
      view: `/providers`
    }
  })
}

/// ------------------------------------------------------------------------ ///
/// Show single provider partnership
/// ------------------------------------------------------------------------ ///

exports.providerPartnershipDetails = async (req, res) => {
  // clear session partnership data
  delete req.session.data.provider
  delete req.session.data.search

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
  const provider = await Provider.findByPk(providerId)
  const partner = await Provider.findByPk(req.session.data.provider.id)

  // TODO
  const accreditationItems = []

  res.render('providers/partnerships/accreditations', {
    provider,
    partner,
    accreditationItems,
    actions: {
      back: `/providers/${providerId}/partnerships/new`,
      cancel: `/providers/${providerId}/partnerships`,
      save: `/providers/${providerId}/partnerships/new/accreditations`
    }
  })
}

exports.newProviderPartnershipAccreditations_post = async (req, res) => {
  const { providerId } = req.params
  const provider = await Provider.findByPk(providerId)
  const partner = await Provider.findByPk(req.session.data.provider.id)

  // TODO
  const accreditationItems = []

  const errors = []

  if (errors.length > 0) {
    res.render('providers/partnerships/accreditations', {
      provider,
      partner,
      accreditationItems,
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
  // get the provider and partnership IDs from the request
  const { providerId } = req.params
  const provider = await Provider.findByPk(providerId)
  const partner = await Provider.findByPk(req.session.data.provider.id)
  const isAccredited = await isAccreditedProvider({ providerId: partner.id })
  res.render('providers/partnerships/check-your-answers', {
    provider,
    partner,
    isAccredited,
    actions: {
      back: `/providers/${providerId}/partnerships/new?referrer=check`,
      cancel: `/providers/${providerId}/partnerships`,
      change: `/providers/${providerId}/partnerships/new?referrer=check`,
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

  if (isAccredited) {
    // if the provider is accredited, the partner provider is the training provider
    await ProviderPartnership.create({
      accreditedProviderId: providerId,
      trainingProviderId: provider.id,
      createdById: user.id,
      updatedById: user.id
    })
  } else {
    // if the provider is not accredited, the partner provider is the accredited provider
    await ProviderPartnership.create({
      accreditedProviderId: provider.id,
      trainingProviderId: providerId,
      createdById: user.id,
      updatedById: user.id
    })
  }

  delete req.session.data.search
  delete req.session.data.provider

  req.flash('success', 'Partnership added')
  res.redirect(`/providers/${providerId}/partnerships`)
}

/// ------------------------------------------------------------------------ ///
/// Delete provider partnership
/// ------------------------------------------------------------------------ ///

exports.deleteProviderPartnership_get = async (req, res) => {
  // get the provider and partnership IDs from the request
  const { providerId, partnershipId } = req.params
  const provider = await Provider.findByPk(providerId)
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

  const isAccredited = await isAccreditedProvider({ providerId })

  res.render('providers/partnerships/delete', {
    provider,
    partnership,
    isAccredited,
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
  const partnership = await ProviderPartnership.findByPk(partnershipId)
  await partnership.update({
    deletedAt: new Date(),
    deletedById: user.id,
    updatedById: user.id
  })

  req.flash('success', 'Partnership deleted')
  res.redirect(`/providers/${providerId}/partnerships`)
}
