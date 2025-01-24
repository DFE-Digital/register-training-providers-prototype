const { User } = require('../models')

exports.usersList = async (req, res) => {
  const users = await User.findAll()
  res.render('users/index', { users })
}

exports.userDetails = async (req, res) => {
  const user = await User.findOne({ where: { id: req.params.userId } })
  res.render('users/show', { user })
}

exports.newUser_get = async (req, res) => {
  res.send('Not implemented')
}

exports.newUser_post = async (req, res) => {
  res.send('Not implemented')
}

exports.newUserCheck_get = async (req, res) => {
  res.send('Not implemented')
}

exports.newUserCheck_post = async (req, res) => {
  res.send('Not implemented')
}

exports.editUser_get = async (req, res) => {
  res.send('Not implemented')
}

exports.editUser_post = async (req, res) => {
  res.send('Not implemented')
}

exports.editUserCheck_get = async (req, res) => {
  res.send('Not implemented')
}

exports.editUserCheck_post = async (req, res) => {
  res.send('Not implemented')
}

exports.deleteUser_get = async (req, res) => {
  res.send('Not implemented')
}

exports.deleteUser_post = async (req, res) => {
  res.send('Not implemented')
}
