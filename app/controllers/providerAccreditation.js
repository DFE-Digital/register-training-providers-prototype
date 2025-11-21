const { getProviderLastUpdated } = require('../helpers/activityLog')
const { isAccreditedProvider } = require('../helpers/accreditation')
const { isoDateFromDateInput, govukDate, isValidDate } = require('../helpers/date')
const { validateDateInput, getDateParts } = require('../helpers/validation/date')
const { isValidAccreditedProviderNumber } = require('../helpers/validation')
const { Provider, ProviderAccreditation } = require('../models')
const Pagination = require('../helpers/pagination')

const formatDateForInput = (value) => {
  if (!value) return {}
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return {}
  return {
    day: String(date.getUTCDate()),
    month: String(date.getUTCMonth() + 1),
    year: String(date.getUTCFullYear())
  }
}

const normaliseDateValue = (value) => {
  if (!value) return {}

  if (Array.isArray(value)) {
    return {
      day: value[0] !== undefined && value[0] !== null ? String(value[0]) : '',
      month: value[1] !== undefined && value[1] !== null ? String(value[1]) : '',
      year: value[2] !== undefined && value[2] !== null ? String(value[2]) : ''
    }
  }

  if (value instanceof Date || typeof value === 'string' || typeof value === 'number') {
    return formatDateForInput(value)
  }

  if (typeof value === 'object') {
    const hasAnyKey = ['day', 'month', 'year'].some((key) =>
      Object.prototype.hasOwnProperty.call(value, key)
    )

    if (hasAnyKey) {
      return {
        day: value.day !== undefined && value.day !== null ? String(value.day) : '',
        month: value.month !== undefined && value.month !== null ? String(value.month) : '',
        year: value.year !== undefined && value.year !== null ? String(value.year) : ''
      }
    }
  }

  return {}
}

const validateAccreditationDates = ({ startsOnInput, endsOnInput } = {}) => {
  const errors = []
  let startsOnFieldErrors = null
  let endsOnFieldErrors = null
  let startsOnIso = null

  const startResult = validateDateInput(
    getDateParts(startsOnInput),
    {
      label: 'date accreditation starts',
      baseId: 'startsOn',
      minYear: 1990,
      maxYear: 2050
    }
  )

  if (!startResult.valid) {
    errors.push(startResult.summaryError)
    startsOnFieldErrors = startResult.fieldFlags || null
  } else {
    startsOnIso = startResult.iso
  }

  const endParts = getDateParts(endsOnInput)
  const hasEndInput = !!(endParts.day || endParts.month || endParts.year)

  if (hasEndInput) {
    const endResult = validateDateInput(
      endParts,
      {
        label: 'date accreditation ends',
        baseId: 'endsOn',
        minYear: 1990,
        maxYear: 2050,
        constraint: startsOnIso ? { onOrAfter: new Date(startsOnIso) } : undefined
      }
    )

    if (!endResult.valid) {
      errors.push(endResult.summaryError)
      endsOnFieldErrors = endResult.fieldFlags || null
    }
  }

  return {
    errors,
    startsOnFieldErrors,
    endsOnFieldErrors
  }
}

const formatAccreditationDatesForSummary = (accreditation = {}) => {
  const startsOnIso = isoDateFromDateInput(accreditation.startsOn)
  const endsOnIso = isoDateFromDateInput(accreditation.endsOn)

  const startsOn = isValidDate(startsOnIso) ? govukDate(startsOnIso) : ''
  const endsOn = isValidDate(endsOnIso) ? govukDate(endsOnIso) : null

  return { startsOn, endsOn }
}

/// ------------------------------------------------------------------------ ///
/// List provider accreditations
/// ------------------------------------------------------------------------ ///

exports.providerAccreditationsList = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1
  const limit = parseInt(req.query.limit, 10) || 50
  const offset = (page - 1) * limit

  // get the providerId from the request for use in subsequent queries
  const { providerId } = req.params

  // get the current provider
  const provider = await Provider.findByPk(providerId)

  // Run in parallel: accreditation flag + last update (by providerId)
  const [isAccredited, lastUpdate] = await Promise.all([
    isAccreditedProvider({ providerId }),
    getProviderLastUpdated(providerId, { includeDeletedChildren: true })
  ])

  // Get the total number of accreditations for pagination metadata
  const totalCount = await ProviderAccreditation.count({
    where: {
      providerId,
      deletedAt: null
    }
  })

  // Only fetch ONE page of accreditations
  const accreditations = await ProviderAccreditation.findAll({
    where: {
      providerId,
      deletedAt: null
    },
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
    provider,
    isAccredited,
    lastUpdate,
    // Accreditations for *this* page
    accreditations: pagination.getData(),
    // The pagination metadata (pageItems, nextPage, etc.)
    pagination,
    actions: {
      new: `/providers/${providerId}/accreditations/new`,
      change: `/providers/${providerId}/accreditations`,
      delete: `/providers/${providerId}/accreditations`
    }
  })
}

/// ------------------------------------------------------------------------ ///
/// Show single provider accreditation
/// ------------------------------------------------------------------------ ///

