const Pagination = require('../helpers/pagination')
const { v4: uuid } = require('uuid')
const { Provider, ProviderAddress, ProviderContact, ProviderAccreditation } = require('../models')

exports.providersList = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1
  const limit = parseInt(req.query.limit, 10) || 50
  const offset = (page - 1) * limit

  // Get the total number of providers for pagination metadata
  const totalCount = await Provider.count()

  // Only fetch ONE page of providers
  const providers = await Provider.findAll({
    order: [['operatingName', 'ASC']],
    limit,
    offset
  })

  // Create your Pagination object
  // using the chunk + the overall total count
  const pagination = new Pagination(providers, totalCount, page, limit)

  // Clear session provider data
  delete req.session.data.provider

  res.render('providers/index', {
    // Providers for *this* page
    providers: pagination.getData(),
    // The pagination metadata (pageItems, nextPage, etc.)
    pagination
  })
}

exports.providerDetails = async (req, res) => {
  const provider = await Provider.findByPk(req.params.providerId, {
    include: [
      {
        model: ProviderAddress,
        as: 'addresses' // Must match the alias defined in the association
      },
      {
        model: ProviderContact,
        as: 'contacts' // Must match the alias defined in the association
      },
      {
        model: ProviderAccreditation,
        as: 'accreditations' // Must match the alias defined in the association
      }
    ]
  })
  res.render('providers/show', { provider })
}

/// ------------------------------------------------------------------------ ///
/// New provider
/// ------------------------------------------------------------------------ ///

exports.newProviderIsAccredited_get = async (req, res) => {
  res.render('providers/new/is-accredited', {
    provider: req.session.data.provider,
    actions: {
      back: '/providers',
      cancel: '/providers',
      save: '/providers/new'
    }
  })
}

exports.newProviderIsAccredited_post = async (req, res) => {
  const errors = []

  if (errors.length) {
    res.render('providers/new/is-accredited', {
      provider: req.session.data.provider,
      errors,
      actions: {
        back: '/providers',
        cancel: '/providers',
        save: '/providers/new'
      }
    })
  } else {
    res.redirect('/providers/new/type')
  }
}

exports.newProviderType_get = async (req, res) => {
  res.render('providers/new/type', {
    provider: req.session.data.provider,
    actions: {
      back: '/providers/new',
      cancel: '/providers',
      save: '/providers/new/type'
    }
  })
}

exports.newProviderType_post = async (req, res) => {
  const errors = []

  if (errors.length) {
    res.render('providers/new/type', {
      provider: req.session.data.provider,
      errors,
      actions: {
        back: '/providers/new',
        cancel: '/providers',
        save: '/providers/new/type'
      }
    })
  } else {
    res.redirect('/providers/new/details')
  }
}

exports.newProviderDetails_get = async (req, res) => {
  res.render('providers/edit', {
    provider: req.session.data.provider,
    actions: {
      back: '/providers/new/type',
      cancel: '/providers',
      save: '/providers/new/details'
    }
  })
}

exports.newProviderDetails_post = async (req, res) => {
  const errors = []

  if (!req.session.data.provider.operatingName.length) {
    const error = {}
    error.fieldName = 'operatingName'
    error.href = '#operatingName'
    error.text = 'Enter an operating name'
    errors.push(error)
  }

  if (req.session.data.provider?.type !== 'school') {
    if (!req.session.data.provider.legalName.length) {
      const error = {}
      error.fieldName = 'legalName'
      error.href = '#legalName'
      error.text = 'Enter a legal name'
      errors.push(error)
    }
  }

  if (!req.session.data.provider.type) {
    const error = {}
    error.fieldName = 'type'
    error.href = '#type'
    error.text = 'Select a provider type'
    errors.push(error)
  }

  if (errors.length) {
    res.render('providers/edit', {
      provider: req.session.data.provider,
      errors,
      actions: {
        back: '/providers/new/type',
        cancel: '/providers',
        save: '/providers/new/details'
      }
    })
  } else {
    if (req.session.data.provider.isAccredited == "yes") {
      res.redirect('/providers/new/accreditation')
    } else {
      res.redirect('/providers/new/address')
    }
  }
}

exports.newProviderAccreditation_get = async (req, res) => {
  res.render('providers/accreditation', {
    provider: req.session.data.provider,
    actions: {
      back: '/providers/new/details',
      cancel: '/providers',
      save: '/providers/new/accreditation'
    }
  })
}

exports.newProviderAccreditation_post = async (req, res) => {
  const errors = []

  if (errors.length) {
    res.render('providers/accreditation', {
      provider: req.session.data.provider,
      errors,
      actions: {
        back: '/providers/new/details',
        cancel: '/providers',
        save: '/providers/new/accreditation'
      }
    })
  } else {
    res.redirect('/providers/new/address')
  }
}

exports.newProviderAddress_get = async (req, res) => {
  let back
  if (req.session.data.provider.isAccredited == "yes") {
    back = '/providers/new/accreditation'
  } else {
    back = '/providers/new/details'
  }

  res.render('providers/address', {
    provider: req.session.data.provider,
    actions: {
      back,
      cancel: '/providers',
      save: '/providers/new/address'
    }
  })
}

