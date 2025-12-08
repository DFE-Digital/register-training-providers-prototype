const crypto = require('crypto')

const { ApiClientToken } = require('../models')
const Pagination = require('../helpers/pagination')
const { govukDate } = require('../helpers/date')
const { validateDateInput, getDateParts, todayUTC } = require('../helpers/validation/date')

const TOKEN_SECRET = process.env.API_CLIENT_TOKEN_SECRET
const ENV_PREFIX = process.env.NODE_ENV || 'development'

const ensureApiClientTokenSession = (req, key = 'apiClientToken') => {
  if (!req.session.data[key]) {
    req.session.data[key] = {
      clientName: '',
      expiresOn: {}
    }
  } else if (!req.session.data[key].expiresOn) {
    req.session.data[key].expiresOn = {}
  }
  return req.session.data[key]
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

const loadApiClientTokenOrRedirect = async (apiClientId, res) => {
  const token = await ApiClientToken.findOne({
    where: { id: apiClientId, deletedAt: null }
  })
  if (!token) {
    res.redirect('/api-clients')
    return null
  }
  return token
}

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

/// ------------------------------------------------------------------------ ///
/// List API client tokens
/// ------------------------------------------------------------------------ ///

exports.apiClientList = async (req, res) => {
  // clear any stale session state for this flow
  delete req.session.data.apiClientToken
  delete req.session.data.apiClientTokenEdit

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
      new: '/api-clients/new',
      view: '/api-clients'
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

  const formData = req.body.apiClientToken || {}
  apiClientToken.clientName = formData.clientName || ''
  apiClientToken.expiresOn = formData.expiresOn || {}

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
  const expiresOnIso = apiClientToken.expiresOnIso

  if (!apiClientToken.clientName || !expiresOnIso) {
    return res.redirect('/api-clients/new')
  }

  res.render('api-clients/check-your-answers', {
    apiClientToken,
    expiresOn: govukDate(expiresOnIso),
    title: 'Check your answers',
    caption: 'Add API client',
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
  const expiresOnIso = apiClientToken.expiresOnIso

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

/// ------------------------------------------------------------------------ ///
/// Edit API client token - details
/// ------------------------------------------------------------------------ ///

exports.editApiClientToken_get = async (req, res) => {
  const sessionKey = 'apiClientTokenEdit'
  const currentApiClientToken = await loadApiClientTokenOrRedirect(req.params.apiClientId, res)
  if (!currentApiClientToken) return

  if (currentApiClientToken.status === 'revoked') {
    req.flash('warning', 'You cannot edit a revoked API client')
    return res.redirect(`/api-clients/${currentApiClientToken.id}`)
  }

  let apiClientToken = ensureApiClientTokenSession(req, sessionKey)

  // Seed session from current DB values when first landing or switching records.
  if (apiClientToken.id !== currentApiClientToken.id) {
    apiClientToken = req.session.data[sessionKey] = {
      id: currentApiClientToken.id,
      clientName: currentApiClientToken.clientName,
      expiresOn: formatDateForInput(currentApiClientToken.expiresAt),
      expiresOnIso: currentApiClientToken.expiresAt ? currentApiClientToken.expiresAt.toISOString().slice(0, 10) : null
    }
  }

  res.render('api-clients/edit', {
    apiClientToken,
    currentApiClientToken,
    errors: [],
    actions: {
      back: '/api-clients',
      cancel: '/api-clients',
      save: `/api-clients/${req.params.apiClientId}/edit`
    }
  })
}

exports.editApiClientToken_post = async (req, res) => {
  const sessionKey = 'apiClientTokenEdit'
  const currentApiClientToken = await loadApiClientTokenOrRedirect(req.params.apiClientId, res)
  if (!currentApiClientToken) return

  let apiClientToken = ensureApiClientTokenSession(req, sessionKey)
  if (apiClientToken.id !== currentApiClientToken.id) {
    apiClientToken = req.session.data[sessionKey] = {
      id: currentApiClientToken.id,
      clientName: currentApiClientToken.clientName,
      expiresOn: formatDateForInput(currentApiClientToken.expiresAt),
      expiresOnIso: currentApiClientToken.expiresAt ? currentApiClientToken.expiresAt.toISOString().slice(0, 10) : null
    }
  }
  const errors = []
  let expiresOnFieldErrors = null
  let expiresOnIso = null

  const formData = req.body.apiClientToken || {}
  apiClientToken.clientName = formData.clientName || ''
  apiClientToken.expiresOn = formData.expiresOn || {}

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
      currentApiClientToken,
      errors,
      expiresOnFieldErrors,
      actions: {
        back: '/api-clients',
        cancel: '/api-clients',
        save: `/api-clients/${req.params.apiClientId}/edit`
      }
    })
    return
  }

  req.session.data[sessionKey].expiresOnIso = expiresOnIso
  res.redirect(`/api-clients/${req.params.apiClientId}/check`)
}

/// ------------------------------------------------------------------------ ///
/// Edit API client token - check answers
/// ------------------------------------------------------------------------ ///

exports.editApiClientTokenCheck_get = async (req, res) => {
  const sessionKey = 'apiClientTokenEdit'
  const apiClientToken = ensureApiClientTokenSession(req, sessionKey)
  const currentApiClientToken = await loadApiClientTokenOrRedirect(req.params.apiClientId, res)
  if (!currentApiClientToken) return

  if (apiClientToken.id !== req.params.apiClientId) {
    return res.redirect(`/api-clients/${req.params.apiClientId}/edit`)
  }

  const expiresOnIso = apiClientToken.expiresOnIso

  if (!apiClientToken.clientName || !expiresOnIso) {
    return res.redirect(`/api-clients/${req.params.apiClientId}/edit`)
  }

  res.render('api-clients/check-your-answers', {
    apiClientToken,
    expiresOn: govukDate(expiresOnIso),
    currentApiClientToken,
    actions: {
      back: `/api-clients/${req.params.apiClientId}/edit`,
      cancel: '/api-clients',
      change: `/api-clients/${req.params.apiClientId}/edit`,
      save: `/api-clients/${req.params.apiClientId}/check`
    }
  })
}

exports.editApiClientTokenCheck_post = async (req, res) => {
  const sessionKey = 'apiClientTokenEdit'
  const apiClientToken = ensureApiClientTokenSession(req, sessionKey)

  if (apiClientToken.id !== req.params.apiClientId || !apiClientToken.expiresOnIso || !apiClientToken.clientName) {
    return res.redirect(`/api-clients/${req.params.apiClientId}/edit`)
  }

  const token = await loadApiClientTokenOrRedirect(req.params.apiClientId, res)
  if (!token) return

  await token.update({
    clientName: apiClientToken.clientName.trim(),
    expiresAt: apiClientToken.expiresOnIso,
    updatedById: req.user.id
  })

  delete req.session.data[sessionKey]

  req.flash('success', 'API client updated')
  res.redirect(`/api-clients/${req.params.apiClientId}`)
}

/// ------------------------------------------------------------------------ ///
/// Revoke API client token
/// ------------------------------------------------------------------------ ///

exports.revokeApiClientTokenCheck_get = async (req, res) => {
  const apiClientToken = await loadApiClientTokenOrRedirect(req.params.apiClientId, res)
  if (!apiClientToken) return

  res.render('api-clients/revoke', {
    apiClientToken,
    actions: {
      back: `/api-clients/${apiClientToken.id}`,
      cancel: `/api-clients/${apiClientToken.id}`,
      revoke: `/api-clients/${apiClientToken.id}/revoke`
    }
  })
}

exports.revokeApiClientTokenCheck_post = async (req, res) => {
  const apiClientToken = await loadApiClientTokenOrRedirect(req.params.apiClientId, res)
  if (!apiClientToken) return

  await apiClientToken.update({
    status: 'revoked',
    revokedAt: new Date(),
    revokedById: req.user.id,
    updatedById: req.user.id
  })

  req.flash('success', 'API client revoked')
  res.redirect(`/api-clients/${apiClientToken.id}`)
}

/// ------------------------------------------------------------------------ ///
/// Show API client token
/// ------------------------------------------------------------------------ ///

exports.apiClientTokenDetails = async (req, res) => {
  const token = await loadApiClientTokenOrRedirect(req.params.apiClientId, res)
  if (!token) return

  res.render('api-clients/show', {
    apiClientToken: {
      id: token.id,
      clientName: token.clientName,
      expiresOn: token.expiresAt ? govukDate(token.expiresAt) : null,
      status: token.status,
      revokedAt: token.revokedAt
    },
    isRevoked: token.status === 'revoked',
    actions: {
      back: '/api-clients',
      change: token.status === 'revoked' ? null : `/api-clients/${token.id}/edit`,
      revoke: token.status === 'revoked' ? null : `/api-clients/${token.id}/revoke`,
      delete: `/api-clients/${token.id}/delete`
    }
  })
}
