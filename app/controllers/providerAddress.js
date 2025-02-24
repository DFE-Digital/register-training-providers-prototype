const { v4: uuid } = require('uuid')
const { parseOsPlacesData, parseForGovukRadios, parseAddressAsString } = require('../helpers/address')
const { nullIfEmpty } = require('../helpers/string')
const { isValidPostcode } = require('../helpers/validation')
const { Provider, ProviderAddress } = require('../models')
const { findByPostcode, findByUPRN } = require('../services/ordnanceSurveyPlaces')
const { geocodeAddress } = require('../services/googleMaps')

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

exports.newFindProviderAddress_get = async (req, res) => {
  const { providerId } = req.params
  const provider = await Provider.findByPk(providerId)

  res.render('providers/address/find', {
    provider,
    find: req.session.data.find,
    actions: {
      back: `/providers/${providerId}`,
      cancel: `/providers/${providerId}`,
      save: `/providers/${providerId}/addresses/new`
    }
  })
}

exports.newFindProviderAddress_post = async (req, res) => {
  const { providerId } = req.params
  const provider = await Provider.findByPk(providerId)
  const errors = []

  if (!req.session.data.find.postcode.length) {
    const error = {}
    error.fieldName = "address-postcode"
    error.href = "#address-postcode"
    error.text = "Enter a postcode"
    errors.push(error)
  }
  // else if (!isValidPostcode(req.session.data.find.postcode)) {
  //   const error = {}
  //   error.fieldName = "address-postcode"
  //   error.href = "#address-postcode"
  //   error.text = "Enter a real postcode"
  //   errors.push(error)
  // }

  // if (!req.session.data.find.building.length) {
  //   const error = {}
  //   error.fieldName = "address-building"
  //   error.href = "#address-building"
  //   error.text = "Enter building number or name"
  //   errors.push(error)
  // }

  if (errors.length) {
    res.render('providers/address/find', {
      provider,
      find: req.session.data.find,
      errors,
      actions: {
        back: `/providers/${providerId}`,
        cancel: `/providers/${providerId}`,
        save: `/providers/${providerId}/addresses/new`
      }
    })
  } else {
    res.redirect(`/providers/${providerId}/addresses/new/select`)
  }
}

exports.newSelectProviderAddress_get = async (req, res) => {
  const { providerId } = req.params
  const provider = await Provider.findByPk(providerId)

  let addresses = []
  if (req.session.data.find.postcode?.length) {
    addresses = await findByPostcode(
      postcode = req.session.data.find.postcode,
      building = req.session.data.find.building
    )

    addresses = await parseForGovukRadios(addresses)
  }

  let back = `/providers/${providerId}/addresses/new`
  if (req.query.referrer === 'check') {
    back = `/providers/${providerId}/addresses/new/check`
  }

  res.render('providers/address/select', {
    provider,
    addresses,
    find: req.session.data.find,
    address: req.session.data.address,
    actions: {
      back,
      cancel: `/providers/${providerId}`,
      change: `/providers/${providerId}/addresses/new`,
      enter: `/providers/${providerId}/addresses/new/enter`,
      save: `/providers/${providerId}/addresses/new/select`
    }
  })
}

exports.newSelectProviderAddress_post = async (req, res) => {
  const { providerId } = req.params
  const provider = await Provider.findByPk(providerId)
  const errors = []

  if (!req.session.data.find.uprn) {
    const error = {}
    error.fieldName = "address-uprn"
    error.href = "#address-uprn"
    error.text = "Select an address"
    errors.push(error)
  }

  if (errors.length) {
    let addresses = []
    if (req.session.data.find.postcode?.length) {
      addresses = await findByPostcode(
        postcode = req.session.data.find.postcode,
        building = req.session.data.find.building
      )

      addresses = await parseForGovukRadios(addresses)
    }

    let back = `/providers/${providerId}/addresses/new`
    if (req.query.referrer === 'check') {
      back = `/providers/${providerId}/addresses/new/check`
    }

    res.render('providers/address/select', {
      provider,
      addresses,
      find: req.session.data.find,
      address: req.session.data.address,
      errors,
      actions: {
        back,
        cancel: `/providers/${providerId}`,
        change: `/providers/${providerId}/addresses/new`,
        enter: `/providers/${providerId}/addresses/new/enter`,
        save: `/providers/${providerId}/addresses/new/select`
      }
    })
  } else {
    res.redirect(`/providers/${providerId}/addresses/new/check`)
  }
}

exports.newEnterProviderAddress_get = async (req, res) => {
  const { providerId } = req.params
  const provider = await Provider.findByPk(providerId)

  // delete any selected address URPN as user is entering manually
  delete req.session.data.find.uprn

  res.render('providers/address/edit', {
    provider,
    address: req.session.data.address,
    actions: {
      back: `/providers/${providerId}/addresses/new/select`,
      cancel: `/providers/${providerId}`,
      save: `/providers/${providerId}/addresses/new/enter`
    }
  })
}

exports.newEnterProviderAddress_post = async (req, res) => {
  const { providerId } = req.params
  const provider = await Provider.findByPk(providerId)
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
    res.render('providers/address/edit', {
      provider,
      address: req.session.data.address,
      errors,
      actions: {
        back: `/providers/${providerId}/addresses/new/select`,
        cancel: `/providers/${providerId}`,
        save: `/providers/${providerId}/addresses/new/enter`
      }
    })
  } else {
    res.redirect(`/providers/${providerId}/addresses/new/check`)
  }
}

