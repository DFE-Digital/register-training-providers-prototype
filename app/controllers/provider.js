const Pagination = require('../helpers/pagination')
const { isAccreditedProvider } = require('../helpers/accreditation')
const { getProviderLastUpdated } = require('../helpers/activityLog')
const { parseOsPlacesData, parseForGovukRadios, parseAddressAsString } = require('../helpers/address')
const { isoDateFromDateInput } = require('../helpers/date')
const { nullIfEmpty } = require('../helpers/string')
const { isValidPostcode, isValidAccreditedProviderNumber } = require('../helpers/validation')
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
  delete req.session.data.feedback

  const { filters } = req.session.data

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
  const showArchivedProvider = null

  let providerTypes
  if (filters?.providerType) {
    providerTypes = getCheckboxValues(providerType, filters.providerType)
  }

  let accreditationTypes
  if (filters?.accreditationType) {
    accreditationTypes = getCheckboxValues(accreditationType, filters.accreditationType)
  }

  let showArchivedProviders
  if (filters?.showArchivedProvider) {
    showArchivedProviders = getCheckboxValues(showArchivedProvider, filters.showArchivedProvider)
  }

  const hasFilters = !!((providerTypes?.length > 0)
   || (accreditationTypes?.length > 0)
   || (showArchivedProviders?.length > 0)
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

    if (showArchivedProviders?.length) {
      selectedFilters.categories.push({
        heading: { text: 'Archived providers' },
        items: showArchivedProviders.map((showArchivedProvider) => {
          return {
            text: 'Include archived providers',
            href: `/providers/remove-show-archived-provider-filter/${showArchivedProvider}`
          }
        })
      })
    }
  }

  let selectedProviderType = []
  if (filters?.providerType) {
    selectedProviderType = filters.providerType
  }

  let selectedAccreditationType = []
  if (filters?.accreditationType) {
    selectedAccreditationType = filters.accreditationType
  }

  let selectedArchivedProvider = []
  if (filters?.showArchivedProvider) {
    selectedArchivedProvider = filters.showArchivedProvider
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
          { urn: { [Op.like]: `%${keywords}%` } },
          { code: { [Op.like]: `%${keywords}%` } }
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
  if (!selectedArchivedProvider.length) {
    whereClause[Op.and].push({
      'archivedAt': null
    })
  }

  // Only show providers that have not been deleted
  whereClause[Op.and].push({
    'deletedAt': null
  })

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
  const { filters } = req.session.data
  filters.providerType = removeFilter(
    req.params.providerType,
    filters.providerType
  )
  res.redirect('/providers')
}

exports.removeAccreditationTypeFilter = (req, res) => {
  const { filters } = req.session.data
  filters.accreditationType = removeFilter(
    req.params.accreditationType,
    filters.accreditationType
  )
  res.redirect('/providers')
}

