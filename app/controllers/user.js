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
  res.render('users/edit', {
    user: req.session.data.user,
    actions: {
      back: '/users',
      cancel: '/users',
      save: '/users/new'
    }
  })
}

exports.newUser_post = async (req, res) => {
  const errors = []

  if (!req.session.data.user.firstName.length) {
    const error = {}
    error.fieldName = 'firstName'
    error.href = '#firstName'
    error.text = 'Enter a first name'
    errors.push(error)
  }

  if (!req.session.data.user.lastName.length) {
    const error = {}
    error.fieldName = 'lastName'
    error.href = '#lastName'
    error.text = 'Enter a last name'
    errors.push(error)
  }

  const users = User.findAll({ where: { email: req.session.data.user.email } })

  if (!req.session.data.user.email.length) {
    const error = {}
    error.fieldName = 'email'
    error.href = '#email'
    error.text = 'Enter an email address'
    errors.push(error)
  // } else if (!validationHelper.isValidEmail(req.session.data.user.email)) {
  //   const error = {}
  //   error.fieldName = 'email'
  //   error.href = '#email'
  //   error.text = 'Enter an email address in the correct format, like name@example.com'
  //   errors.push(error)
  } else if (users.length) {
    const error = {}
    error.fieldName = 'email'
    error.href = '#email'
    error.text = 'Email address already in use'
    errors.push(error)
  }

  if (errors.length) {
    res.render('users/edit', {
      user: req.session.data.user,
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
  res.render('users/check-your-answers', {
    user: req.session.data.user,
    actions: {
      back: `/users/new`,
      cancel: `/users`,
      save: `/users/new/check`
    }
  })
}

exports.newUserCheck_post = async (req, res) => {
  const user = await User.create({
    firstName: req.session.data.user.firstName,
    lastName: req.session.data.user.lastName,
    email: req.session.data.user.email,
    createdById: req.session.passport.user.id,
    updatedById: req.session.passport.user.id
  })

  delete req.session.data.user

  req.flash('success', 'Support user added')
  res.redirect('/users')
}

exports.editUser_get = async (req, res) => {
  const currentUser = await User.findOne({ where: { id: req.params.userId } })

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
      back: `/users/${req.params.userId}`,
      cancel: `/users/${req.params.userId}`,
      save: `/users/${req.params.userId}/edit`
    }
  })
}

exports.editUser_post = async (req, res) => {
  const errors = []

  if (!req.session.data.user.firstName.length) {
    const error = {}
    error.fieldName = 'firstName'
    error.href = '#firstName'
    error.text = 'Enter a first name'
    errors.push(error)
  }

  if (!req.session.data.user.lastName.length) {
    const error = {}
    error.fieldName = 'lastName'
    error.href = '#lastName'
    error.text = 'Enter a last name'
    errors.push(error)
  }

  // const users = User.findAll({ where: { email: req.session.data.user.email } })

  if (!req.session.data.user.email.length) {
    const error = {}
    error.fieldName = 'email'
    error.href = '#email'
    error.text = 'Enter an email address'
    errors.push(error)
  // } else if (!validationHelper.isValidEmail(req.session.data.user.email)) {
  //   const error = {}
  //   error.fieldName = 'email'
  //   error.href = '#email'
  //   error.text = 'Enter an email address in the correct format, like name@example.com'
  //   errors.push(error)
  // } else if (users.length) {
  //   const error = {}
  //   error.fieldName = 'email'
  //   error.href = '#email'
  //   error.text = 'Email address already in use'
  //   errors.push(error)
  }

  if (errors.length) {
    res.render('users/edit', {
      user: req.session.data.user,
      errors,
      actions: {
        back: `/users/${req.params.userId}`,
        cancel: `/users/${req.params.userId}`,
        save: `/users/${req.params.userId}/edit`
      }
    })
  } else {
    res.redirect(`/users/${req.params.userId}/edit/check`)
  }
}

exports.editUserCheck_get = async (req, res) => {
  const currentUser = await User.findOne({ where: { id: req.params.userId } })

  res.render('users/check-your-answers', {
    currentUser,
    user: req.session.data.user,
    actions: {
      back: `/users/${req.params.userId}/edit`,
      cancel: `/users/${req.params.userId}`,
      save: `/users/${req.params.userId}/edit/check`
    }
  })
}

exports.editUserCheck_post = async (req, res) => {
  const user = await User.findOne({ where: { id: req.params.userId } })
  user.update({
    firstName: req.session.data.user.firstName,
    lastName: req.session.data.user.lastName,
    email: req.session.data.user.email,
    updatedById: req.session.passport.user.id
  })

  delete req.session.data.user

  req.flash('success', 'Support user updated')
  res.redirect(`/users/${req.params.userId}`)
}

exports.deleteUser_get = async (req, res) => {
  const user = await User.findOne({ where: { id: req.params.userId } })
  res.render('users/delete', { user })
}

exports.deleteUser_post = async (req, res) => {
  const user = await User.findOne({ where: { id: req.params.userId } })
  user.destroy()

  req.flash('success', 'Support user removed')
  res.redirect('/users')
}
