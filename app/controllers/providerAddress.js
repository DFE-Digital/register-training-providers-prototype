const { findByPostcode, findByUPRN, geocodeAddress } = require('../services/ordnanceSurveyPlaces')
const { getProviderLastUpdated } = require('../helpers/activityLog')
const { isAccreditedProvider } = require('../helpers/accreditation')
const { isValidPostcode } = require('../helpers/validation')
const { nullIfEmpty } = require('../helpers/string')
const { parseOsPlacesData, parseForGovukRadios, parseAddressAsString } = require('../helpers/address')
const { Provider, ProviderAddress } = require('../models')
const Pagination = require('../helpers/pagination')

const getProviderBaseUrl = (req, res) => (
  res.locals.providerBaseUrl || `/support/providers/${req.params.providerId}`
)

/// ------------------------------------------------------------------------ ///
/// List provider addresses
/// ------------------------------------------------------------------------ ///

exports.providerAddressesList = async (req, res) => {
  delete req.session.data.find
  delete req.session.data.address

  const page = parseInt(req.query.page, 10) || 1
  const limit = parseInt(req.query.limit, 10) || 15
  const offset = (page - 1) * limit

  // get the providerId from the request for use in subsequent queries
  const { providerId } = req.params
  const baseUrl = getProviderBaseUrl(req, res)

  // get the current provider
  const provider = await Provider.findByPk(providerId)

  // Run in parallel: accreditation flag + last update (by providerId)
  const [isAccredited, lastUpdate] = await Promise.all([
    isAccreditedProvider({ providerId }),
    getProviderLastUpdated(providerId, { includeDeletedChildren: true })
  ])

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
    lastUpdate,
    // Addresses for *this* page
    addresses: pagination.getData(),
    // The pagination metadata (pageItems, nextPage, etc.)
    pagination,
    actions: {
      new: `${baseUrl}/addresses/new`,
      change: `${baseUrl}/addresses`,
      delete: `${baseUrl}/addresses`
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
  const baseUrl = getProviderBaseUrl(req, res)
  const provider = await Provider.findByPk(providerId)

  res.render('providers/addresses/find', {
    provider,
    find: req.session.data.find,
    actions: {
      back: `${baseUrl}/addresses`,
      cancel: `${baseUrl}/addresses`,
      save: `${baseUrl}/addresses/new`
    }
  })
}

exports.newFindProviderAddress_post = async (req, res) => {
  const { providerId } = req.params
  const baseUrl = getProviderBaseUrl(req, res)
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
        back: `${baseUrl}/addresses`,
        cancel: `${baseUrl}/addresses`,
        save: `${baseUrl}/addresses/new`
      }
    })
  } else {
    res.redirect(`${baseUrl}/addresses/new/select`)
  }
}

exports.newSelectProviderAddress_get = async (req, res) => {
  const { providerId } = req.params
  const baseUrl = getProviderBaseUrl(req, res)
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

  let back = `${baseUrl}/addresses/new`
  if (req.query.referrer === 'check') {
    back = `${baseUrl}/addresses/new/check`
  }

  res.render('providers/addresses/select', {
    provider,
    addresses,
    find,
    address,
    actions: {
      back,
      cancel: `${baseUrl}/addresses`,
      change: `${baseUrl}/addresses/new`,
      enter: `${baseUrl}/addresses/new/enter?addressFinderIncomplete=`,
      save: `${baseUrl}/addresses/new/select`
    }
  })
}

exports.newSelectProviderAddress_post = async (req, res) => {
  const { providerId } = req.params
  const baseUrl = getProviderBaseUrl(req, res)
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

    let back = `${baseUrl}/addresses/new`
    if (req.query.referrer === 'check') {
      back = `${baseUrl}/addresses/new/check`
    }

    res.render('providers/addresses/select', {
      provider,
      addresses,
      find,
      address,
      errors,
      actions: {
        back,
        cancel: `${baseUrl}/addresses`,
        change: `${baseUrl}/addresses/new`,
        enter: `${baseUrl}/addresses/new/enter?addressFinderIncomplete=`,
        save: `${baseUrl}/addresses/new/select`
      }
    })
  } else {
    res.redirect(`${baseUrl}/addresses/new/check`)
  }
}

exports.newEnterProviderAddress_get = async (req, res) => {
  const { providerId } = req.params
  const baseUrl = getProviderBaseUrl(req, res)
  const { address } = req.session.data
  const provider = await Provider.findByPk(providerId)
  const showAddressFinderInset = !!req.session.data.addressFinderIncomplete

  // delete any selected address URPN as user is entering manually
  delete req.session.data.find.uprn

  res.render('providers/addresses/edit', {
    provider,
    address,
    showAddressFinderInset,
    actions: {
      back: `${baseUrl}/addresses/new/select`,
      cancel: `${baseUrl}/addresses`,
      save: `${baseUrl}/addresses/new/enter`
    }
  })
}

exports.newEnterProviderAddress_post = async (req, res) => {
  const { providerId } = req.params
  const baseUrl = getProviderBaseUrl(req, res)
  const { address } = req.session.data
  const provider = await Provider.findByPk(providerId)
  const showAddressFinderInset = !!req.session.data.addressFinderIncomplete
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
      showAddressFinderInset,
      errors,
      actions: {
        back: `${baseUrl}/addresses/new/select`,
        cancel: `${baseUrl}/addresses`,
        save: `${baseUrl}/addresses/new/enter`
      }
    })
  } else {
    res.redirect(`${baseUrl}/addresses/new/check`)
  }
}

