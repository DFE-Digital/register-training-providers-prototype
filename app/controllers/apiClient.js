const crypto = require('crypto')

const { ApiClientToken } = require('../models')
const Pagination = require('../helpers/pagination')
const { govukDate, isoDateFromDateInput } = require('../helpers/date')
const { validateDateInput, getDateParts, todayUTC } = require('../helpers/validation/date')

const TOKEN_SECRET = process.env.API_CLIENT_TOKEN_SECRET
const ENV_PREFIX = process.env.NODE_ENV || 'development'

const ensureApiClientTokenSession = (req) => {
  if (!req.session.data.apiClientToken) {
    req.session.data.apiClientToken = {
      clientName: '',
      expiresOn: {}
    }
  } else if (!req.session.data.apiClientToken.expiresOn) {
    req.session.data.apiClientToken.expiresOn = {}
  }
  return req.session.data.apiClientToken
}

const validateExpiryDate = (expiresOn) => {
  const today = todayUTC()
  const maxExpiry = new Date(Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth() + 12,
    today.getUTCDate()
  ))

  const result = validateDateInput(getDateParts(expiresOn), {
    label: 'expiry date',
    baseId: 'expiresOn',
    constraint: { between: [today, maxExpiry] }
  })

  return result
}

const generatePlainToken = () =>
  `${ENV_PREFIX}_${crypto.randomBytes(32).toString('hex')}`

const hashToken = (token) => {
  if (!TOKEN_SECRET) {
    throw new Error('API_CLIENT_TOKEN_SECRET is not set')
  }
  return crypto.createHmac('sha256', TOKEN_SECRET).update(token).digest('hex')
}

/// ------------------------------------------------------------------------ ///
/// List API client tokens
/// ------------------------------------------------------------------------ ///

exports.apiClientList = async (req, res) => {
  // clear any stale session state for this flow
  delete req.session.data.apiClientToken

  const page = parseInt(req.query.page, 10) || 1
  const limit = parseInt(req.query.limit, 10) || 15
  const offset = (page - 1) * limit

  const totalCount = await ApiClientToken.count({ where: { deletedAt: null } })

  const apiClientTokens = await ApiClientToken.findAll({
    where: { deletedAt: null },
    order: [['clientName', 'ASC']],
    limit,
    offset
  })

  const pagination = new Pagination(apiClientTokens, totalCount, page, limit)

  const items = pagination.getData().map(token => ({
    id: token.id,
    clientName: token.clientName,
    expiresAt: token.expiresAt,
    expiresOn: token.expiresAt ? govukDate(token.expiresAt) : null,
    status: token.status
  }))

  res.render('api-clients/index', {
    apiClientTokens: items,
    pagination,
    actions: {
      new: '/api-clients/new'
    }
  })
}

/// ------------------------------------------------------------------------ ///
/// New API client token - details
/// ------------------------------------------------------------------------ ///

exports.newApiClientToken_get = async (req, res) => {
  const apiClientToken = ensureApiClientTokenSession(req)

  res.render('api-clients/edit', {
    apiClientToken,
    errors: [],
    actions: {
      back: '/api-clients',
      cancel: '/api-clients',
      save: '/api-clients/new'
    }
  })
}

exports.newApiClientToken_post = async (req, res) => {
  const apiClientToken = ensureApiClientTokenSession(req)
  const errors = []
  let expiresOnFieldErrors = null
  let expiresOnIso = null

  if (!apiClientToken.clientName?.trim().length) {
    errors.push({
      fieldName: 'clientName',
      href: '#clientName',
      text: 'Enter client name'
    })
  }

  const expiresOnResult = validateExpiryDate(apiClientToken.expiresOn)
  if (!expiresOnResult.valid) {
    errors.push(expiresOnResult.summaryError)
    expiresOnFieldErrors = expiresOnResult.fieldFlags || null
  } else {
    expiresOnIso = expiresOnResult.iso
  }

  if (errors.length) {
    res.render('api-clients/edit', {
      apiClientToken,
      errors,
      expiresOnFieldErrors,
      actions: {
        back: '/api-clients',
        cancel: '/api-clients',
        save: '/api-clients/new'
      }
    })
    return
  }

  req.session.data.apiClientToken.expiresOnIso = expiresOnIso
  res.redirect('/api-clients/new/check')
}

/// ------------------------------------------------------------------------ ///
/// New API client token - check answers
/// ------------------------------------------------------------------------ ///

exports.newApiClientTokenCheck_get = async (req, res) => {
  const apiClientToken = ensureApiClientTokenSession(req)
  const expiresOnIso = apiClientToken.expiresOnIso || isoDateFromDateInput(apiClientToken.expiresOn)

  if (!apiClientToken.clientName || !expiresOnIso) {
    return res.redirect('/api-clients/new')
  }

  res.render('api-clients/check-your-answers', {
    apiClientToken,
    expiresOn: govukDate(expiresOnIso),
    actions: {
      back: '/api-clients/new',
      cancel: '/api-clients',
      change: '/api-clients/new',
      save: '/api-clients/new/check'
    }
  })
}

exports.newApiClientTokenCheck_post = async (req, res) => {
  const apiClientToken = ensureApiClientTokenSession(req)
  const expiresOnIso = apiClientToken.expiresOnIso || isoDateFromDateInput(apiClientToken.expiresOn)

  if (!apiClientToken.clientName || !expiresOnIso) {
    return res.redirect('/api-clients/new')
  }

  const plainToken = generatePlainToken()
  const tokenHash = hashToken(plainToken)

  await ApiClientToken.create({
    clientName: apiClientToken.clientName.trim(),
    tokenHash,
    status: 'active',
    expiresAt: expiresOnIso,
    createdById: req.user.id,
    updatedById: req.user.id
  })

  req.session.data.apiClientTokenGenerated = {
    clientName: apiClientToken.clientName,
    plainToken
  }

  delete req.session.data.apiClientToken

  res.redirect('/api-clients/new/confirmation')
}

/// ------------------------------------------------------------------------ ///
/// New API client token - confirmation
/// ------------------------------------------------------------------------ ///

exports.newApiClientTokenConfirmation_get = async (req, res) => {
  const confirmation = req.session.data.apiClientTokenGenerated

  if (!confirmation?.plainToken) {
    return res.redirect('/api-clients')
  }

  const { clientName, plainToken } = confirmation

  // Clear stored token so it cannot be viewed again
  delete req.session.data.apiClientTokenGenerated

  res.render('api-clients/confirmation', {
    clientName,
    plainToken,
    actions: {
      back: '/api-clients',
      finish: '/api-clients'
    }
  })
}
