const Pagination = require('../helpers/pagination')
const { isValidEmail, isValidEducationEmail } = require('../helpers/validation')
const { User } = require('../models')

const { Op } = require('sequelize')

exports.usersList = async (req, res) => {
  // clear session data
  delete req.session.data.user

  // variables for use in pagination
  const page = parseInt(req.query.page, 10) || 1
  const limit = parseInt(req.query.limit, 10) || 25
  const offset = (page - 1) * limit

  // Get the total number of providers for pagination metadata
  const totalCount = await User.count({ where: { deletedAt: null } })

  // Only fetch ONE page of users
  const users = await User.findAll({
    where: { 'deletedAt': null },
    order: [['firstName', 'ASC'],['lastName', 'ASC']],
    limit,
    offset
  })

  // create the Pagination object
  // using the chunk + the overall total count
  const pagination = new Pagination(users, totalCount, page, limit)

  res.render('users/index', {
    // users for *this* page
    users: pagination.getData(),
    // the pagination metadata (pageItems, nextPage, etc.)
    pagination,
    actions: {
      new: '/users/new/',
      view: '/users',
      filters: {
        apply: '/users',
        remove: '/users/remove-all-filters'
      },
      search: {
        find: '/users',
        remove: '/users/remove-keyword-search'
      }
    }
  })
}

exports.userDetails = async (req, res) => {
  delete req.session.data.user

  const user = await User.findOne({ where: { id: req.params.userId } })
  const showDeleteLink = !(req.params.userId === req.session.passport.user.id)

  res.render('users/show', {
    user,
    showDeleteLink,
    actions: {
      back: '/users',
      change: `/users/${user.id}/edit`,
      delete: `/users/${user.id}/delete`
    }
  })
}

exports.newUser_get = async (req, res) => {
  const { user } = req.session.data
  res.render('users/edit', {
    user,
    actions: {
      back: '/users',
      cancel: '/users',
      save: '/users/new'
    }
  })
}

exports.newUser_post = async (req, res) => {
  const { user } = req.session.data
  const errors = []

  if (!user.firstName.length) {
    const error = {}
    error.fieldName = 'firstName'
    error.href = '#firstName'
    error.text = 'Enter first name'
    errors.push(error)
  }

  if (!user.lastName.length) {
    const error = {}
    error.fieldName = 'lastName'
    error.href = '#lastName'
    error.text = 'Enter last name'
    errors.push(error)
  }

  const whereClause = {
    [Op.and]: [
      { email: user.email },
      { deletedAt: null }
    ]
  }

  const userCount = await User.count({ where: whereClause })

  const isValidEmailAddress = !!(
    isValidEmail(user.email) &&
    isValidEducationEmail(user.email)
  )

  if (!user.email.length) {
    const error = {}
    error.fieldName = 'email'
    error.href = '#email'
    error.text = 'Enter email address'
    errors.push(error)
  } else if (!isValidEmailAddress) {
    const error = {}
    error.fieldName = 'email'
    error.href = '#email'
    error.text = 'Enter a Department for Education email address in the correct format, like name@education.gov.uk'
    errors.push(error)
  } else if (userCount) {
    const error = {}
    error.fieldName = 'email'
    error.href = '#email'
    error.text = 'Email address already in use'
    errors.push(error)
  }

  if (errors.length) {
    res.render('users/edit', {
      user,
      errors,
      actions: {
        back: '/users',
        cancel: '/users',
        save: '/users/new'
      }
    })
  } else {
    res.redirect('/users/new/check')
  }
}

exports.newUserCheck_get = async (req, res) => {
  const { user } = req.session.data
  res.render('users/check-your-answers', {
    user,
    actions: {
      back: `/users/new`,
      cancel: `/users`,
      change: `/users/new`,
      save: `/users/new/check`
    }
  })
}