exports.newProviderAddressCheck_get = async (req, res) => {
  const { providerId } = req.params
  const provider = await Provider.findByPk(providerId)

  if (req.session.data.find.uprn) {
    const address = await findByUPRN(
      uprn = req.session.data.find.uprn
    )

    req.session.data.address = await parseOsPlacesData(address)[0]
  }

  // Geocode the address data
  const addressString = parseAddressAsString(req.session.data.address)
  const geocodes = await geocodeAddress(addressString)

  req.session.data.address = {...req.session.data.address, ...geocodes}

  let back = `/providers/${providerId}/addresses/new/select`
  if (!req.session.data.find.uprn) {
    back = `/providers/${providerId}/addresses/new/enter`
  }

  res.render('providers/address/check-your-answers', {
    provider,
    address: req.session.data.address,
    actions: {
      back,
      cancel: `/providers/${providerId}`,
      change: back,
      save: `/providers/${providerId}/addresses/new/check`
    }
  })
}

exports.newProviderAddressCheck_post = async (req, res) => {
  const { address } = req.session.data
  const userId = req.session.passport.user.id

  await ProviderAddress.create({
    id: uuid(),
    providerId: req.params.providerId,
    uprn: nullIfEmpty(address.uprn),
    line1: address.line1,
    line2: nullIfEmpty(address.line2),
    line3: nullIfEmpty(address.line3),
    town: address.town,
    county: nullIfEmpty(address.county),
    postcode: address.postcode,
    latitude: nullIfEmpty(address.latitude),
    longitude: nullIfEmpty(address.longitude),
    googlePlaceId: nullIfEmpty(address.googlePlaceId),
    createdById: userId,
    updatedById: userId
  })

  delete req.session.data.find
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
  const { addressId, providerId } = req.params
  const { address } = req.session.data
  const provider = await Provider.findByPk(providerId)
  const currentAddress = await ProviderAddress.findByPk(addressId)
  const errors = []

  if (!address.line1.length) {
    const error = {}
    error.fieldName = "address-line-1"
    error.href = "#address-line-1"
    error.text = "Enter address line 1"
    errors.push(error)
  }

  if (!address.town.length) {
    const error = {}
    error.fieldName = "address-town"
    error.href = "#address-town"
    error.text = "Enter a town or city"
    errors.push(error)
  }

  if (!address.postcode.length) {
    const error = {}
    error.fieldName = "address-postcode"
    error.href = "#address-postcode"
    error.text = "Enter a postcode"
    errors.push(error)
  } else if (!isValidPostcode(address.postcode)) {
    const error = {}
    error.fieldName = "address-postcode"
    error.href = "#address-postcode"
    error.text = "Enter a real postcode"
    errors.push(error)
  }

  if (errors.length) {
    let back = `/providers/${providerId}`
    if (req.query.referrer === 'check') {
      back = `/providers/${providerId}/addresses/${addressId}/edit/check`
    }

    res.render('providers/address/edit', {
      provider,
      currentAddress,
      address,
      errors,
      actions: {
        back,
        cancel: `/providers/${providerId}`,
        save: `/providers/${providerId}/addresses/${addressId}/edit`
      }
    })
  } else {
    res.redirect(`/providers/${providerId}/addresses/${addressId}/edit/check`)
  }
}

exports.editProviderAddressCheck_get = async (req, res) => {
  const { addressId, providerId } = req.params
  let { address } = req.session.data

  const provider = await Provider.findByPk(providerId)
  const currentAddress = await ProviderAddress.findByPk(addressId)

  // Geocode the address data
  const addressString = parseAddressAsString(address)
  const geocodes = await geocodeAddress(addressString)

  address = {...address, ...geocodes}

  // put address into the session data for use later
  req.session.data.address = address

  res.render('providers/address/check-your-answers', {
    provider,
    currentAddress,
    address: req.session.data.address,
    actions: {
      back: `/providers/${providerId}/addresses/${addressId}/edit`,
      cancel: `/providers/${providerId}`,
      change: `/providers/${providerId}/addresses/${addressId}/edit`,
      save: `/providers/${providerId}/addresses/${addressId}/edit/check`
    }
  })
}

exports.editProviderAddressCheck_post = async (req, res) => {
  const { addressId, providerId } = req.params
  const { address } = req.session.data
  const userId = req.session.passport.user.id

  const currentAddress = await ProviderAddress.findByPk(addressId)

  await currentAddress.update({
    uprn: nullIfEmpty(address.uprn),
    line1: address.line1,
    line2: nullIfEmpty(address.line2),
    line3: nullIfEmpty(address.line3),
    town: address.town,
    county: nullIfEmpty(address.county),
    postcode: address.postcode,
    latitude: nullIfEmpty(address.latitude),
    longitude: nullIfEmpty(address.longitude),
    googlePlaceId: nullIfEmpty(address.googlePlaceId),
    updatedById: userId
  })

  delete req.session.data.address

  req.flash('success', 'Address updated')
  res.redirect(`/providers/${providerId}`)
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
