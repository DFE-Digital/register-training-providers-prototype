const { Provider, ProviderAddress } = require('../models')
const Pagination = require('../helpers/pagination')
const { isAccreditedProvider } = require('../helpers/accreditation')
const { parseOsPlacesData, parseForGovukRadios, parseAddressAsString } = require('../helpers/address')
const { nullIfEmpty } = require('../helpers/string')
const { isValidPostcode } = require('../helpers/validation')
const { geocodeAddress } = require('../services/googleMaps')
const { findByPostcode, findByUPRN } = require('../services/ordnanceSurveyPlaces')

/// ------------------------------------------------------------------------ ///
/// List provider addresses
/// ------------------------------------------------------------------------ ///

exports.providerAddressesList = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1
  const limit = parseInt(req.query.limit, 10) || 50
  const offset = (page - 1) * limit

  // get the providerId from the request for use in subsequent queries
  const { providerId } = req.params

  // get the current provider
  const provider = await Provider.findByPk(providerId)

  // calculate if the provider is accredited
  const isAccredited = await isAccreditedProvider({ providerId })

  // Get the total number of addresses for pagination metadata
  const totalCount = await ProviderAddress.count({
    where: {
      providerId,
      'deletedAt': null
    }
  })

  // Only fetch ONE page of addresses
  const addresses = await ProviderAddress.findAll({
    where: {
      providerId,
      'deletedAt': null
    },
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
    provider,
    isAccredited,
    // Addresses for *this* page
    addresses: pagination.getData(),
    // The pagination metadata (pageItems, nextPage, etc.)
    pagination,
    actions: {
      new: `/providers/${providerId}/addresses/new`,
      change: `/providers/${providerId}/addresses`,
      delete: `/providers/${providerId}/addresses`
    }
  })
}

/// ------------------------------------------------------------------------ ///
/// Show single provider address
/// ------------------------------------------------------------------------ ///

