const { ActivityLog } = require('../models')
const { getActivityLogs } = require('../helpers/activityLog')
const Pagination = require('../helpers/pagination')

exports.activityList = async (req, res) => {
  // variables for use in pagination
  const page = parseInt(req.query.page, 10) || 1
  const limit = parseInt(req.query.limit, 10) || 25
  const offset = (page - 1) * limit

  // Get the total amount of activity for pagination metadata
  const totalCount = await ActivityLog.count()

  const activityItems = await getActivityLogs({ limit, offset })

  // create the Pagination object
  // using the chunk + the overall total count
  const pagination = new Pagination(activityItems, totalCount, page, limit)

  res.render('activity/index', {
    activityItems: pagination.getData(),
    pagination,
    actions: {

    }
  })
}