exports.removeShowArchivedProviderFilter = (req, res) => {
  const { filters } = req.session.data
  filters.showArchivedProvider = removeFilter(
    req.params.showArchivedProvider,
    filters.showArchivedProvider
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

exports.providerDetails = async (req, res, next) => {
  try {
    // Clear session provider data
    delete req.session.data.provider
    delete req.session.data.accreditation
    delete req.session.data.address
    delete req.session.data.search
    delete req.session.data.keywords
    delete req.session.data.filters
    delete req.session.data.find

    // get the providerId from the request for use in subsequent queries
    const { providerId } = req.params

    // Fetch the provider (404 if missing)
    const provider = await Provider.findByPk(providerId)
    if (!provider) return res.sendStatus(404)

    // Run in parallel: accreditation flag + last update (by providerId)
    const [isAccredited, lastUpdate] = await Promise.all([
      isAccreditedProvider({ providerId }),
      getProviderLastUpdated(providerId, { includeDeletedChildren: true })
    ])

    res.render('providers/show', {
      provider,
      isAccredited,
      lastUpdate,
      actions: {
        archive: `/providers/${providerId}/archive`,
        delete: `/providers/${providerId}/delete`,
        restore: `/providers/${providerId}/restore`
      }
    })
  } catch (err) {
    next(err)
  }
}

/// ------------------------------------------------------------------------ ///
/// New provider
/// ------------------------------------------------------------------------ ///

exports.newProviderIsAccredited_get = async (req, res) => {
  const { provider } = req.session.data
  res.render('providers/new/is-accredited', {
    provider,
    actions: {
      back: '/providers',
      cancel: '/providers',
      save: '/providers/new'
    }
  })
}

exports.newProviderIsAccredited_post = async (req, res) => {
  const { provider } = req.session.data
  const errors = []

  if (!provider?.isAccredited) {
    const error = {}
    error.fieldName = 'isAccredited'
    error.href = '#isAccredited'
    error.text = 'Select if the provider is accredited'
    errors.push(error)
  }

  if (errors.length) {
    res.render('providers/new/is-accredited', {
      provider,
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
  const { provider } = req.session.data
  res.render('providers/new/type', {
    provider,
    actions: {
      back: '/providers/new',
      cancel: '/providers',
      save: '/providers/new/type'
    }
  })
}

exports.newProviderType_post = async (req, res) => {
  const { provider } = req.session.data
  const errors = []

  if (!provider?.type) {
    const error = {}
    error.fieldName = 'type'
    error.href = '#type'
    error.text = 'Select provider type'
    errors.push(error)
  }

  if (errors.length) {
    res.render('providers/new/type', {
      provider,
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
  const { provider } = req.session.data
  res.render('providers/edit', {
    provider,
    actions: {
      back: '/providers/new/type',
      cancel: '/providers',
      save: '/providers/new/details'
    }
  })
}

exports.newProviderDetails_post = async (req, res) => {
  const { provider } = req.session.data
  const errors = []

  if (!provider.operatingName.length) {
    const error = {}
    error.fieldName = 'operatingName'
    error.href = '#operatingName'
    error.text = 'Enter operating name'
    errors.push(error)
  }

  if (provider?.type !== 'school') {
    if (!provider.legalName.length) {
      const error = {}
      error.fieldName = 'legalName'
      error.href = '#legalName'
      error.text = 'Enter legal name'
      errors.push(error)
    }
  }

  if (!provider.ukprn.length) {
    const error = {}
    error.fieldName = 'ukprn'
    error.href = '#ukprn'
    error.text = 'Enter UK provider reference number (UKPRN)'
    errors.push(error)
  }

  if (provider?.isAccredited === 'no' && provider?.type === 'school') {
    if (!provider.urn.length) {
      const error = {}
      error.fieldName = 'urn'
      error.href = '#urn'
      error.text = 'Enter unique reference number (URN)'
      errors.push(error)
    }
  }

  if (!provider.code.length) {
    const error = {}
    error.fieldName = 'code'
    error.href = '#code'
    error.text = 'Enter provider code'
    errors.push(error)
  }

  if (errors.length) {
    res.render('providers/edit', {
      provider,
      errors,
      actions: {
        back: '/providers/new/type',
        cancel: '/providers',
        save: '/providers/new/details'
      }
    })
  } else {
    if (provider.isAccredited == "yes") {
      res.redirect('/providers/new/accreditation')
    } else {
      res.redirect('/providers/new/address')
    }
  }
}

exports.newProviderAccreditation_get = async (req, res) => {
  const { provider } = req.session.data
  res.render('providers/new/accreditation', {
    provider,
    actions: {
      back: '/providers/new/details',
      cancel: '/providers',
      save: '/providers/new/accreditation'
    }
  })
}

exports.newProviderAccreditation_post = async (req, res) => {
  const { provider } = req.session.data
  const errors = []

  if (!provider.accreditation.number.length) {
    const error = {}
    error.fieldName = "number"
    error.href = "#number"
    error.text = "Enter accredited provider number"
    errors.push(error)
  } else if (!isValidAccreditedProviderNumber(
    provider.accreditation.number,
    provider.type
  )) {
    const error = {}
    const format = provider.type === 'hei' ? '1234' : '5678'
    error.fieldName = "number"
    error.href = "#number"
    error.text = `Enter accredited provider number in the correct format, like ${format}`
    errors.push(error)
  }

  if (!(provider.accreditation.startsOn?.day.length
    && provider.accreditation.startsOn?.month.length
    && provider.accreditation.startsOn?.year.length)
  ) {
    const error = {}
    error.fieldName = "startsOn"
    error.href = "#startsOn"
    error.text = "Enter date accreditation starts"
    errors.push(error)
  }

  if (errors.length) {
    res.render('providers/new/accreditation', {
      provider,
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
  } else if (!isValidPostcode(find.postcode)) {
    const error = {}
    error.fieldName = "address-postcode"
    error.href = "#address-postcode"
    error.text = "Enter a full UK postcode"
    errors.push(error)
  }

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
  const { user } = req.session.passport

  const newProvider = await Provider.create({
    operatingName: provider.operatingName,
    legalName: nullIfEmpty(provider.legalName),
    type: provider.type,
    code: provider.code,
    ukprn: provider.ukprn,
    urn: nullIfEmpty(provider.urn),
    createdById: user.id,
    updatedById: user.id
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
      createdById: user.id,
      updatedById: user.id
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
      createdById: user.id,
      updatedById: user.id
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
  // get the providerId from the request for use in subsequent queries
  const { providerId } = req.params

  // Fetch the current provider
  const currentProvider = await Provider.findByPk(providerId)

  // calculate if the provider is accredited
  const isAccredited = await isAccreditedProvider({ providerId })

  let provider
  if (req.session.data.provider) {
    // combine the current and new provider details
    provider = {...currentProvider.dataValues, ...req.session.data.provider}
  } else {
    provider = currentProvider
  }

  let back = `/providers/${providerId}`
  if (req.query.referrer === 'check') {
    back = `/providers/${providerId}/edit/check`
  }

  res.render('providers/edit', {
    currentProvider,
    provider,
    isAccredited,
    actions: {
      back,
      cancel: `/providers/${providerId}`,
      save: `/providers/${providerId}/edit`
    }
  })
}

exports.editProvider_post = async (req, res) => {
  // get the providerId from the request for use in subsequent queries
  const { providerId } = req.params

  // Fetch the current provider
  const currentProvider = await Provider.findByPk(providerId)

  // calculate if the provider is accredited
  const isAccredited = await isAccreditedProvider({ providerId })

  // combine the current and new provider details
  const provider = {...currentProvider.dataValues, ...req.session.data.provider}

  const errors = []

  if (!provider.operatingName.length) {
    const error = {}
    error.fieldName = 'operatingName'
    error.href = '#operatingName'
    error.text = 'Enter operating name'
    errors.push(error)
  }

  if (isAccredited) {
    if (!provider.legalName.length) {
      const error = {}
      error.fieldName = 'legalName'
      error.href = '#legalName'
      error.text = 'Enter legal name'
      errors.push(error)
    }
  }

  if (!provider.ukprn.length) {
    const error = {}
    error.fieldName = 'ukprn'
    error.href = '#ukprn'
    error.text = 'Enter UK provider reference number (UKPRN)'
    errors.push(error)
  }

  if (!isAccredited) {
    if (!provider.urn.length) {
      const error = {}
      error.fieldName = 'urn'
      error.href = '#urn'
      error.text = 'Enter unique reference number (URN)'
      errors.push(error)
    }
  }

  if (!provider.code.length) {
    const error = {}
    error.fieldName = 'code'
    error.href = '#code'
    error.text = 'Enter provider code'
    errors.push(error)
  }

  if (errors.length) {
    let back = `/providers/${providerId}`
    if (req.query.referrer === 'check') {
      back = `/providers/${providerId}/edit/check`
    }

    res.render('providers/edit', {
      currentProvider,
      provider,
      isAccredited,
      errors,
      actions: {
        back,
        cancel: `/providers/${providerId}`,
        save: `/providers/${providerId}/edit`
      }
    })
  } else {
    res.redirect(`/providers/${req.params.providerId}/edit/check`)
  }
}

exports.editProviderCheck_get = async (req, res) => {
  const { providerId } = req.params
  const currentProvider = await Provider.findByPk(providerId)
  const isAccredited = await isAccreditedProvider({ providerId })
  const provider = {...currentProvider.dataValues, ...req.session.data.provider}

  res.render('providers/edit/check-your-answers', {
    currentProvider,
    provider,
    isAccredited,
    actions: {
      back: `/providers/${providerId}/edit`,
      cancel: `/providers/${providerId}`,
      save: `/providers/${providerId}/edit/check`
    }
  })
}

exports.editProviderCheck_post = async (req, res) => {
  const { providerId } = req.params
  const { provider } = req.session.data
  const { user } = req.session.passport
  const currentProvider = await Provider.findByPk(providerId)
  await currentProvider.update({
    operatingName: provider.operatingName,
    legalName: provider.legalName,
    // type: provider.type,
    code: provider.code,
    ukprn: provider.ukprn,
    urn: nullIfEmpty(provider.urn),
    updatedById: user.id
  })

  delete req.session.data.provider

  req.flash('success', 'Provider updated')
  res.redirect(`/providers/${providerId}`)
}

/// ------------------------------------------------------------------------ ///
/// Archive provider
/// ------------------------------------------------------------------------ ///

exports.archiveProvider_get = async (req, res) => {
  const { providerId } = req.params
  const provider = await Provider.findByPk(providerId)
  res.render('providers/archive', {
    provider,
    actions: {
      archive: `/providers/${providerId}/archive`,
      cancel: `/providers/${providerId}`
    }
  })
}

exports.archiveProvider_post = async (req, res) => {
  const { providerId } = req.params
  const { user } = req.session.passport
  const provider = await Provider.findByPk(providerId)
  await provider.update({
    archivedAt: new Date(),
    archivedById: user.id,
    updatedById: user.id
  })

  req.flash('success', 'Provider archived')
  res.redirect(`/providers/${providerId}`)
}

/// ------------------------------------------------------------------------ ///
/// Restore provider
/// ------------------------------------------------------------------------ ///

exports.restoreProvider_get = async (req, res) => {
  const { providerId } = req.params
  const provider = await Provider.findByPk(providerId)
  res.render('providers/restore', {
    provider,
    actions: {
      cancel: `/providers/${providerId}`,
      restore: `/providers/${providerId}/restore`
    }
  })
}

exports.restoreProvider_post = async (req, res) => {
  const { providerId } = req.params
  const { user } = req.session.passport
  const provider = await Provider.findByPk(providerId)
  await provider.update({
    archivedAt: null,
    archivedById: null,
    updatedById: user.id
  })

  req.flash('success', 'Provider restored')
  res.redirect(`/providers/${providerId}`)
}

/// ------------------------------------------------------------------------ ///
/// Delete provider
/// ------------------------------------------------------------------------ ///

exports.deleteProvider_get = async (req, res) => {
  const { providerId } = req.params
  const provider = await Provider.findByPk(providerId)
  res.render('providers/delete', {
    provider,
    actions: {
      cancel: `/providers/${providerId}`,
      delete: `/providers/${providerId}/delete`
    }
  })
}

exports.deleteProvider_post = async (req, res) => {
  const { providerId } = req.params
  const { user } = req.session.passport
  const provider = await Provider.findByPk(providerId)
  await provider.update({
    deletedAt: new Date(),
    deletedById: user.id,
    updatedById: user.id
  })

  req.flash('success', 'Provider deleted')
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
      archivedAt: null,
      deletedAt: null,
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
      archivedAt: null,
      deletedAt: null,
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
