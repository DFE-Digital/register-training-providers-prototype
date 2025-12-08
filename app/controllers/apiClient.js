const { ApiClientToken } = require('../models')
const Pagination = require('../helpers/pagination')
const { govukDate } = require('../helpers/date')

/// ------------------------------------------------------------------------ ///
/// List API client tokens
/// ------------------------------------------------------------------------ ///

exports.apiClientList = async (req, res) => {
  // clear any stale session state for this flow
  delete req.session.data.apiClientToken

  const page = parseInt(req.query.page, 10) || 1
  const limit = parseInt(req.query.limit, 10) || 15
  const offset = (page - 1) * limit

  const totalCount = await ApiClientToken.count({ where: { deletedAt: null } })

  const apiClientTokens = await ApiClientToken.findAll({
    where: { deletedAt: null },
    order: [['clientName', 'ASC']],
    limit,
    offset
  })

  const pagination = new Pagination(apiClientTokens, totalCount, page, limit)

  const items = pagination.getData().map(token => ({
    id: token.id,
    clientName: token.clientName,
    expiresAt: token.expiresAt,
    expiresOn: token.expiresAt ? govukDate(token.expiresAt) : null,
    status: token.status
  }))

  res.render('api-clients/index', {
    apiClientTokens: items,
    pagination,
    actions: {
      new: '/api-clients/new'
    }
  })
}
