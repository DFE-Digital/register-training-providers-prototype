const { ProviderUser, Provider } = require('../models')

exports.userAccount = async (req, res, next) => {
  try {
    // req.user is provided by Passport and contains the authenticated user
    // The user object already has all the properties we need from Sequelize
    if (req.user?.type === 'provider') {
      let currentProviderId = req.session?.currentProviderId

      if (!currentProviderId && req.session?.returnTo) {
        const match = req.session.returnTo.match(/^\/providers\/([^/]+)/)
        if (match) {
          currentProviderId = match[1]
        }
      }

      const providerMemberships = await ProviderUser.findAll({
        where: {
          userId: req.user.id,
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

      const currentMembership = currentProviderId
        ? providerMemberships.find((membership) => membership.providerId === currentProviderId)
        : providerMemberships[0]

      if (currentMembership) {
        res.locals.providerBaseUrl = `/providers/${currentMembership.providerId}`
        res.locals.providerListUrl = '/providers'
        res.locals.currentProvider = currentMembership.provider
        res.locals.providerUserRole = currentMembership.role
        res.locals.hasMultipleProviders = providerMemberships.length > 1
      }
    }

    res.render('account/show', {
      user: req.user
    })
  } catch (error) {
    return next(error)
  }
}
