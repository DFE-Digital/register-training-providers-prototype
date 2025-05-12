const { ActivityLog, Provider } = require('../models')

exports.activityList = async (req, res) => {
  // get the providerId from the request for use in subsequent queries
  const { providerId } = req.params

  // get the current provider
  const provider = await Provider.findByPk(providerId)

  res.render('providers/activity/index', {
    provider,
    actions: {

    }
  })
}
