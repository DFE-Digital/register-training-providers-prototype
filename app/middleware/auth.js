const { ProviderUser, Provider } = require('../models')

const loadProviderMemberships = async (userId) => (
  ProviderUser.findAll({
    where: {
      userId,
      deletedAt: null,
      isActive: true
    },
    include: [
      {
        model: Provider,
        as: 'provider',
        where: {
          deletedAt: null
        },
        required: true
      }
    ],
    order: [[{ model: Provider, as: 'provider' }, 'operatingName', 'ASC']]
  })
)

const checkIsAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    if (!req.user.isActive) {
      return res.redirect('/account-not-authorised')
    }

    const isSupportUser = req.user.type === 'support'
    const isProviderUser = req.user.type === 'provider'

    // Set base URLs for navigation
    if (req.params.providerId) {
      const providerRoot = isSupportUser ? '/support/providers' : '/providers'
      res.locals.providerBaseUrl = `${providerRoot}/${req.params.providerId}`
      res.locals.supportBaseUrl = `/support/providers/${req.params.providerId}`
    }
    res.locals.providerListUrl = isSupportUser ? '/support/providers' : '/providers'

    // Make user available in templates
    res.locals.passport = {
      user: {
        id: req.user.id,
        first_name: req.user.firstName,
        last_name: req.user.lastName,
        email: req.user.email,
        isApiUser: req.user.isApiUser,
        type: req.user.type
      }
    }
    res.locals.currentUser = {
      id: req.user.id,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      email: req.user.email,
      isApiUser: req.user.isApiUser,
      type: req.user.type
    }
    res.locals.isApiUser = req.user.isApiUser
    res.locals.isSupportUser = isSupportUser
    res.locals.isProviderUser = isProviderUser
    return next()
  }

  // Save the original URL to redirect after login
  req.session.returnTo = req.originalUrl
  res.redirect('/auth/sign-in')
}

const checkIsSupportUser = (req, res, next) => {
  if (req.user?.type !== 'support') {
    return res.redirect('/unauthorised')
  }

  return next()
}

const checkIsProviderUser = (req, res, next) => {
  if (req.user?.type !== 'provider') {
    return res.redirect('/unauthorised')
  }

  return next()
}

const checkProviderAccess = async (req, res, next) => {
  try {
    const { providerId } = req.params

    if (!providerId) {
      return res.redirect('/unauthorised')
    }

    const providerMemberships = await loadProviderMemberships(req.user.id)
    const currentMembership = providerMemberships.find((membership) => membership.providerId === providerId)

    if (!currentMembership) {
      return res.redirect('/unauthorised')
    }

    res.locals.providerMemberships = providerMemberships.map((membership) => ({
      id: membership.provider.id,
      operatingName: membership.provider.operatingName,
      role: membership.role
    }))
    res.locals.hasMultipleProviders = providerMemberships.length > 1
    res.locals.currentProvider = currentMembership.provider
    res.locals.providerUserRole = currentMembership.role

    req.session.currentProviderId = currentMembership.provider.id

    return next()
  } catch (error) {
    return next(error)
  }
}

const checkProviderAdmin = (req, res, next) => {
  if (res.locals.providerUserRole !== 'admin') {
    return res.redirect('/unauthorised')
  }

  return next()
}

module.exports = {
  checkIsAuthenticated,
  checkIsSupportUser,
  checkIsProviderUser,
  checkProviderAccess,
  checkProviderAdmin
}
