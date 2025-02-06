const { isValidPostcode } = require('../helpers/validation')
const { v4: uuid } = require('uuid')
const { Provider, ProviderAddress } = require('../models')

/// ------------------------------------------------------------------------ ///
/// List provider addresses
/// ------------------------------------------------------------------------ ///

exports.providerAddressesList = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1
  const limit = parseInt(req.query.limit, 10) || 50
  const offset = (page - 1) * limit

  // Get the total number of addresses for pagination metadata
  const totalCount = await ProviderAddress.count({
    where: { providerId: req.params.providerId }
  })

  // Only fetch ONE page of addresses
  const addresses = await address.findAll({
    where: { providerId: req.params.providerId },
    order: [['id', 'ASC']],
    limit,
    offset
  })

  // Create your Pagination object
  // using the chunk + the overall total count
  const pagination = new Pagination(addresses, totalCount, page, limit)

  // Clear session address data
  delete req.session.data.address

  res.render('providers/addresses/index', {
    // Addresses for *this* page
    addresses: pagination.getData(),
    // The pagination metadata (pageItems, nextPage, etc.)
    pagination
  })
}

/// ------------------------------------------------------------------------ ///
/// Show single provider address
/// ------------------------------------------------------------------------ ///

exports.providerAddressDetails = async (req, res) => {
  // Clear session address data
  delete req.session.data.address

  const address = await ProviderAddress.findByPk(req.params.addressId, {
    include: [
      {
        model: Provider,
        as: 'provider'
      }
    ]
  })
  res.render('providers/addresses/show', { address })
}

/// ------------------------------------------------------------------------ ///
/// New provider address
/// ------------------------------------------------------------------------ ///

exports.newProviderAddress_get = async (req, res) => {
  const provider = await Provider.findByPk(req.params.providerId)

  let back = `/providers/${req.params.providerId}`
  if (req.query.referrer === 'check') {
    back = `/providers/${req.params.providerId}/addresses/new/check`
  }

  res.render('providers/address/edit', {
    provider,
    address: req.session.data.address,
    actions: {
      back,
      cancel: `/providers/${req.params.providerId}`,
      save: `/providers/${req.params.providerId}/addresses/new`
    }
  })
}

exports.newProviderAddress_post = async (req, res) => {
  const provider = await Provider.findByPk(req.params.providerId)
  const errors = []

  if (!req.session.data.address.line1.length) {
    const error = {}
    error.fieldName = "address-line-1"
    error.href = "#address-line-1"
    error.text = "Enter address line 1"
    errors.push(error)
  }

  if (!req.session.data.address.town.length) {
    const error = {}
    error.fieldName = "address-town"
    error.href = "#address-town"
    error.text = "Enter a town or city"
    errors.push(error)
  }

  if (!req.session.data.address.postcode.length) {
    const error = {}
    error.fieldName = "address-postcode"
    error.href = "#address-postcode"
    error.text = "Enter a postcode"
    errors.push(error)
  } else if (!isValidPostcode(req.session.data.address.postcode)) {
    const error = {}
    error.fieldName = "address-postcode"
    error.href = "#address-postcode"
    error.text = "Enter a real postcode"
    errors.push(error)
  }

  if (errors.length) {
    let back = `/providers/${req.params.providerId}`
    if (req.query.referrer === 'check') {
      back = `/providers/${req.params.providerId}/addresses/new/check`
    }

    res.render('providers/address/edit', {
      provider,
      address: req.session.data.address,
      errors,
      actions: {
        back,
        cancel: `/providers/${req.params.providerId}`,
        save: `/providers/${req.params.providerId}/addresses/new`
      }
    })
  } else {
    res.redirect(`/providers/${req.params.providerId}/addresses/new/check`)
  }
}

exports.newProviderAddressCheck_get = async (req, res) => {
  const provider = await Provider.findByPk(req.params.providerId)
  res.render('providers/address/check-your-answers', {
    provider,
    address: req.session.data.address,
    actions: {
      back: `/providers/${req.params.providerId}/addresses/new`,
      cancel: `/providers/${req.params.providerId}`,
      change: `/providers/${req.params.providerId}/addresses/new`,
      save: `/providers/${req.params.providerId}/addresses/new/check`
    }
  })
}

exports.newProviderAddressCheck_post = async (req, res) => {
  await ProviderAddress.create({
    id: uuid(),
    providerId: req.params.providerId,
    line1: req.session.data.address.line1,
    line2: req.session.data.address.line2.length ? req.session.data.address.line2 : null,
    line3: req.session.data.address.line3.length ? req.session.data.address.line3 : null,
    town: req.session.data.address.town,
    county: req.session.data.address.county.length ? req.session.data.address.county : null,
    postcode: req.session.data.address.postcode,
    createdAt: new Date(),
    createdById: req.session.passport.user.id
  })

  delete req.session.data.address

  req.flash('success', 'Address added')
  res.redirect(`/providers/${req.params.providerId}`)
}

