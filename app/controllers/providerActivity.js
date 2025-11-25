const { getProviderActivityLogs, getProviderActivityTotalCount } = require('../helpers/activityLog')
const { getProviderLastUpdated } = require('../helpers/activityLog')
const { isAccreditedProvider } = require('../helpers/accreditation')
const { Provider } = require('../models')
const Pagination = require('../helpers/pagination')

exports.activityList = async (req, res) => {
  // get the providerId from the request for use in subsequent queries
  const { providerId } = req.params

  // get the current provider
  const provider = await Provider.findByPk(providerId)

  // Run in parallel: accreditation flag + last update (by providerId)
  const [isAccredited, lastUpdate] = await Promise.all([
    isAccreditedProvider({ providerId }),
    getProviderLastUpdated(providerId, { includeDeletedChildren: true })
  ])

  // variables for use in pagination
  const page = parseInt(req.query.page, 10) || 1
  const limit = parseInt(req.query.limit, 10) || 15
  const offset = (page - 1) * limit

  // Get the total amount of activity for pagination metadata
  const totalCount = await getProviderActivityTotalCount({ providerId })

  const activityItems = await getProviderActivityLogs({ providerId, limit, offset })

  // create the Pagination object
  // using the chunk + the overall total count
  const pagination = new Pagination(activityItems, totalCount, page, limit)

  res.render('providers/activity/index', {
    provider,
    isAccredited,
    lastUpdate,
    activityItems: pagination.getData(),
    pagination,
    actions: {

    }
  })
}
