const { v4: uuid } = require('uuid')
const { Provider, ProviderAccreditation } = require('../models')
const Pagination = require('../helpers/pagination')
const { isAccreditedProvider } = require('../helpers/accreditation')
const { isoDateFromDateInput } = require('../helpers/date')

/// ------------------------------------------------------------------------ ///
/// List provider accreditations
/// ------------------------------------------------------------------------ ///

exports.providerAccreditationsList = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1
  const limit = parseInt(req.query.limit, 10) || 50
  const offset = (page - 1) * limit

  // get the providerId from the request for use in subsequent queries
  const { providerId } = req.params

  // get the current provider
  const provider = await Provider.findByPk(providerId)

  // calculate if the provider is accredited
  const isAccredited = await isAccreditedProvider({ providerId })

  // Get the total number of accreditations for pagination metadata
  const totalCount = await ProviderAccreditation.count({
    where: { providerId }
  })

  // Only fetch ONE page of accreditations
  const accreditations = await ProviderAccreditation.findAll({
    where: { providerId },
    order: [['id', 'ASC']],
    limit,
    offset
  })

  // Create your Pagination object
  // using the chunk + the overall total count
  const pagination = new Pagination(accreditations, totalCount, page, limit)

  // Clear session provider data
  delete req.session.data.accreditation

  res.render('providers/accreditation/index', {
    provider,
    isAccredited,
    // Accreditations for *this* page
    accreditations: pagination.getData(),
    // The pagination metadata (pageItems, nextPage, etc.)
    pagination,
    actions: {
      new: `/providers/${providerId}/accreditations/new`
    }
  })
}

/// ------------------------------------------------------------------------ ///
/// Show single provider accreditation
/// ------------------------------------------------------------------------ ///

exports.providerAccreditationDetails = async (req, res) => {
  // Clear session accreditation data
  delete req.session.data.accreditation

  const accreditation = await ProviderAccreditation.findByPk(req.params.accreditationId, {
    include: [
      {
        model: Provider,
        as: 'provider'
      }
    ]
  })
  res.render('providers/accreditation/show', { accreditation })
}

/// ------------------------------------------------------------------------ ///
/// New provider accreditation
/// ------------------------------------------------------------------------ ///

exports.newProviderAccreditation_get = async (req, res) => {
  const provider = await Provider.findByPk(req.params.providerId)

  let back = `/providers/${req.params.providerId}`
  if (req.query.referrer === 'check') {
    back = `/providers/${req.params.providerId}/accreditations/new/check`
  }

  res.render('providers/accreditation/edit', {
    provider,
    accreditation: req.session.data.accreditation,
    actions: {
      back,
      cancel: `/providers/${req.params.providerId}`,
      save: `/providers/${req.params.providerId}/accreditations/new`
    }
  })
}

exports.newProviderAccreditation_post = async (req, res) => {
  const provider = await Provider.findByPk(req.params.providerId)
  const errors = []

  if (!req.session.data.accreditation.number.length) {
    const error = {}
    error.fieldName = "number"
    error.href = "#number"
    error.text = "Enter an accredited provider number"
    errors.push(error)
  }

  if (!(req.session.data.accreditation.startsOn?.day.length
    && req.session.data.accreditation.startsOn?.month.length
    && req.session.data.accreditation.startsOn?.year.length)
  ) {
    const error = {}
    error.fieldName = "startsOn"
    error.href = "#startsOn"
    error.text = "Enter date accreditation starts"
    errors.push(error)
  }

  if (errors.length) {
    let back = `/providers/${req.params.providerId}`
    if (req.query.referrer === 'check') {
      back = `/providers/${req.params.providerId}/accreditations/new/check`
    }

    res.render('providers/accreditation/edit', {
      provider,
      accreditation: req.session.data.accreditation,
      errors,
      actions: {
        back,
        cancel: `/providers/${req.params.providerId}`,
        save: `/providers/${req.params.providerId}/accreditations/new`
      }
    })
  } else {
    res.redirect(`/providers/${req.params.providerId}/accreditations/new/check`)
  }
}

exports.newProviderAccreditationCheck_get = async (req, res) => {
  const provider = await Provider.findByPk(req.params.providerId)
  res.render('providers/accreditation/check-your-answers', {
    provider,
    accreditation: req.session.data.accreditation,
    actions: {
      back: `/providers/${req.params.providerId}/accreditations/new`,
      cancel: `/providers/${req.params.providerId}`,
      change: `/providers/${req.params.providerId}/accreditations/new`,
      save: `/providers/${req.params.providerId}/accreditations/new/check`
    }
  })
}

exports.newProviderAccreditationCheck_post = async (req, res) => {
  let startsOn = isoDateFromDateInput(req.session.data.accreditation.startsOn)
  startsOn = new Date(startsOn)

  let endsOn = null
  if (isoDateFromDateInput(req.session.data.accreditation.endsOn) !== 'Invalid DateTime') {
    endsOn =  isoDateFromDateInput(req.session.data.accreditation.endsOn)
    endsOn = new Date(endsOn)
  }

  await ProviderAccreditation.create({
    id: uuid(),
    providerId: req.params.providerId,
    number: req.session.data.accreditation.number,
    startsOn,
    endsOn,
    createdAt: new Date(),
    createdById: req.session.passport.user.id
  })

  delete req.session.data.accreditation

  req.flash('success', 'Accreditation added')
  res.redirect(`/providers/${req.params.providerId}`)
}