exports.newProviderAddressCheck_get = async (req, res) => {
  const { providerId } = req.params
  const baseUrl = getProviderBaseUrl(req, res)
  const provider = await Provider.findByPk(providerId)
  const { find } = req.session.data
  let { address } = req.session.data

  if (find.uprn) {
    address = await findByUPRN(
      uprn = find.uprn
    )

    address = parseOsPlacesData(address)
    // If OS Places returns incomplete data, send the user to manual entry
    if (!address.line1?.trim() || !address.town?.trim() || !address.postcode?.trim()) {
      req.session.data.address = address
      req.session.data.addressFinderIncomplete = true
      return res.redirect(`${baseUrl}/addresses/new/enter`)
    }
  }
  // Geocode the address data if we don't already have coordinates
  if (address.latitude == null || address.longitude == null) {
    const addressString = parseAddressAsString(address)
    const geocodes = await geocodeAddress(addressString)
    address = { ...address, ...geocodes }
  }

  // put address into the session data for use later
  req.session.data.address = address

  let back = `${baseUrl}/addresses/new/select`
  if (!req.session.data.find.uprn) {
    back = `${baseUrl}/addresses/new/enter`
  }

  res.render('providers/addresses/check-your-answers', {
    provider,
    address: req.session.data.address,
    actions: {
      back,
      cancel: `${baseUrl}/addresses`,
      change: back,
      save: `${baseUrl}/addresses/new/check`
    }
  })
}

exports.newProviderAddressCheck_post = async (req, res) => {
  const { providerId } = req.params
  const baseUrl = getProviderBaseUrl(req, res)
  const { address } = req.session.data
  const userId = req.user.id

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
    createdById: userId,
    updatedById: userId
  })

  delete req.session.data.find
  delete req.session.data.address
  delete req.session.data.addressFinderIncomplete

  req.flash('success', 'Address added')
  res.redirect(`${baseUrl}/addresses`)
}

/// ------------------------------------------------------------------------ ///
/// Edit provider address
/// ------------------------------------------------------------------------ ///

exports.editProviderAddress_get = async (req, res) => {
  const { addressId, providerId } = req.params
  const baseUrl = getProviderBaseUrl(req, res)
  const provider = await Provider.findByPk(providerId)
  const currentAddress = await ProviderAddress.findByPk(addressId)

  let address
  if (req.session.data?.address) {
    address = req.session.data.address
  } else {
    address = await ProviderAddress.findByPk(addressId)
  }

  let back = `${baseUrl}/addresses`
  if (req.query.referrer === 'check') {
    back = `${baseUrl}/addresses/${addressId}/edit/check`
  }

  res.render('providers/addresses/edit', {
    provider,
    currentAddress,
    address,
    actions: {
      back,
      cancel: `${baseUrl}/addresses`,
      save: `${baseUrl}/addresses/${addressId}/edit`
    }
  })
}

exports.editProviderAddress_post = async (req, res) => {
  const { addressId, providerId } = req.params
  const baseUrl = getProviderBaseUrl(req, res)
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
    let back = `${baseUrl}/addresses`
    if (req.query.referrer === 'check') {
      back = `${baseUrl}/addresses/${addressId}/edit/check`
    }

    res.render('providers/addresses/edit', {
      provider,
      currentAddress,
      address,
      errors,
      actions: {
        back,
        cancel: `${baseUrl}/addresses`,
        save: `${baseUrl}/addresses/${addressId}/edit`
      }
    })
  } else {
    res.redirect(`${baseUrl}/addresses/${addressId}/edit/check`)
  }
}

exports.editProviderAddressCheck_get = async (req, res) => {
  const { addressId, providerId } = req.params
  const baseUrl = getProviderBaseUrl(req, res)
  let { address } = req.session.data

  const provider = await Provider.findByPk(providerId)
  const currentAddress = await ProviderAddress.findByPk(addressId)

  // Geocode the address data if we don't already have coordinates
  if (address.latitude == null || address.longitude == null) {
    const addressString = parseAddressAsString(address)
    const geocodes = await geocodeAddress(addressString)
    address = { ...address, ...geocodes }
  }

  // put address into the session data for use later
  req.session.data.address = address

  res.render('providers/addresses/check-your-answers', {
    provider,
    currentAddress,
    address: req.session.data.address,
    actions: {
      back: `${baseUrl}/addresses/${addressId}/edit`,
      cancel: `${baseUrl}/addresses`,
      change: `${baseUrl}/addresses/${addressId}/edit`,
      save: `${baseUrl}/addresses/${addressId}/edit/check`
    }
  })
}

exports.editProviderAddressCheck_post = async (req, res) => {
  const { addressId, providerId } = req.params
  const baseUrl = getProviderBaseUrl(req, res)
  const { address } = req.session.data
  const userId = req.user.id

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
  res.redirect(`${baseUrl}/addresses`)
}

/// ------------------------------------------------------------------------ ///
/// Delete provider address
/// ------------------------------------------------------------------------ ///

exports.deleteProviderAddress_get = async (req, res) => {
  const { addressId, providerId } = req.params
  const baseUrl = getProviderBaseUrl(req, res)
  const provider = await Provider.findByPk(providerId)
  const address = await ProviderAddress.findByPk(addressId)

  res.render('providers/addresses/delete', {
    provider,
    address,
    actions: {
      back: `${baseUrl}`,
      cancel: `${baseUrl}/addresses`,
      save: `${baseUrl}/addresses/${addressId}/delete`
    }
  })
}

exports.deleteProviderAddress_post = async (req, res) => {
  const { addressId, providerId } = req.params
  const baseUrl = getProviderBaseUrl(req, res)
  const userId = req.user.id
  const address = await ProviderAddress.findByPk(addressId)
  await address.update({
    deletedAt: new Date(),
    deletedById: userId,
    updatedById: userId
  })

  req.flash('success', 'Address deleted')
  res.redirect(`${baseUrl}/addresses`)
}
