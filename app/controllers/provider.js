const Pagination = require('../helpers/pagination')
const { isAccreditedProvider } = require('../helpers/accreditation')
const { isoDateFromDateInput } = require('../helpers/date')
const { nullIfEmpty } = require('../helpers/string')
const { isValidPostcode } = require('../helpers/validation')
const { getAccreditationTypeLabel, getProviderTypeLabel } = require('../helpers/content')
const { v4: uuid } = require('uuid')
const {
  Provider,
  ProviderAddress,
  ProviderContact,
  ProviderAccreditation
} = require('../models')

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

  let providerTypes
  if (req.session.data.filters?.providerType) {
    providerTypes = getCheckboxValues(providerType, req.session.data.filters.providerType)
  }

  let accreditationTypes
  if (req.session.data.filters?.accreditationType) {
    accreditationTypes = getCheckboxValues(accreditationType, req.session.data.filters.accreditationType)
  }

  const hasFilters = !!((providerTypes?.length > 0) || (accreditationTypes?.length > 0))

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
  }

  let selectedProviderType = []
  if (req.session.data.filters?.providerType) {
    selectedProviderType = req.session.data.filters.providerType
  }

  let selectedAccreditationType = []
  if (req.session.data.filters?.accreditationType) {
    selectedAccreditationType = req.session.data.filters.accreditationType
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
    include: [
      { model: ProviderAccreditation, as: 'accreditations' },
      { model: ProviderAddress, as: 'addresses' },
      { model: ProviderContact, as: 'contacts' }
    ]
  })

  // 2) Fetch the accreditedPartnerships sorted
  provider.accreditedPartnerships = await provider.getAccreditedPartnerships({
    order: [['operatingName', 'ASC']]
  })

  // 3) Fetch the trainingPartnerships sorted
  provider.trainingPartnerships = await provider.getTrainingPartnerships({
    order: [['operatingName', 'ASC']]
  })

  res.render('providers/show', {
    provider,
    isAccredited,
    actions: {
      accreditation: {
        change: `/providers/${providerId}/accreditations`,
        delete: `/providers/${providerId}/accreditations`,
        new: `/providers/${providerId}/accreditations/new`
      },
      address: {
        change: `/providers/${providerId}/addresses`,
        delete: `/providers/${providerId}/addresses`,
        new: `/providers/${providerId}/addresses/new`
      },
      contact: {
        change: `/providers/${providerId}/contacts`,
        delete: `/providers/${providerId}/contacts`,
        new: `/providers/${providerId}/contacts/new`
      },
      partnership: {
        change: `/providers/${providerId}/partnerships`,
        delete: `/providers/${providerId}/partnerships`,
        new: `/providers/${providerId}/partnerships/new`
      }
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

exports.newProviderAddress_get = async (req, res) => {
  let back
  if (req.session.data.provider.isAccredited == "yes") {
    back = '/providers/new/accreditation'
  } else {
    back = '/providers/new/details'
  }

  res.render('providers/new/address', {
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
  } else if (!isValidPostcode(req.session.data.provider.address.postcode)) {
    const error = {}
    error.fieldName = "address-postcode"
    error.href = "#address-postcode"
    error.text = "Enter a real postcode"
    errors.push(error)
  }

  if (errors.length) {
    let back
    if (req.session.data.provider.isAccredited == "yes") {
      back = '/providers/new/accreditation'
    } else {
      back = '/providers/new/details'
    }

    res.render('providers/new/address', {
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
  res.render('providers/new/check-your-answers', {
    provider: req.session.data.provider,
    actions: {
      back: `/providers/new`,
      cancel: `/providers`,
      save: `/providers/new/check`
    }
  })
}

exports.newProviderCheck_post = async (req, res) => {
  const { provider } = req.session.data
  const userId = req.session.passport.user.id

  const providerId = uuid()

  await Provider.create({
    id: providerId,
    operatingName: provider.operatingName,
    legalName: nullIfEmpty(provider.legalName),
    type: provider.type,
    code: provider.code,
    ukprn: provider.ukprn,
    urn: nullIfEmpty(provider.urn),
    createdAt: new Date(),
    createdById: userId
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
      id: uuid(),
      providerId,
      number: provider.accreditation.number,
      startsOn,
      endsOn,
      createdAt: new Date(),
      createdById: userId
    })
  }

  if (provider.address) {
    // TODO: Geocode address

    await ProviderAddress.create({
      id: uuid(),
      providerId,
      line1: provider.address.line1,
      line2: nullIfEmpty(provider.address.line2),
      line3: nullIfEmpty(provider.address.line3),
      town: provider.address.town,
      county: nullIfEmpty(provider.address.county),
      postcode: provider.address.postcode,
      createdById: userId,
      updatedById: userId
    })
  }

  delete req.session.data.provider

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
    urn: req.session.data.provider.urn ? req.session.data.provider.urn : null,
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
