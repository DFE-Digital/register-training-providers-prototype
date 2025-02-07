const { isoDateFromDateInput, getDateParts } = require('../helpers/dates')
const { v4: uuid } = require('uuid')
const { Provider, ProviderAccreditation } = require('../models')

/// ------------------------------------------------------------------------ ///
/// List provider accreditations
/// ------------------------------------------------------------------------ ///

exports.providerAccreditationsList = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1
  const limit = parseInt(req.query.limit, 10) || 50
  const offset = (page - 1) * limit

  // Get the total number of accreditations for pagination metadata
  const totalCount = await ProviderAccreditation.count({
    where: { providerId: req.params.providerId }
  })

  // Only fetch ONE page of accreditations
  const accreditations = await ProviderAccreditation.findAll({
    where: { providerId: req.params.providerId },
    order: [['id', 'ASC']],
    limit,
    offset
  })

  // Create your Pagination object
  // using the chunk + the overall total count
  const pagination = new Pagination(accreditations, totalCount, page, limit)

  // Clear session provider data
  delete req.session.data.accreditation

  res.render('providers/accreditations/index', {
    // Accreditations for *this* page
    accreditations: pagination.getData(),
    // The pagination metadata (pageItems, nextPage, etc.)
    pagination
  })
}

/// ------------------------------------------------------------------------ ///
/// Show single provider accreditataion
/// ------------------------------------------------------------------------ ///

exports.providerAccreditationDetails = async (req, res) => {
  // Clear session provider data
  delete req.session.data.accreditation

  const accreditation = await ProviderAccreditation.findByPk(req.params.accreditationId, {
    include: [
      {
        model: Provider,
        as: 'provider'
      }
    ]
  })
  res.render('providers/accreditations/show', { accreditation })
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
  const accreditataion = await ProviderAccreditation.findByPk(req.params.accreditationId)
  res.render('providers/accreditation/delete', {
    provider,
    accreditataion,
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