exports.newProviderAddress_post = async (req, res) => {
  const errors = []

  if (!req.session.data.provider.address.line1.length) {
    const error = {}
    error.fieldName = "address-line-1"
    error.href = "#address-line-1"
    error.text = "Enter address line 1"
    errors.push(error)
  }

  if (!req.session.data.provider.address.town.length) {
    const error = {}
    error.fieldName = "address-town"
    error.href = "#address-town"
    error.text = "Enter a town or city"
    errors.push(error)
  }

  if (!req.session.data.provider.address.postcode.length) {
    const error = {}
    error.fieldName = "address-postcode"
    error.href = "#address-postcode"
    error.text = "Enter a postcode"
    errors.push(error)
  // } else if (
  //   !validationHelper.isValidPostcode(
  //     req.session.data.provider.address.postcode
  //   )
  // ) {
  //   const error = {}
  //   error.fieldName = "address-postcode"
  //   error.href = "#address-postcode"
  //   error.text = "Enter a real postcode"
  //   errors.push(error)
  }

  if (errors.length) {
    let back
    if (req.session.data.provider.isAccredited == "yes") {
      back = '/providers/new/accreditation'
    } else {
      back = '/providers/new/details'
    }

    res.render('providers/address', {
      provider: req.session.data.provider,
      errors,
      actions: {
        back,
        cancel: '/providers',
        save: '/providers/new/address'
      }
    })
  } else {
    res.redirect('/providers/new/check')
  }
}

exports.newProviderCheck_get = async (req, res) => {
  res.render('providers/check-your-answers', {
    provider: req.session.data.provider,
    actions: {
      back: `/providers/new`,
      cancel: `/providers`,
      save: `/providers/new/check`
    }
  })
}

exports.newProviderCheck_post = async (req, res) => {
  const provider = await Provider.create({
    id: uuid(),
    operatingName: req.session.data.provider.operatingName,
    legalName: req.session.data.provider.legalName,
    type: req.session.data.provider.type,
    code: req.session.data.provider.code,
    ukprn: req.session.data.provider.ukprn,
    createdAt: new Date(),
    createdById: req.session.passport.user.id
  })

  delete req.session.data.provider

  req.flash('success', 'Provider added')
  res.redirect('/providers')
}

/// ------------------------------------------------------------------------ ///
/// Edit provider
/// ------------------------------------------------------------------------ ///

exports.editProvider_get = async (req, res) => {
  const currentProvider = await Provider.findByPk(req.params.providerId)

  let provider
  if (req.session.data.provider) {
    provider = req.session.data.provider
  } else {
    provider = currentProvider
  }

  res.render('providers/edit', {
    currentProvider,
    provider,
    actions: {
      back: `/providers/${req.params.providerId}`,
      cancel: `/providers/${req.params.providerId}`,
      save: `/providers/${req.params.providerId}/edit`
    }
  })
}

exports.editProvider_post = async (req, res) => {
  const errors = []

  if (!req.session.data.provider.operatingName.length) {
    const error = {}
    error.fieldName = 'operatingName'
    error.href = '#operatingName'
    error.text = 'Enter an operating name'
    errors.push(error)
  }

  if (!req.session.data.provider.legalName.length) {
    const error = {}
    error.fieldName = 'legalName'
    error.href = '#legalName'
    error.text = 'Enter a legal name'
    errors.push(error)
  }

  // if (!req.session.data.provider.ukprn.length) {
  //   const error = {}
  //   error.fieldName = 'ukprn'
  //   error.href = '#ukprn'
  //   error.text = 'Enter a UK provider reference number (UKPRN)'
  //   errors.push(error)
  // }

  if (errors.length) {
    res.render('providers/edit', {
      provider: req.session.data.provider,
      errors,
      actions: {
        back: `/providers/${req.params.providerId}`,
        cancel: `/providers/${req.params.providerId}`,
        save: `/providers/${req.params.providerId}/edit`
      }
    })
  } else {
    res.redirect(`/providers/${req.params.providerId}/edit/check`)
  }
}

exports.editProviderCheck_get = async (req, res) => {
  const currentProvider = await Provider.findByPk(req.params.providerId)

  res.render('providers/check-your-answers', {
    currentProvider,
    provider: req.session.data.provider,
    actions: {
      back: `/providers/${req.params.providerId}/edit`,
      cancel: `/providers/${req.params.providerId}`,
      save: `/providers/${req.params.providerId}/edit/check`
    }
  })
}

exports.editProviderCheck_post = async (req, res) => {
  const provider = await Provider.findByPk(req.params.providerId)
  provider.update({
    operatingName: req.session.data.provider.operatingName,
    legalName: req.session.data.provider.legalName,
    type: req.session.data.provider.type,
    // code: 'O1A',
    // ukprn: 1234567,
    updatedAt: new Date(),
    updatedById: req.session.passport.user.id
  })

  delete req.session.data.provider

  req.flash('success', 'Provider updated')
  res.redirect(`/providers/${req.params.providerId}`)
}

/// ------------------------------------------------------------------------ ///
/// Delete provider
/// ------------------------------------------------------------------------ ///

exports.deleteProvider_get = async (req, res) => {
  const provider = await Provider.findByPk(req.params.providerId)
  res.render('providers/delete', { provider })
}

exports.deleteProvider_post = async (req, res) => {
  const provider = await Provider.findByPk(req.params.providerId)
  provider.destroy()

  req.flash('success', 'Provider removed')
  res.redirect('/providers')
}
