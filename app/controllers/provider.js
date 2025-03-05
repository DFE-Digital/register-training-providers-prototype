const Pagination = require('../helpers/pagination')
const { isAccreditedProvider } = require('../helpers/accreditation')
const { parseOsPlacesData, parseForGovukRadios, parseAddressAsString } = require('../helpers/address')
const { isoDateFromDateInput } = require('../helpers/date')
const { nullIfEmpty } = require('../helpers/string')
const { isValidPostcode } = require('../helpers/validation')
const { getAccreditationTypeLabel, getProviderTypeLabel } = require('../helpers/content')
const { findByPostcode, findByUPRN } = require('../services/ordnanceSurveyPlaces')
const { geocodeAddress } = require('../services/googleMaps')
const { Provider, ProviderAddress, ProviderAccreditation } = require('../models')

const { Op, literal } = require('sequelize')

const getCheckboxValues = (name, data) => {
  return name && (Array.isArray(name)
    ? name
    : [name].filter((name) => {
        return name !== '_unchecked'
      })) || data && (Array.isArray(data) ? data : [data])
}

const removeFilter = (value, data) => {
  // do this check because if coming from overview page for example,
  // the query/param will be a string value, not an array containing a string
  if (Array.isArray(data)) {
    return data.filter(item => item !== value)
  } else {
    return null
  }
}

/// ------------------------------------------------------------------------ ///
/// List provider
/// ------------------------------------------------------------------------ ///

