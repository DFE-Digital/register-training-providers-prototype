const { Op } = require('sequelize')

const { ApiClientToken } = require('../models')
const { hashToken } = require('../helpers/apiTokens')

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization || ''
  const match = authHeader.match(/^Bearer\\s+(.+)$/i)

  if (!match || !match[1]) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' })
  }

  const token = match[1].trim()

  let tokenHash
  try {
    tokenHash = hashToken(token)
  } catch (error) {
    return res.status(500).json({ error: 'API token secret is not configured' })
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
      return res.status(403).json({ error: 'Invalid, expired, or revoked token' })
    }

    req.apiClient = {
      id: apiClientToken.id,
      clientName: apiClientToken.clientName
    }

    return next()
  } catch (error) {
    return res.status(500).json({ error: 'Unable to validate API token' })
  }
}