exports.providerAccreditationDetails = async (req, res) => {
  const { accreditationId } = req.params

  // Clear session accreditation data
  delete req.session.data.accreditation

  const accreditation = await ProviderAccreditation.findByPk(accreditationId, {
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
  const accreditation = req.session.data.accreditation || {
    number: '',
    startsOn: {},
    endsOn: {}
  }
  const { providerId } = req.params
  const provider = await Provider.findByPk(providerId)

  let back = `/providers/${providerId}`
  if (req.query.referrer === 'check') {
    back = `/providers/${providerId}/accreditations/new/check`
  }

  res.render('providers/accreditations/edit', {
    provider,
    accreditation,
    startsOn: normaliseDateValue(accreditation.startsOn),
    endsOn: normaliseDateValue(accreditation.endsOn),
    actions: {
      back,
      cancel: `/providers/${providerId}/accreditations`,
      save: `/providers/${providerId}/accreditations/new`
    }
  })
}

exports.newProviderAccreditation_post = async (req, res) => {
  const accreditation = req.session.data.accreditation || {
    number: '',
    startsOn: {},
    endsOn: {}
  }
  const { providerId } = req.params
  const provider = await Provider.findByPk(providerId)
  const errors = []

  if (!accreditation.number.length) {
    const error = {}
    error.fieldName = "number"
    error.href = "#number"
    error.text = "Enter accredited provider number"
    errors.push(error)
  } else if (!isValidAccreditedProviderNumber(
    accreditation.number,
    provider.type
  )) {
    const error = {}
    const format = provider.type === 'hei' ? '1234' : '5678'
    error.fieldName = "number"
    error.href = "#number"
    error.text = `Enter accredited provider number in the correct format, like ${format}`
    errors.push(error)
  }

  const {
    errors: dateErrors,
    startsOnFieldErrors,
    endsOnFieldErrors
  } = validateAccreditationDates({
    startsOnInput: accreditation.startsOn,
    endsOnInput: accreditation.endsOn
  })

  errors.push(...dateErrors)

  if (errors.length) {
    let back = `/providers/${providerId}`
    if (req.query.referrer === 'check') {
      back = `/providers/${providerId}/accreditations/new/check`
    }

    res.render('providers/accreditations/edit', {
      provider,
      accreditation,
      startsOn: normaliseDateValue(accreditation.startsOn),
      endsOn: normaliseDateValue(accreditation.endsOn),
      startsOnFieldErrors,
      endsOnFieldErrors,
      errors,
      actions: {
        back,
        cancel: `/providers/${providerId}/accreditations`,
        save: `/providers/${providerId}/accreditations/new`
      }
    })
  } else {
    res.redirect(`/providers/${providerId}/accreditations/new/check`)
  }
}

exports.newProviderAccreditationCheck_get = async (req, res) => {
  const accreditation = req.session.data.accreditation || {
    number: '',
    startsOn: {},
    endsOn: {}
  }
  const { providerId } = req.params
  const provider = await Provider.findByPk(providerId)
  const accreditationDates = formatAccreditationDatesForSummary(accreditation)
  res.render('providers/accreditations/check-your-answers', {
    provider,
    accreditation,
    accreditationDates,
    actions: {
      back: `/providers/${providerId}/accreditations/new`,
      cancel: `/providers/${providerId}/accreditations`,
      change: `/providers/${providerId}/accreditations/new`,
      save: `/providers/${providerId}/accreditations/new/check`
    }
  })
}

exports.newProviderAccreditationCheck_post = async (req, res) => {
  const { accreditation } = req.session.data
  const { providerId } = req.params
  const userId = req.user?.id

  if (!userId) {
    throw new Error('User session missing while saving accreditation')
  }

  let startsOn = isoDateFromDateInput(accreditation.startsOn)
  startsOn = new Date(startsOn)

  let endsOn = null
  if (isoDateFromDateInput(accreditation.endsOn) !== 'Invalid DateTime') {
    endsOn =  isoDateFromDateInput(accreditation.endsOn)
    endsOn = new Date(endsOn)
  }

  await ProviderAccreditation.create({
    providerId,
    number: accreditation.number,
    startsOn,
    endsOn,
    createdById: userId,
    updatedById: userId
  })

  delete req.session.data.accreditation

  req.flash('success', 'Accreditation added')
  res.redirect(`/providers/${providerId}/accreditations`)
}

/// ------------------------------------------------------------------------ ///
/// Edit provider accreditation
/// ------------------------------------------------------------------------ ///

exports.editProviderAccreditation_get = async (req, res) => {
  const { accreditationId, providerId } = req.params
  const provider = await Provider.findByPk(providerId)
  const currentAccreditation = await ProviderAccreditation.findByPk(accreditationId)

  let accreditation
  if (req.session.data?.accreditation) {
    accreditation = req.session.data.accreditation
  } else {
    accreditation = await ProviderAccreditation.findByPk(accreditationId)
  }

  let back = `/providers/${providerId}`
  if (req.query.referrer === 'check') {
    back = `/providers/${providerId}/accreditations/${accreditationId}/edit/check`
  }

  const startsOn = normaliseDateValue(accreditation?.startsOn)
  const endsOn = normaliseDateValue(accreditation?.endsOn)

  res.render('providers/accreditations/edit', {
    provider,
    currentAccreditation,
    accreditation,
    startsOn,
    endsOn,
    actions: {
      back,
      cancel: `/providers/${providerId}/accreditations`,
      save: `/providers/${providerId}/accreditations/${accreditationId}/edit`
    }
  })
}

exports.editProviderAccreditation_post = async (req, res) => {
  const { accreditationId, providerId } = req.params
  const { accreditation } = req.session.data
  const provider = await Provider.findByPk(providerId)
  const currentAccreditation = await ProviderAccreditation.findByPk(accreditationId)

  const errors = []

  if (!accreditation.number.length) {
    const error = {}
    error.fieldName = "number"
    error.href = "#number"
    error.text = "Enter accredited provider number"
    errors.push(error)
  }

  const {
    errors: dateErrors,
    startsOnFieldErrors,
    endsOnFieldErrors
  } = validateAccreditationDates({
    startsOnInput: accreditation.startsOn,
    endsOnInput: accreditation.endsOn
  })

  errors.push(...dateErrors)

  if (errors.length) {
    let back = `/providers/${providerId}`
    if (req.query.referrer === 'check') {
      back = `/providers/${providerId}/accreditations/${accreditationId}/edit/check`
    }

    res.render('providers/accreditations/edit', {
      provider,
      currentAccreditation,
      accreditation,
      startsOn: normaliseDateValue(accreditation.startsOn),
      endsOn: normaliseDateValue(accreditation.endsOn),
      startsOnFieldErrors,
      endsOnFieldErrors,
      errors,
      actions: {
        back,
        cancel: `/providers/${providerId}/accreditations`,
        save: `/providers/${providerId}/accreditations/${accreditationId}/edit`
      }
    })
  } else {
    res.redirect(`/providers/${providerId}/accreditations/${accreditationId}/edit/check`)
  }
}

exports.editProviderAccreditationCheck_get = async (req, res) => {
  const { accreditationId, providerId } = req.params
  const { accreditation } = req.session.data
  const provider = await Provider.findByPk(providerId)
  const currentAccreditation = await ProviderAccreditation.findByPk(accreditationId)
  const accreditationDates = formatAccreditationDatesForSummary(accreditation)

  res.render('providers/accreditations/check-your-answers', {
    provider,
    currentAccreditation,
    accreditation,
    accreditationDates,
    actions: {
      back: `/providers/${providerId}/accreditations/${accreditationId}/edit`,
      cancel: `/providers/${providerId}/accreditations`,
      change: `/providers/${providerId}/accreditations/${accreditationId}/edit`,
      save: `/providers/${providerId}/accreditations/${accreditationId}/edit/check`
    }
  })
}

exports.editProviderAccreditationCheck_post = async (req, res) => {
  const { accreditationId, providerId } = req.params
  const { accreditation } = req.session.data
  const userId = req.user?.id

  if (!userId) {
    throw new Error('User session missing while updating accreditation')
  }

  let startsOn = isoDateFromDateInput(accreditation.startsOn)
  startsOn = new Date(startsOn)

  let endsOn = null
  if (isoDateFromDateInput(accreditation.endsOn) !== 'Invalid DateTime') {
    endsOn =  isoDateFromDateInput(accreditation.endsOn)
    endsOn = new Date(endsOn)
  }

  const currentAccreditation = await ProviderAccreditation.findByPk(accreditationId)
  await currentAccreditation.update({
    number: accreditation.number,
    startsOn,
    endsOn,
    updatedById: userId
  })

  delete req.session.data.accreditation

  req.flash('success', 'Accreditation updated')
  res.redirect(`/providers/${providerId}/accreditations`)
}

/// ------------------------------------------------------------------------ ///
/// Delete provider accreditation
/// ------------------------------------------------------------------------ ///

exports.deleteProviderAccreditation_get = async (req, res) => {
  const { accreditationId, providerId } = req.params
  const provider = await Provider.findByPk(providerId)
  const accreditation = await ProviderAccreditation.findByPk(accreditationId)
  res.render('providers/accreditations/delete', {
    provider,
    accreditation,
    actions: {
      back: `/providers/${providerId}/accreditations`,
      cancel: `/providers/${providerId}/accreditations`,
      save: `/providers/${providerId}/accreditations/${accreditationId}/delete`
    }
  })
}

exports.deleteProviderAccreditation_post = async (req, res) => {
  const { accreditationId, providerId } = req.params
  const { user } = req.session.passport
  const accreditation = await ProviderAccreditation.findByPk(accreditationId)
  await accreditation.update({
    deletedAt: new Date(),
    deletedById: user.id,
    updatedById: user.id
  })

  req.flash('success', 'Accreditation deleted')
  res.redirect(`/providers/${providerId}/accreditations`)
}
