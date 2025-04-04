const { User } = require('../models')

exports.userAccount = async (req, res) => {
  const { user } = req.session.passport
  const accountUser = await User.findByPk(user.id)
  res.render('account/show', { user: accountUser })
}
