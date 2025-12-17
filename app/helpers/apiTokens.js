const crypto = require('crypto')

const ENV_PREFIX = process.env.NODE_ENV || 'development'

const getTokenSecret = () => {
  const secret = process.env.API_CLIENT_TOKEN_SECRET
  if (!secret) {
    throw new Error('API_CLIENT_TOKEN_SECRET is not set')
  }
  return secret
}

const hashToken = (token) => {
  return crypto.createHmac('sha256', getTokenSecret()).update(token).digest('hex')
}

const generatePlainToken = () => `${ENV_PREFIX}_${crypto.randomBytes(32).toString('hex')}`

module.exports = {
  hashToken,
  generatePlainToken
}
