const { Op } = require('sequelize')

const { ApiClientToken } = require('../models')
const { hashToken } = require('../helpers/apiTokens')

/**
 * Express middleware to validate a bearer token for API access.
 * Looks up an active, non-revoked, non-expired token and attaches the
 * api client details to the request when valid.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<import('express').Response|void>}
 */
module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization || ''
  const match = authHeader.match(/^Bearer\s+(.+)$/i)

  if (!match || !match[1]) {
    return res.status(401).json({
      status: 401,
      title: 'Unauthorized',
      details: 'Missing or invalid Authorization header'
    })
  }

  const token = match[1].trim()

  let tokenHash
  try {
    tokenHash = hashToken(token)
  } catch (error) {
    return res.status(500).json({
      status: 500,
      title: 'Internal Server Error',
      details: 'API token secret is not configured'
    })
  }

  try {
    const now = new Date()
    const apiClientToken = await ApiClientToken.findOne({
      where: {
        tokenHash,
        status: 'active',
        revokedAt: null,
        deletedAt: null,
        expiresAt: {
          [Op.gte]: now
        }
      }
    })

    if (!apiClientToken) {
      return res.status(403).json({
        status: 403,
        title: 'Forbidden',
        details: 'Invalid, expired, or revoked token' })
    }

    req.apiClient = {
      id: apiClientToken.id,
      clientName: apiClientToken.clientName
    }

    return next()
  } catch (error) {
    return res.status(500).json({
      status: 500,
      title: 'Internal Server Error',
      details: 'Unable to validate API token'
    })
  }
}
