const { ProviderUser, Provider } = require('../models')

exports.providersList = async (req, res, next) => {
  try {
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

    if (!providerMemberships.length) {
      return res.redirect('/unauthorised')
    }

    if (providerMemberships.length === 1) {
      return res.redirect(`/providers/${providerMemberships[0].providerId}`)
    }

    res.render('providers/list', {
      providers: providerMemberships.map((membership) => ({
        id: membership.provider.id,
        operatingName: membership.provider.operatingName,
        role: membership.role
      })),
      hidePrimaryNavigation: true
    })
  } catch (error) {
    return next(error)
  }
}
