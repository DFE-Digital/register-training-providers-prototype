const { ActivityLog } = require('../models')

exports.activityList = async (req, res) => {
  res.render('activity/index', {
    actions: {

    }
  })
}
