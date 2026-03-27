const { ProviderUser, Provider, UserNotification } = require('../models')

const FREQUENCY_LABELS = {
  daily: 'Once a day',
  weekly: 'Once a week',
  immediate: 'Each time a provider is updated (you may get more than one email a day)',
  never: 'I do not want to receive emails'
}

const CHANGE_LABELS = [
  { field: 'providerDetails', label: 'Provider details' },
  { field: 'providerAccreditations', label: 'Provider accreditations' },
  { field: 'providerAddresses', label: 'Provider addresses' },
  { field: 'providerContacts', label: 'Provider contacts' },
  { field: 'providerPartnerships', label: 'Provider partnerships' },
  { field: 'providerUsers', label: 'Provider users' }
]

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

    let notificationSummary = null

    if (req.user?.type === 'support') {
      const userNotification = await UserNotification.findOne({
        where: {
          userId: req.user.id,
          deletedAt: null
        }
      })

      if (userNotification) {
        const changeLabels = CHANGE_LABELS
          .filter((option) => Boolean(userNotification[option.field]))
          .map((option) => option.label)

        notificationSummary = {
          frequencyLabel: FREQUENCY_LABELS[userNotification.notificationFrequency],
          changeLabels
        }
      }
    }

    res.render('account/show', {
      user: req.user,
      notificationSummary
    })
  } catch (error) {
    return next(error)
  }
}
