exports.userAccount = async (req, res) => {
  // req.user is provided by Passport and contains the authenticated user
  // The user object already has all the properties we need from Sequelize
  res.render('account/show', {
    user: req.user
  })
}