exports.providersList = async (req, res) => {
  // clear session data
  delete req.session.data.provider
  delete req.session.data.accreditation
  delete req.session.data.address
  delete req.session.data.contact
  delete req.session.data.find

  // variables for use in pagination
  const page = parseInt(req.query.page, 10) || 1
  const limit = parseInt(req.query.limit, 10) || 25
  const offset = (page - 1) * limit

  // search
  const keywords = req.session.data.keywords || ''
  const hasSearch = !!((keywords))

  // filters
  const providerType = null
  const accreditationType = null
  const showDeletedProvider = null

  let providerTypes
  if (req.session.data.filters?.providerType) {
    providerTypes = getCheckboxValues(providerType, req.session.data.filters.providerType)
  }

  let accreditationTypes
  if (req.session.data.filters?.accreditationType) {
    accreditationTypes = getCheckboxValues(accreditationType, req.session.data.filters.accreditationType)
  }

  let showDeletedProviders
  if (req.session.data.filters?.showDeletedProvider) {
    showDeletedProviders = getCheckboxValues(showDeletedProvider, req.session.data.filters.showDeletedProvider)
  }

  const hasFilters = !!((providerTypes?.length > 0)
   || (accreditationTypes?.length > 0)
   || (showDeletedProviders?.length > 0)
  )

  let selectedFilters = null

  if (hasFilters) {
    selectedFilters = {
      categories: []
    }

    if (providerTypes?.length) {
      selectedFilters.categories.push({
        heading: { text: 'Provider type' },
        items: providerTypes.map((providerType) => {
          return {
            text: getProviderTypeLabel(providerType),
            href: `/providers/remove-provider-type-filter/${providerType}`
          }
        })
      })
    }

    if (accreditationTypes?.length) {
      selectedFilters.categories.push({
        heading: { text: 'Accreditation type' },
        items: accreditationTypes.map((accreditationType) => {
          return {
            text: getAccreditationTypeLabel(accreditationType),
            href: `/providers/remove-accreditation-type-filter/${accreditationType}`
          }
        })
      })
    }

    if (showDeletedProviders?.length) {
      selectedFilters.categories.push({
        heading: { text: 'Deleted providers' },
        items: showDeletedProviders.map((showDeletedProvider) => {
          return {
            text: 'Include deleted providers',
            href: `/providers/remove-show-deleted-provider-filter/${showDeletedProvider}`
          }
        })
      })
    }
  }

  let selectedProviderType = []
  if (req.session.data.filters?.providerType) {
    selectedProviderType = req.session.data.filters.providerType
  }

  let selectedAccreditationType = []
  if (req.session.data.filters?.accreditationType) {
    selectedAccreditationType = req.session.data.filters.accreditationType
  }

  let selectedDeletedProvider = []
  if (req.session.data.filters?.showDeletedProvider) {
    selectedDeletedProvider = req.session.data.filters.showDeletedProvider
  }

  // build the WHERE conditions
  const whereClause = {
    [Op.and]: [
      // first, apply the keyword match (an OR across multiple columns)
      {
        [Op.or]: [
          { operatingName: { [Op.like]: `%${keywords}%` } },
          { legalName: { [Op.like]: `%${keywords}%` } },
          { ukprn: { [Op.like]: `%${keywords}%` } },
          { urn: { [Op.like]: `%${keywords}%` } }
        ]
      }
    ]
  }

  // if there's a provider type filter, add it as another condition in the AND array
  if (selectedProviderType.length > 0) {
    whereClause[Op.and].push({ type: { [Op.in]: selectedProviderType } })
  }

  // Now set up an include for ProviderAccreditation
  //
  // Assume that "current" means:
  //     endsOn is null OR endsOn > now
  //
  // The idea here is that “accredited” means having at least one valid accreditation,
  // whereas “notAccredited” means no valid accreditation rows at all.
  const today = new Date()

  const include = [
    {
      model: ProviderAccreditation,
      as: 'accreditations',
      required: false, // false so that providers with no accreditations also come back
      // We'll only consider "current" accreditations in this relation
      attributes: ['id', 'startsOn', 'endsOn'],
      where: {
        startsOn: { [Op.lte]: today },
        [Op.or]: [
          { endsOn: null },
          { endsOn: { [Op.gte]: today } }
        ]
      }
    }
  ]

  // Apply accreditation filters if user has selected them
  //
  //  - If both "accredited" and "notAccredited" are selected, we want them all—so no extra filter.
  //
  //  - If only "accredited" is selected, we need providers who have at least one current accreditation row
  //    => i.e. $accreditations.id$ != null
  //
  //  - If only "notAccredited" is selected, we need providers who have no current accreditation rows
  //    => $accreditations.id$ = null
  if (selectedAccreditationType.length === 1) {
    if (selectedAccreditationType[0] === 'accredited') {
      // Must have a matching accreditation
      whereClause[Op.and].push({
        '$accreditations.id$': { [Op.ne]: null }
      })
    } else if (selectedAccreditationType[0] === 'notAccredited') {
      // Must NOT have a matching accreditation
      whereClause[Op.and].push({
        '$accreditations.id$': null
      })
    }
  }
  // If selectedAccreditationType includes both 'accredited' and 'notAccredited',
  // we do nothing—because that means return everything.

  // Only show active providers unless user has selected to also show deleted providers
  if (!selectedDeletedProvider.length) {
    whereClause[Op.and].push({
      'deletedAt': null
    })
  }

  // Get the total number of providers for pagination metadata
  const totalCount = await Provider.count({
    where: whereClause,
    include,
    subQuery: false
  })

  // Only fetch ONE page of providers
  const providers = await Provider.findAll({
    where: whereClause,
    include,
    order: [['operatingName', 'ASC']],
    limit,
    offset,
    subQuery: false
  })

  providers.forEach(provider => {
    provider.isAccredited = provider.accreditations?.length > 0
  })

  // create the Pagination object
  // using the chunk + the overall total count
  const pagination = new Pagination(providers, totalCount, page, limit)

  res.render('providers/index', {
    // providers for *this* page
    providers: pagination.getData(),
    // the pagination metadata (pageItems, nextPage, etc.)
    pagination,
    // the selected filters
    selectedFilters,
    // the search terms
    keywords,
    //
    hasSearch,
    //
    hasFilters,
    actions: {
      new: '/providers/new/',
      view: '/providers',
      filters: {
        apply: '/providers',
        remove: '/providers/remove-all-filters'
      },
      search: {
        find: '/providers',
        remove: '/providers/remove-keyword-search'
      }
    }
  })
}