/// ------------------------------------------------------------------------ ///
/// Edit provider address
/// ------------------------------------------------------------------------ ///

exports.editProviderAddress_get = async (req, res) => {
  const provider = await Provider.findByPk(req.params.providerId)
  const currentAddress = await ProviderAddress.findByPk(req.params.addressId)

  let address
  if (req.session.data?.address) {
    address = req.session.data.address
  } else {
    address = await ProviderAddress.findByPk(req.params.addressId)
  }

  let back = `/providers/${req.params.providerId}`
  if (req.query.referrer === 'check') {
    back = `/providers/${req.params.providerId}/addresses/${req.params.addressId}/edit/check`
  }

  res.render('providers/address/edit', {
    provider,
    currentAddress,
    address,
    actions: {
      back,
      cancel: `/providers/${req.params.providerId}`,
      save: `/providers/${req.params.providerId}/addresses/${req.params.addressId}/edit`
    }
  })
}

exports.editProviderAddress_post = async (req, res) => {
  const provider = await Provider.findByPk(req.params.providerId)
  const currentAddress = await ProviderAddress.findByPk(req.params.addressId)
  const errors = []

  if (!req.session.data.address.line1.length) {
    const error = {}
    error.fieldName = "address-line-1"
    error.href = "#address-line-1"
    error.text = "Enter address line 1"
    errors.push(error)
  }

  if (!req.session.data.address.town.length) {
    const error = {}
    error.fieldName = "address-town"
    error.href = "#address-town"
    error.text = "Enter a town or city"
    errors.push(error)
  }

  if (!req.session.data.address.postcode.length) {
    const error = {}
    error.fieldName = "address-postcode"
    error.href = "#address-postcode"
    error.text = "Enter a postcode"
    errors.push(error)
  } else if (!isValidPostcode(req.session.data.address.postcode)) {
    const error = {}
    error.fieldName = "address-postcode"
    error.href = "#address-postcode"
    error.text = "Enter a real postcode"
    errors.push(error)
  }

  if (errors.length) {
    let back = `/providers/${req.params.providerId}`
    if (req.query.referrer === 'check') {
      back = `/providers/${req.params.providerId}/addresses/${req.params.addressId}/edit/check`
    }

    res.render('providers/address/edit', {
      provider,
      currentAddress,
      address: req.session.data.address,
      errors,
      actions: {
        back,
        cancel: `/providers/${req.params.providerId}`,
        save: `/providers/${req.params.providerId}/addresses/${req.params.addressId}/edit`
      }
    })
  } else {
    res.redirect(`/providers/${req.params.providerId}/addresses/${req.params.addressId}/edit/check`)
  }
}

exports.editProviderAddressCheck_get = async (req, res) => {
  const provider = await Provider.findByPk(req.params.providerId)
  const currentAddress = await ProviderAddress.findByPk(req.params.addressId)

  res.render('providers/address/check-your-answers', {
    provider,
    currentAddress,
    address: req.session.data.address,
    actions: {
      back: `/providers/${req.params.providerId}/addresses/${req.params.addressId}/edit`,
      cancel: `/providers/${req.params.providerId}`,
      change: `/providers/${req.params.providerId}/addresses/${req.params.addressId}/edit`,
      save: `/providers/${req.params.providerId}/addresses/${req.params.addressId}/edit/check`
    }
  })
}

exports.editProviderAddressCheck_post = async (req, res) => {
  const address = await ProviderAddress.findByPk(req.params.addressId)
  await address.update({
    line1: req.session.data.address.line1,
    line2: req.session.data.address.line2.length ? req.session.data.address.line2 : null,
    line3: req.session.data.address.line3.length ? req.session.data.address.line3 : null,
    town: req.session.data.address.town,
    county: req.session.data.address.county.length ? req.session.data.address.county : null,
    postcode: req.session.data.address.postcode,
    updatedAt: new Date(),
    updatedById: req.session.passport.user.id
  })

  delete req.session.data.address

  req.flash('success', 'Address updated')
  res.redirect(`/providers/${req.params.providerId}`)
}

/// ------------------------------------------------------------------------ ///
/// Delete provider address
/// ------------------------------------------------------------------------ ///

exports.deleteProviderAddress_get = async (req, res) => {
  const provider = await Provider.findByPk(req.params.providerId)
  const address = await ProviderAddress.findByPk(req.params.addressId)
  res.render('providers/address/delete', {
    provider,
    address,
    actions: {
      back: `/providers/${req.params.providerId}`,
      cancel: `/providers/${req.params.providerId}`,
      save: `/providers/${req.params.providerId}/addresses/${req.params.addressId}/delete`
    }
  })
}

exports.deleteProviderAddress_post = async (req, res) => {
  const address = await ProviderAddress.findByPk(req.params.addressId)
  await address.destroy()

  req.flash('success', 'Address removed')
  res.redirect(`/providers/${req.params.providerId}`)
}