exports.newUserCheck_post = async (req, res) => {
  const { user } = req.session.data
  await User.create({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    createdById: req.session.passport.user.id,
    updatedById: req.session.passport.user.id
  })

  delete req.session.data.user

  req.flash('success', 'Support user added')
  res.redirect('/users')
}

exports.editUser_get = async (req, res) => {
  const { userId } = req.params
  const currentUser = await User.findByPk(userId)

  let user
  if (req.session.data.user) {
    user = req.session.data.user
  } else {
    user = currentUser
  }

  res.render('users/edit', {
    currentUser,
    user,
    actions: {
      back: `/users/${userId}`,
      cancel: `/users/${userId}`,
      save: `/users/${userId}/edit`
    }
  })
}

exports.editUser_post = async (req, res) => {
  const { userId } = req.params
  const { user } = req.session.data
  const currentUser = await User.findByPk(userId)
  const errors = []

  if (!user.firstName.length) {
    const error = {}
    error.fieldName = 'firstName'
    error.href = '#firstName'
    error.text = 'Enter first name'
    errors.push(error)
  }

  if (!user.lastName.length) {
    const error = {}
    error.fieldName = 'lastName'
    error.href = '#lastName'
    error.text = 'Enter last name'
    errors.push(error)
  }

  let userCount = 0

  // check if the email already exists if it's not the current user's
  if (currentUser.email.toLowerCase() !== user.email.trim().toLowerCase()) {
    const whereClause = {
      [Op.and]: [
        { email: user.email },
        { deletedAt: null }
      ]
    }
    userCount = await User.count({ where: whereClause })
  }

  const isValidEmailAddress = !!(
    isValidEmail(user.email) &&
    isValidEducationEmail(user.email)
  )

  if (!user.email.length) {
    const error = {}
    error.fieldName = 'email'
    error.href = '#email'
    error.text = 'Enter email address'
    errors.push(error)
  } else if (!isValidEmailAddress) {
    const error = {}
    error.fieldName = 'email'
    error.href = '#email'
    error.text = 'Enter a Department for Education email address in the correct format, like name@education.gov.uk'
    errors.push(error)
  } else if (userCount) {
    const error = {}
    error.fieldName = 'email'
    error.href = '#email'
    error.text = 'Email address already in use'
    errors.push(error)
  }

  if (errors.length) {
    res.render('users/edit', {
      currentUser,
      user,
      errors,
      actions: {
        back: `/users/${userId}`,
        cancel: `/users/${userId}`,
        save: `/users/${userId}/edit`
      }
    })
  } else {
    res.redirect(`/users/${userId}/edit/check`)
  }
}

exports.editUserCheck_get = async (req, res) => {
  const { userId } = req.params
  const { user } = req.session.data

  const currentUser = await User.findByPk(userId)

  res.render('users/check-your-answers', {
    currentUser,
    user,
    actions: {
      back: `/users/${userId}/edit`,
      cancel: `/users/${userId}`,
      change: `/users/${userId}/edit`,
      save: `/users/${userId}/edit/check`
    }
  })
}

exports.editUserCheck_post = async (req, res) => {
  const { userId } = req.params
  const { user } = req.session.data
  const currentUser = await User.findByPk(userId)

  currentUser.update({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    updatedById: req.session.passport.user.id
  })

  delete req.session.data.user

  req.flash('success', 'Support user updated')
  res.redirect(`/users/${userId}`)
}

exports.deleteUser_get = async (req, res) => {
  const { userId } = req.params
  const user = await User.findByPk(userId)
  res.render('users/delete', {
    user,
    actions: {
      back: `/users/${userId}`,
      cancel: `/users/${userId}`,
      delete: `/users/${userId}/delete`
    }
  })
}

exports.deleteUser_post = async (req, res) => {
  const { userId } = req.params
  const user = await User.findByPk(userId)
  await user.update({
    deletedAt: new Date(),
    deletedById: req.session.passport.user.id,
    updatedById: req.session.passport.user.id
  })

  req.flash('success', 'Support user deleted')
  res.redirect('/users')
}
