const { User } = require('../models')

exports.index = async (req, res) => {
  const users = await User.findAll()
  res.render('users/index', { users })
}