exports.providerAddressDetails = async (req, res) => {
  const { addressId } = req.params

  // Clear session address data
  delete req.session.data.address

  const address = await ProviderAddress.findByPk(addressId, {
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

  res.render('providers/addresses/find', {
    provider,
    find: req.session.data.find,
    actions: {
      back: `/providers/${providerId}/addresses`,
      cancel: `/providers/${providerId}/addresses`,
      save: `/providers/${providerId}/addresses/new`
    }
  })
}

exports.newFindProviderAddress_post = async (req, res) => {
  const { providerId } = req.params
  const { find } = req.session.data
  const provider = await Provider.findByPk(providerId)
  const errors = []

  if (!find.postcode.length) {
    const error = {}
    error.fieldName = "address-postcode"
    error.href = "#address-postcode"
    error.text = "Enter postcode"
    errors.push(error)
  } else if (!isValidPostcode(find.postcode)) {
    const error = {}
    error.fieldName = "address-postcode"
    error.href = "#address-postcode"
    error.text = "Enter a full UK postcode"
    errors.push(error)
  }

  if (errors.length) {
    res.render('providers/addresses/find', {
      provider,
      find,
      errors,
      actions: {
        back: `/providers/${providerId}/addresses`,
        cancel: `/providers/${providerId}/addresses`,
        save: `/providers/${providerId}/addresses/new`
      }
    })
  } else {
    res.redirect(`/providers/${providerId}/addresses/new/select`)
  }
}

exports.newSelectProviderAddress_get = async (req, res) => {
  const { providerId } = req.params
  const { address, find } = req.session.data
  const provider = await Provider.findByPk(providerId)

  let addresses = []
  if (find.postcode?.length) {
    addresses = await findByPostcode(
      postcode = find.postcode,
      building = find.building
    )

    addresses = await parseForGovukRadios(addresses)
  }

  let back = `/providers/${providerId}/addresses/new`
  if (req.query.referrer === 'check') {
    back = `/providers/${providerId}/addresses/new/check`
  }

  res.render('providers/addresses/select', {
    provider,
    addresses,
    find,
    address,
    actions: {
      back,
      cancel: `/providers/${providerId}/addresses`,
      change: `/providers/${providerId}/addresses/new`,
      enter: `/providers/${providerId}/addresses/new/enter`,
      save: `/providers/${providerId}/addresses/new/select`
    }
  })
}

exports.newSelectProviderAddress_post = async (req, res) => {
  const { providerId } = req.params
  const { address, find } = req.session.data
  const provider = await Provider.findByPk(providerId)
  const errors = []

  if (!find.uprn) {
    const error = {}
    error.fieldName = "address-uprn"
    error.href = "#address-uprn"
    error.text = "Select an address"
    errors.push(error)
  }

  if (errors.length) {
    let addresses = []
    if (find.postcode?.length) {
      addresses = await findByPostcode(
        postcode = find.postcode,
        building = find.building
      )

      addresses = await parseForGovukRadios(addresses)
    }

    let back = `/providers/${providerId}/addresses/new`
    if (req.query.referrer === 'check') {
      back = `/providers/${providerId}/addresses/new/check`
    }

    res.render('providers/addresses/select', {
      provider,
      addresses,
      find,
      address,
      errors,
      actions: {
        back,
        cancel: `/providers/${providerId}/addresses`,
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
  const { address } = req.session.data
  const provider = await Provider.findByPk(providerId)

  // delete any selected address URPN as user is entering manually
  delete req.session.data.find.uprn

  res.render('providers/addresses/edit', {
    provider,
    address,
    actions: {
      back: `/providers/${providerId}/addresses/new/select`,
      cancel: `/providers/${providerId}/addresses`,
      save: `/providers/${providerId}/addresses/new/enter`
    }
  })
}

exports.newEnterProviderAddress_post = async (req, res) => {
  const { providerId } = req.params
  const { address } = req.session.data
  const provider = await Provider.findByPk(providerId)
  const errors = []

  if (!address.line1.length) {
    const error = {}
    error.fieldName = "address-line-1"
    error.href = "#address-line-1"
    error.text = "Enter address line 1, typically the building and street"
    errors.push(error)
  }

  if (!address.town.length) {
    const error = {}
    error.fieldName = "address-town"
    error.href = "#address-town"
    error.text = "Enter town or city"
    errors.push(error)
  }

  if (!address.postcode.length) {
    const error = {}
    error.fieldName = "address-postcode"
    error.href = "#address-postcode"
    error.text = "Enter postcode"
    errors.push(error)
  } else if (!isValidPostcode(address.postcode)) {
    const error = {}
    error.fieldName = "address-postcode"
    error.href = "#address-postcode"
    error.text = "Enter a full UK postcode"
    errors.push(error)
  }

  if (errors.length) {
    res.render('providers/addresses/edit', {
      provider,
      address,
      errors,
      actions: {
        back: `/providers/${providerId}/addresses/new/select`,
        cancel: `/providers/${providerId}/addresses`,
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
  const { find } = req.session.data
  let { address } = req.session.data

  if (find.uprn) {
    address = await findByUPRN(
      uprn = find.uprn
    )

    address = parseOsPlacesData(address)
  }
  // Geocode the address data
  const addressString = parseAddressAsString(address)
  const geocodes = await geocodeAddress(addressString)

  address = {...address, ...geocodes}

  // put address into the session data for use later
  req.session.data.address = address

  let back = `/providers/${providerId}/addresses/new/select`
  if (!req.session.data.find.uprn) {
    back = `/providers/${providerId}/addresses/new/enter`
  }

  res.render('providers/addresses/check-your-answers', {
    provider,
    address: req.session.data.address,
    actions: {
      back,
      cancel: `/providers/${providerId}/addresses`,
      change: back,
      save: `/providers/${providerId}/addresses/new/check`
    }
  })
}

exports.newProviderAddressCheck_post = async (req, res) => {
  const { providerId } = req.params
  const { address } = req.session.data
  const { user } = req.session.passport

  await ProviderAddress.create({
    providerId,
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
    createdById: user.id,
    updatedById: user.id
  })

  delete req.session.data.find
  delete req.session.data.address

  req.flash('success', 'Address added')
  res.redirect(`/providers/${providerId}/addresses`)
}

/// ------------------------------------------------------------------------ ///
/// Edit provider address
/// ------------------------------------------------------------------------ ///

exports.editProviderAddress_get = async (req, res) => {
  const { addressId, providerId } = req.params
  const provider = await Provider.findByPk(providerId)
  const currentAddress = await ProviderAddress.findByPk(addressId)

  let address
  if (req.session.data?.address) {
    address = req.session.data.address
  } else {
    address = await ProviderAddress.findByPk(addressId)
  }

  let back = `/providers/${providerId}`
  if (req.query.referrer === 'check') {
    back = `/providers/${providerId}/addresses/${addressId}/edit/check`
  }

  res.render('providers/addresses/edit', {
    provider,
    currentAddress,
    address,
    actions: {
      back,
      cancel: `/providers/${providerId}/addresses`,
      save: `/providers/${providerId}/addresses/${addressId}/edit`
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
    error.text = "Enter address line 1, typically the building and street"
    errors.push(error)
  }

  if (!address.town.length) {
    const error = {}
    error.fieldName = "address-town"
    error.href = "#address-town"
    error.text = "Enter town or city"
    errors.push(error)
  }

  if (!address.postcode.length) {
    const error = {}
    error.fieldName = "address-postcode"
    error.href = "#address-postcode"
    error.text = "Enter postcode"
    errors.push(error)
  } else if (!isValidPostcode(address.postcode)) {
    const error = {}
    error.fieldName = "address-postcode"
    error.href = "#address-postcode"
    error.text = "Enter a full UK postcode"
    errors.push(error)
  }

  if (errors.length) {
    let back = `/providers/${providerId}`
    if (req.query.referrer === 'check') {
      back = `/providers/${providerId}/addresses/${addressId}/edit/check`
    }

    res.render('providers/addresses/edit', {
      provider,
      currentAddress,
      address,
      errors,
      actions: {
        back,
        cancel: `/providers/${providerId}/addresses`,
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

  res.render('providers/addresses/check-your-answers', {
    provider,
    currentAddress,
    address: req.session.data.address,
    actions: {
      back: `/providers/${providerId}/addresses/${addressId}/edit`,
      cancel: `/providers/${providerId}/addresses`,
      change: `/providers/${providerId}/addresses/${addressId}/edit`,
      save: `/providers/${providerId}/addresses/${addressId}/edit/check`
    }
  })
}

exports.editProviderAddressCheck_post = async (req, res) => {
  const { addressId, providerId } = req.params
  const { address } = req.session.data
  const { user } = req.session.passport

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
    updatedById: user.id
  })

  delete req.session.data.address

  req.flash('success', 'Address updated')
  res.redirect(`/providers/${providerId}/addresses`)
}

/// ------------------------------------------------------------------------ ///
/// Delete provider address
/// ------------------------------------------------------------------------ ///

exports.deleteProviderAddress_get = async (req, res) => {
  const { addressId, providerId } = req.params
  const provider = await Provider.findByPk(providerId)
  const address = await ProviderAddress.findByPk(addressId)

  res.render('providers/addresses/delete', {
    provider,
    address,
    actions: {
      back: `/providers/${providerId}`,
      cancel: `/providers/${providerId}/addresses`,
      save: `/providers/${providerId}/addresses/${addressId}/delete`
    }
  })
}

exports.deleteProviderAddress_post = async (req, res) => {
  const { addressId, providerId } = req.params
  const { user } = req.session.passport
  const address = await ProviderAddress.findByPk(addressId)
  await address.update({
    deletedAt: new Date(),
    deletedById: user.id,
    updatedById: user.id
  })

  req.flash('success', 'Address deleted')
  res.redirect(`/providers/${providerId}/addresses`)
}
