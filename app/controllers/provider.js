const Pagination = require('../helpers/pagination')
const { isoDateFromDateInput } = require('../helpers/dates')
const { isValidPostcode } = require('../helpers/validation')
const { v4: uuid } = require('uuid')
const {
  Provider,
  ProviderAddress,
  ProviderContact,
  ProviderAccreditation
} = require('../models')

const { Op, literal } = require('sequelize')

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
  delete req.session.data.accreditation
  delete req.session.data.address

  res.render('providers/index', {
    // Providers for *this* page
    providers: pagination.getData(),
    // The pagination metadata (pageItems, nextPage, etc.)
    pagination
  })
}

exports.providerDetails = async (req, res) => {
  // Clear session provider data
  delete req.session.data.provider
  delete req.session.data.accreditation
  delete req.session.data.address
  delete req.session.data.search

  // get the providerId from the request for use in subsequent queries
  const { providerId } = req.params

  // set a date for use in determining if the provider is accredited
  const now = new Date()

  // find all valid accreditations for the provider
  const accreditationCount = await ProviderAccreditation.count({
    where: {
      providerId,
      startsOn: { [Op.lte]: now },
      [Op.or]: [
        { endsOn: null },
        { endsOn: { [Op.gte]: now } }
      ]
    }
  })

  // calculate if the provider is accredited
  const isAccredited = ((accreditationCount > 0)) // true|false

  const provider = await Provider.findByPk(providerId, {
    include: [
      {
        model: ProviderAddress,
        as: 'addresses'
      },
      {
        model: ProviderContact,
        as: 'contacts'
      },
      {
        model: ProviderAccreditation,
        as: 'accreditations'
      },
      {
        model: Provider,
        as: isAccredited ? 'trainingPartnerships' : 'accreditedPartnerships'
      }
    ]
  })

  res.render('providers/show', {
    provider,
    isAccredited,
    actions: {
      address: {
        change: `/providers/${providerId}/addresses`,
        delete: `/providers/${providerId}/addresses`,
        new: `/providers/${providerId}/addresses/new`
      },
      accreditation: {
        change: `/providers/${providerId}/accreditations`,
        delete: `/providers/${providerId}/accreditations`,
        new: `/providers/${providerId}/accreditations/new`
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
  const providerId = uuid()

  await Provider.create({
    id: providerId,
    operatingName: req.session.data.provider.operatingName,
    legalName: req.session.data.provider.legalName,
    type: req.session.data.provider.type,
    code: req.session.data.provider.code,
    ukprn: req.session.data.provider.ukprn,
    urn: req.session.data.provider.urn.length ? req.session.data.provider.urn : null,
    createdAt: new Date(),
    createdById: req.session.passport.user.id
  })

  if (req.session.data.provider.accreditation) {
    let startsOn = isoDateFromDateInput(req.session.data.provider.accreditation.startsOn)
    startsOn = new Date(startsOn)

    let endsOn = null
    if (isoDateFromDateInput(req.session.data.provider.accreditation.endsOn) !== 'Invalid DateTime') {
     endsOn =  isoDateFromDateInput(req.session.data.provider.accreditation.endsOn)
     endsOn = new Date(endsOn)
    }

    await ProviderAccreditation.create({
      id: uuid(),
      providerId,
      number: req.session.data.provider.accreditation.number,
      startsOn,
      endsOn,
      createdAt: new Date(),
      createdById: req.session.passport.user.id
    })
  }

  if (req.session.data.provider.address) {
    await ProviderAddress.create({
      id: uuid(),
      providerId,
      line1: req.session.data.provider.address.line1,
      line2: req.session.data.provider.address.line2.length ? req.session.data.provider.address.line2 : null,
      line3: req.session.data.provider.address.line3.length ? req.session.data.provider.address.line3 : null,
      town: req.session.data.provider.address.town,
      county: req.session.data.provider.address.county.length ? req.session.data.provider.address.county : null,
      postcode: req.session.data.provider.address.postcode,
      createdAt: new Date(),
      createdById: req.session.passport.user.id
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