/// ------------------------------------------------------------------------ ///
/// Edit provider accreditation
/// ------------------------------------------------------------------------ ///

exports.editProviderAccreditation_get = async (req, res) => {
  const provider = await Provider.findByPk(req.params.providerId)
  const currentAccreditation = await ProviderAccreditation.findByPk(req.params.accreditationId)

  let accreditation
  if (req.session.data?.accreditation) {
    accreditation = req.session.data.accreditation
  } else {
    accreditation = await ProviderAccreditation.findByPk(req.params.accreditationId)
  }

  let back = `/providers/${req.params.providerId}`
  if (req.query.referrer === 'check') {
    back = `/providers/${req.params.providerId}/accreditations/${req.params.accreditationId}/edit/check`
  }

  res.render('providers/accreditation/edit', {
    provider,
    currentAccreditation,
    accreditation,
    actions: {
      back,
      cancel: `/providers/${req.params.providerId}`,
      save: `/providers/${req.params.providerId}/accreditations/${req.params.accreditationId}/edit`
    }
  })
}

exports.editProviderAccreditation_post = async (req, res) => {
  const provider = await Provider.findByPk(req.params.providerId)
  const currentAccreditation = await ProviderAccreditation.findByPk(req.params.accreditationId)

  const errors = []

  if (!req.session.data.accreditation.number.length) {
    const error = {}
    error.fieldName = "number"
    error.href = "#number"
    error.text = "Enter an accredited provider number"
    errors.push(error)
  }

  if (!(req.session.data.accreditation.startsOn?.day.length
    && req.session.data.accreditation.startsOn?.month.length
    && req.session.data.accreditation.startsOn?.year.length)
  ) {
    const error = {}
    error.fieldName = "startsOn"
    error.href = "#startsOn"
    error.text = "Enter date accreditation starts"
    errors.push(error)
  }

  if (errors.length) {
    let back = `/providers/${req.params.providerId}`
    if (req.query.referrer === 'check') {
      back = `/providers/${req.params.providerId}/accreditations/${req.params.accreditationId}/edit/check`
    }

    res.render('providers/accreditation/edit', {
      provider,
      currentAccreditation,
      accreditation: req.session.data.accreditation,
      errors,
      actions: {
        back,
        cancel: `/providers/${req.params.providerId}`,
        save: `/providers/${req.params.providerId}/accreditations/${req.params.accreditationId}/edit`
      }
    })
  } else {
    res.redirect(`/providers/${req.params.providerId}/accreditations/${req.params.accreditationId}/edit/check`)
  }
}

exports.editProviderAccreditationCheck_get = async (req, res) => {
  const provider = await Provider.findByPk(req.params.providerId)
  const currentAccreditation = await ProviderAccreditation.findByPk(req.params.accreditationId)

  res.render('providers/accreditation/check-your-answers', {
    provider,
    currentAccreditation,
    accreditation: req.session.data.accreditation,
    actions: {
      back: `/providers/${req.params.providerId}/accreditations/${req.params.accreditationId}/edit`,
      cancel: `/providers/${req.params.providerId}`,
      change: `/providers/${req.params.providerId}/accreditations/${req.params.accreditationId}/edit`,
      save: `/providers/${req.params.providerId}/accreditations/${req.params.accreditationId}/edit/check`
    }
  })
}

exports.editProviderAccreditationCheck_post = async (req, res) => {
  let startsOn = isoDateFromDateInput(req.session.data.accreditation.startsOn)
  startsOn = new Date(startsOn)

  let endsOn = null
  if (isoDateFromDateInput(req.session.data.accreditation.endsOn) !== 'Invalid DateTime') {
    endsOn =  isoDateFromDateInput(req.session.data.accreditation.endsOn)
    endsOn = new Date(endsOn)
  }

  const accreditation = await ProviderAccreditation.findByPk(req.params.accreditationId)
  await accreditation.update({
    number: req.session.data.accreditation.number,
    startsOn,
    endsOn,
    updatedAt: new Date(),
    updatedById: req.session.passport.user.id
  })

  delete req.session.data.accreditation

  req.flash('success', 'Accreditation updated')
  res.redirect(`/providers/${req.params.providerId}`)
}

/// ------------------------------------------------------------------------ ///
/// Delete provider accreditation
/// ------------------------------------------------------------------------ ///

exports.deleteProviderAccreditation_get = async (req, res) => {
  const provider = await Provider.findByPk(req.params.providerId)
  const accreditation = await ProviderAccreditation.findByPk(req.params.accreditationId)
  res.render('providers/accreditation/delete', {
    provider,
    accreditation,
    actions: {
      back: `/providers/${req.params.providerId}`,
      cancel: `/providers/${req.params.providerId}`,
      save: `/providers/${req.params.providerId}/accreditations/${req.params.accreditationId}/delete`
    }
  })
}

exports.deleteProviderAccreditation_post = async (req, res) => {
  const accreditation = await ProviderAccreditation.findByPk(req.params.accreditationId)
  await accreditation.destroy()

  req.flash('success', 'Accreditation removed')
  res.redirect(`/providers/${req.params.providerId}`)
}