exports.removeProviderTypeFilter = (req, res) => {
  req.session.data.filters.providerType = removeFilter(
    req.params.providerType,
    req.session.data.filters.providerType
  )
  res.redirect('/providers')
}

exports.removeAccreditationTypeFilter = (req, res) => {
  req.session.data.filters.accreditationType = removeFilter(
    req.params.accreditationType,
    req.session.data.filters.accreditationType
  )
  res.redirect('/providers')
}

exports.removeShowDeletedProviderFilter = (req, res) => {
  req.session.data.filters.showDeletedProvider = removeFilter(
    req.params.showDeletedProvider,
    req.session.data.filters.showDeletedProvider
  )
  res.redirect('/providers')
}

exports.removeAllFilters = (req, res) => {
  delete req.session.data.filters
  res.redirect('/providers')
}

exports.removeKeywordSearch = (req, res) => {
  delete req.session.data.keywords
  res.redirect('/providers')
}

/// ------------------------------------------------------------------------ ///
/// Show provider
/// ------------------------------------------------------------------------ ///

exports.providerDetails = async (req, res) => {
  // Clear session provider data
  delete req.session.data.provider
  delete req.session.data.accreditation
  delete req.session.data.address
  delete req.session.data.search
  delete req.session.data.keywords
  delete req.session.data.find

  // get the providerId from the request for use in subsequent queries
  const { providerId } = req.params

  // calculate if the provider is accredited
  const isAccredited = await isAccreditedProvider({ providerId })

  // 1) Fetch the main provider (and hasMany associations)
  const provider = await Provider.findByPk(providerId, {
    // include: [
    //   { model: ProviderAccreditation, as: 'accreditations' },
    //   { model: ProviderAddress, as: 'addresses' },
    //   { model: ProviderContact, as: 'contacts' }
    // ]
  })

  // 2) Fetch the accreditedPartnerships sorted
  // provider.accreditedPartnerships = await provider.getAccreditedPartnerships({
  //   order: [['operatingName', 'ASC']]
  // })

  // 3) Fetch the trainingPartnerships sorted
  // provider.trainingPartnerships = await provider.getTrainingPartnerships({
  //   order: [['operatingName', 'ASC']]
  // })

  res.render('providers/show', {
    provider,
    isAccredited,
    actions: {
      delete: `/providers/${providerId}/delete`
    }
   })
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

  if (!req.session.data.provider?.isAccredited) {
    const error = {}
    error.fieldName = 'isAccredited'
    error.href = '#isAccredited'
    error.text = 'Select if the provider is accredited'
    errors.push(error)
  }

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

  if (!req.session.data.provider?.type) {
    const error = {}
    error.fieldName = 'type'
    error.href = '#type'
    error.text = 'Select a provider type'
    errors.push(error)
  }

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

  if (!req.session.data.provider.ukprn.length) {
    const error = {}
    error.fieldName = 'ukprn'
    error.href = '#ukprn'
    error.text = 'Enter a UK provider reference number (UKPRN)'
    errors.push(error)
  }

  if (req.session.data.provider?.type === 'school') {
    if (!req.session.data.provider.urn.length) {
      const error = {}
      error.fieldName = 'urn'
      error.href = '#urn'
      error.text = 'Enter a unique reference number (URN)'
      errors.push(error)
    }
  }

  if (!req.session.data.provider.code.length) {
    const error = {}
    error.fieldName = 'code'
    error.href = '#code'
    error.text = 'Enter a provider code'
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
  res.render('providers/new/accreditation', {
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

  if (!req.session.data.provider.accreditation.number.length) {
    const error = {}
    error.fieldName = "number"
    error.href = "#number"
    error.text = "Enter an accredited provider number"
    errors.push(error)
  }

  if (!(req.session.data.provider.accreditation.startsOn?.day.length
    && req.session.data.provider.accreditation.startsOn?.month.length
    && req.session.data.provider.accreditation.startsOn?.year.length)
  ) {
    const error = {}
    error.fieldName = "startsOn"
    error.href = "#startsOn"
    error.text = "Enter date accreditation starts"
    errors.push(error)
  }

  if (errors.length) {
    res.render('providers/new/accreditation', {
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

exports.newProviderFindAddress_get = async (req, res) => {
  const { find, provider } = req.session.data

  let back
  if (provider.isAccredited == "yes") {
    back = '/providers/new/accreditation'
  } else {
    back = '/providers/new/details'
  }

  res.render('providers/new/address/find', {
    provider,
    find,
    actions: {
      back,
      cancel: `/providers`,
      save: `/providers/new/address`
    }
  })
}

exports.newProviderFindAddress_post = async (req, res) => {
  const { find, provider } = req.session.data
  const errors = []

  if (!find.postcode.length) {
    const error = {}
    error.fieldName = "address-postcode"
    error.href = "#address-postcode"
    error.text = "Enter a postcode"
    errors.push(error)
  }
  // else if (!isValidPostcode(find.postcode)) {
  //   const error = {}
  //   error.fieldName = "address-postcode"
  //   error.href = "#address-postcode"
  //   error.text = "Enter a real postcode"
  //   errors.push(error)
  // }

  // if (!find.building.length) {
  //   const error = {}
  //   error.fieldName = "address-building"
  //   error.href = "#address-building"
  //   error.text = "Enter building number or name"
  //   errors.push(error)
  // }

  if (errors.length) {
    let back
    if (provider.isAccredited == "yes") {
      back = '/providers/new/accreditation'
    } else {
      back = '/providers/new/details'
    }

    res.render('providers/new/address/find', {
      provider,
      find,
      errors,
      actions: {
        back,
        cancel: `/providers`,
        save: `/providers/new/address`
      }
    })
  } else {
    res.redirect(`/providers/new/address/select`)
  }
}

exports.newProviderSelectAddress_get = async (req, res) => {
  const { address, find, provider } = req.session.data

  let addresses = []
  if (find.postcode?.length) {
    addresses = await findByPostcode(
      postcode = find.postcode,
      building = find.building
    )

    addresses = await parseForGovukRadios(addresses)
  }

  let back = `/providers/new/address`
  if (req.query.referrer === 'check') {
    back = `/providers/new/check`
  }

  res.render('providers/new/address/select', {
    provider,
    addresses,
    find,
    address,
    actions: {
      back,
      cancel: `/providers`,
      change: `/providers/new/address`,
      enter: `/providers/new/address/enter`,
      save: `/providers/new/address/select`
    }
  })
}

exports.newProviderSelectAddress_post = async (req, res) => {
  const { address, find, provider } = req.session.data
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

    let back = `/providers/new/address`
    if (req.query.referrer === 'check') {
      back = `/providers/new/check`
    }

    res.render('providers/new/address/select', {
      provider,
      addresses,
      find,
      address,
      errors,
      actions: {
        back,
        cancel: `/providers`,
        change: `/providers/new/address`,
        enter: `/providers/new/address/enter`,
        save: `/providers/new/address/select`
      }
    })
  } else {
    res.redirect(`/providers/new/check`)
  }
}

exports.newProviderEnterAddress_get = async (req, res) => {
  const { address, provider } = req.session.data

  // delete any selected address URPN as user is entering manually
  delete req.session.data.find.uprn

  res.render('providers/new/address/edit', {
    provider,
    address,
    actions: {
      back: `/providers/new/address/select`,
      cancel: `/providers`,
      save: `/providers/new/address/enter`
    }
  })
}

exports.newProviderEnterAddress_post = async (req, res) => {
  const { address, provider } = req.session.data
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
    res.render('providers/new/address/edit', {
      provider: provider,
      address: address,
      errors,
      actions: {
        back: `/providers/new/address/select`,
        cancel: `/providers`,
        save: `/providers/new/address/enter`
      }
    })
  } else {
    res.redirect(`/providers/new/check`)
  }
}

exports.newProviderCheck_get = async (req, res) => {
  const { find, provider } = req.session.data
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

  let back = `/providers/new/address/enter`
  if (find.uprn) {
    back = `/providers/new/address/select`
  }

  res.render('providers/new/check-your-answers', {
    provider,
    address,
    actions: {
      back,
      cancel: `/providers`,
      change: `/providers/new`,
      save: `/providers/new/check`
    }
  })
}

exports.newProviderCheck_post = async (req, res) => {
  const { address, provider } = req.session.data
  const userId = req.session.passport.user.id

  const newProvider = await Provider.create({
    operatingName: provider.operatingName,
    legalName: nullIfEmpty(provider.legalName),
    type: provider.type,
    code: provider.code,
    ukprn: provider.ukprn,
    urn: nullIfEmpty(provider.urn),
    createdById: userId,
    updatedById: userId
  })

  if (provider.accreditation) {
    let startsOn = isoDateFromDateInput(provider.accreditation.startsOn)
    startsOn = new Date(startsOn)

    let endsOn = null
    if (isoDateFromDateInput(provider.accreditation.endsOn) !== 'Invalid DateTime') {
     endsOn =  isoDateFromDateInput(provider.accreditation.endsOn)
     endsOn = new Date(endsOn)
    }

    await ProviderAccreditation.create({
      providerId: newProvider.id,
      number: provider.accreditation.number,
      startsOn,
      endsOn,
      createdById: userId,
      updatedById: userId
    })
  }

  if (address) {
    await ProviderAddress.create({
      providerId: newProvider.id,
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
  }

  delete req.session.data.provider
  delete req.session.data.address

  req.flash('success', 'Provider added')
  res.redirect(`/providers`)
}

/// ------------------------------------------------------------------------ ///
/// Edit provider
/// ------------------------------------------------------------------------ ///

exports.editProvider_get = async (req, res) => {
  const currentProvider = await Provider.findByPk(req.params.providerId)

  let provider
  if (req.session.data.provider) {
    provider = {...currentProvider.dataValues, ...req.session.data.provider}
  } else {
    provider = currentProvider
  }

  let back = `/providers/${req.params.providerId}`
  if (req.query.referrer === 'check') {
    back = `/providers/${req.params.providerId}/edit/check`
  }

  res.render('providers/edit', {
    currentProvider,
    provider,
    actions: {
      back,
      cancel: `/providers/${req.params.providerId}`,
      save: `/providers/${req.params.providerId}/edit`
    }
  })
}

exports.editProvider_post = async (req, res) => {
  const currentProvider = await Provider.findByPk(req.params.providerId)
  const provider = {...currentProvider.dataValues, ...req.session.data.provider}

  const errors = []

  if (!req.session.data.provider.operatingName.length) {
    const error = {}
    error.fieldName = 'operatingName'
    error.href = '#operatingName'
    error.text = 'Enter an operating name'
    errors.push(error)
  }

  if (['hei','scitt'].includes(provider.type)) {
    if (!req.session.data.provider.legalName.length) {
      const error = {}
      error.fieldName = 'legalName'
      error.href = '#legalName'
      error.text = 'Enter a legal name'
      errors.push(error)
    }
  }

  if (!req.session.data.provider.ukprn.length) {
    const error = {}
    error.fieldName = 'ukprn'
    error.href = '#ukprn'
    error.text = 'Enter a UK provider reference number (UKPRN)'
    errors.push(error)
  }

  if (provider.type === 'school') {
    if (!req.session.data.provider.urn.length) {
      const error = {}
      error.fieldName = 'urn'
      error.href = '#urn'
      error.text = 'Enter a unique reference number (URN)'
      errors.push(error)
    }
  }

  if (!req.session.data.provider.code.length) {
    const error = {}
    error.fieldName = 'code'
    error.href = '#code'
    error.text = 'Enter a provider code'
    errors.push(error)
  }

  if (errors.length) {
    let back = `/providers/${req.params.providerId}`
    if (req.query.referrer === 'check') {
      back = `/providers/${req.params.providerId}/edit/check`
    }

    res.render('providers/edit', {
      provider,
      errors,
      actions: {
        back,
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
  const provider = {...currentProvider.dataValues, ...req.session.data.provider}

  res.render('providers/edit/check-your-answers', {
    currentProvider,
    provider,
    actions: {
      back: `/providers/${req.params.providerId}/edit`,
      cancel: `/providers/${req.params.providerId}`,
      save: `/providers/${req.params.providerId}/edit/check`
    }
  })
}

exports.editProviderCheck_post = async (req, res) => {
  const provider = await Provider.findByPk(req.params.providerId)
  await provider.update({
    operatingName: req.session.data.provider.operatingName,
    legalName: req.session.data.provider.legalName,
    // type: req.session.data.provider.type,
    code: req.session.data.provider.code,
    ukprn: req.session.data.provider.ukprn,
    urn: nullIfEmpty(req.session.data.provider.urn),
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
  await provider.update({
    deletedAt: new Date(),
    deletedById: req.session.passport.user.id,
    updatedById: req.session.passport.user.id
  })

  // provider.destroy()

  req.flash('success', 'Provider removed')
  res.redirect('/providers')
}

/// ------------------------------------------------------------------------ ///
/// Autocomplete data
/// ------------------------------------------------------------------------ ///

exports.accreditedProviderSuggestions_json = async (req, res) => {
  req.headers['Access-Control-Allow-Origin'] = true

  const query = req.query.search || ''
  const today = new Date()

  const providers = await Provider.findAll({
    attributes: [
      'id',
      'operatingName',
      'legalName',
      'ukprn',
      'urn'
    ],
    where: {
      [Op.or]: [
        { operatingName: { [Op.like]: `%${query}%` } },
        { legalName: { [Op.like]: `%${query}%` } },
        { ukprn: { [Op.like]: `%${query}%` } },
        { urn: { [Op.like]: `%${query}%` } }
      ]
    },
    include: [
      {
        model: ProviderAccreditation,
        as: 'accreditations',
        required: true, // ensures an INNER JOIN
        where: {
          startsOn: { [Op.lte]: today },         // started on or before today
          [Op.or]: [
            { endsOn: null },                    // no end date
            { endsOn: { [Op.gte]: today } }      // ends on or after today
          ]
        }
      }
    ],
    order: [['operatingName', 'ASC']]
  })

  res.json(providers)
}

exports.trainingProviderSuggestions_json = async (req, res) => {
  req.headers['Access-Control-Allow-Origin'] = true

  const query = req.query.search || ''
  const today = new Date()

  const providers = await Provider.findAll({
    attributes: [
      'id',
      'operatingName',
      'legalName',
      'ukprn',
      'urn'
    ],
    where: {
      [Op.or]: [
        { operatingName: { [Op.like]: `%${query}%` } },
        { legalName: { [Op.like]: `%${query}%` } },
        { ukprn: { [Op.like]: `%${query}%` } },
        { urn: { [Op.like]: `%${query}%` } }
      ]
    },
    include: [
      {
        model: ProviderAccreditation,
        as: 'accreditations',
        required: false, // LEFT JOIN instead of INNER JOIN
        attributes: [],
        where: {
          // Only match *current* accreditations
          startsOn: { [Op.lte]: today },
          [Op.or]: [
            { endsOn: null },
            { endsOn: { [Op.gte]: today } }
          ]
        }
      }
    ],
    group: ['Provider.id'],
    having: literal('COUNT("accreditations"."id") = 0'), // Only keep if no valid accreditations
    order: [['operatingName', 'ASC']]
  })

  res.json(providers)
}
