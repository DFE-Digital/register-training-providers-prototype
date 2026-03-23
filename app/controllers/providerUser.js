const bcrypt = require('bcrypt')
const Pagination = require('../helpers/pagination')
const { getProviderLastUpdated } = require('../helpers/activityLog')
const { isAccreditedProvider } = require('../helpers/accreditation')
const { isValidEmail } = require('../helpers/validation')
const { Provider, ProviderUser, User, Sequelize } = require('../models')

const { Op } = require('sequelize')

const normalizeEmail = (value) => (value ? value.trim() : '')

const findActiveUserByEmail = async (email) => {
  if (!email) return null
  const normalizedEmail = email.toLowerCase()
  return User.findOne({
    where: {
      deletedAt: null,
      [Op.and]: [
        Sequelize.where(
          Sequelize.fn('lower', Sequelize.col('email')),
          normalizedEmail
        )
      ]
    }
  })
}

const findProviderUserByEmail = async (providerId, email, options = {}) => {
  if (!email) return null
  const normalizedEmail = email.toLowerCase()
  const whereClause = {
    providerId,
    deletedAt: null
  }

  if (options.excludeUserId) {
    whereClause.userId = { [Op.ne]: options.excludeUserId }
  }

  return ProviderUser.findOne({
    where: whereClause,
    include: [
      {
        model: User,
        as: 'user',
        required: true,
        where: {
          deletedAt: null,
          [Op.and]: [
            Sequelize.where(
              Sequelize.fn('lower', Sequelize.col('email')),
              normalizedEmail
            )
          ]
        }
      }
    ]
  })
}

/// ------------------------------------------------------------------------ ///
/// List provider users
/// ------------------------------------------------------------------------ ///

exports.providerUsersList = async (req, res) => {
  // clear session data
  delete req.session.data.providerUser

  const { providerId } = req.params

  // variables for use in pagination
  const page = parseInt(req.query.page, 10) || 1
  const limit = parseInt(req.query.limit, 10) || 15
  const offset = (page - 1) * limit

  const provider = await Provider.findByPk(providerId)

  // Run in parallel: accreditation flag + last update (by providerId)
  const [isAccredited, lastUpdate] = await Promise.all([
    isAccreditedProvider({ providerId }),
    getProviderLastUpdated(providerId, { includeDeletedChildren: true })
  ])

  const totalCount = await ProviderUser.count({
    where: {
      providerId,
      deletedAt: null
    },
    include: [
      {
        model: User,
        as: 'user',
        where: {
          deletedAt: null
        }
      }
    ]
  })

  const providerUsers = await ProviderUser.findAll({
    where: {
      providerId,
      deletedAt: null
    },
    include: [
      {
        model: User,
        as: 'user',
        where: {
          deletedAt: null
        }
      }
    ],
    order: [
      [{ model: User, as: 'user' }, 'firstName', 'ASC'],
      [{ model: User, as: 'user' }, 'lastName', 'ASC']
    ],
    limit,
    offset
  })

  const users = providerUsers.map((providerUser) => providerUser.user)

  const pagination = new Pagination(users, totalCount, page, limit)

  res.render('providers/users/index', {
    provider,
    isAccredited,
    lastUpdate,
    users: pagination.getData(),
    pagination,
    actions: {
      new: `/support/providers/${providerId}/users/new`,
      view: `/support/providers/${providerId}/users`
    }
  })
}

/// ------------------------------------------------------------------------ ///
/// Show single provider user
/// ------------------------------------------------------------------------ ///

exports.providerUserDetails = async (req, res) => {
  delete req.session.data.providerUser

  const { providerId, userId } = req.params

  const provider = await Provider.findByPk(providerId)
  const user = await User.findOne({ where: { id: userId, deletedAt: null } })
  const providerUsers = await ProviderUser.findAll({
    where: {
      userId,
      deletedAt: null,
      providerId: { [Op.ne]: providerId }
    },
    include: [
      {
        model: Provider,
        as: 'provider',
        where: {
          deletedAt: null
        }
      }
    ],
    order: [[{ model: Provider, as: 'provider' }, 'operatingName', 'ASC']]
  })

  const relatedProviders = providerUsers.map((providerUser) => providerUser.provider)

  const [isAccredited, lastUpdate] = await Promise.all([
    isAccreditedProvider({ providerId }),
    getProviderLastUpdated(providerId, { includeDeletedChildren: true })
  ])

  const isViewingSelf = userId === req.user.id
  const hasNeverSignedIn = !user.lastSignedInAt
  const showDeleteLink = !isViewingSelf
  const showChangeLink = !isViewingSelf && hasNeverSignedIn
  const showStatusChangeLink = !isViewingSelf

  res.render('providers/users/show', {
    provider,
    isAccredited,
    lastUpdate,
    user,
    relatedProviders,
    showDeleteLink,
    showChangeLink,
    showStatusChangeLink,
    actions: {
      back: `/support/providers/${providerId}/users`,
      change: `/support/providers/${providerId}/users/${user.id}/edit`,
      delete: `/support/providers/${providerId}/users/${user.id}/delete`
    }
  })
}

/// ------------------------------------------------------------------------ ///
/// New provider user
/// ------------------------------------------------------------------------ ///

exports.newProviderUser_get = async (req, res) => {
  const { providerId } = req.params
  const provider = await Provider.findByPk(providerId)
  const user = req.session.data.providerUser

  res.render('providers/users/edit', {
    provider,
    user,
    // Explicitly null to avoid clashing with the signed-in user injected into res.locals
    currentUser: null,
    actions: {
      back: `/support/providers/${providerId}/users`,
      cancel: `/support/providers/${providerId}/users`,
      save: `/support/providers/${providerId}/users/new`
    }
  })
}

exports.newProviderUser_post = async (req, res) => {
  const { providerId } = req.params
  const provider = await Provider.findByPk(providerId)
  req.session.data = req.session.data || {}
  req.session.data.providerUser = req.session.data.providerUser || {}
  const user = req.session.data.providerUser
  const errors = []

  user.firstName = user.firstName ? user.firstName.trim() : ''
  user.lastName = user.lastName ? user.lastName.trim() : ''
  user.email = normalizeEmail(user.email)

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

  const isValidEmailAddress = !!(isValidEmail(user.email))
  const existingUser = await findActiveUserByEmail(user.email)
  const existingProviderUser = await findProviderUserByEmail(providerId, user.email)

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
    error.text = 'Enter an email address in the correct format, like name@example.com'
    errors.push(error)
  } else if (existingProviderUser) {
    const error = {}
    error.fieldName = 'email'
    error.href = '#email'
    error.text = 'User already added to this provider'
    errors.push(error)
  }

  if (errors.length) {
    res.render('providers/users/edit', {
      provider,
      user,
      errors,
      currentUser: null,
      actions: {
        back: `/support/providers/${providerId}/users`,
        cancel: `/support/providers/${providerId}/users`,
        save: `/support/providers/${providerId}/users/new`
      }
    })
  } else {
    if (existingUser) {
      user.existingUserId = existingUser.id
      user.firstName = existingUser.firstName
      user.lastName = existingUser.lastName
    } else {
      delete user.existingUserId
    }
    res.redirect(`/support/providers/${providerId}/users/new/check`)
  }
}

exports.newProviderUserCheck_get = async (req, res) => {
  const { providerId } = req.params
  const provider = await Provider.findByPk(providerId)
  const user = req.session.data.providerUser

  res.render('providers/users/check-your-answers', {
    provider,
    user,
    currentUser: null,
    actions: {
      back: `/support/providers/${providerId}/users/new`,
      cancel: `/support/providers/${providerId}/users`,
      change: `/support/providers/${providerId}/users/new`,
      save: `/support/providers/${providerId}/users/new/check`
    }
  })
}

exports.newProviderUserCheck_post = async (req, res) => {
  const { providerId } = req.params
  const user = req.session.data.providerUser

  let targetUser = null

  if (user?.existingUserId) {
    targetUser = await User.findOne({
      where: {
        id: user.existingUserId,
        deletedAt: null
      }
    })
  }

  if (!targetUser) {
    targetUser = await findActiveUserByEmail(user.email)
  }

  if (targetUser) {
    const existingProviderUser = await ProviderUser.findOne({
      where: {
        providerId,
        userId: targetUser.id,
        deletedAt: null
      }
    })

    if (existingProviderUser) {
      const provider = await Provider.findByPk(providerId)
      const errors = [{
        fieldName: 'email',
        href: '#email',
        text: 'User already added to this provider'
      }]

      return res.render('providers/users/edit', {
        provider,
        user,
        errors,
        currentUser: null,
        actions: {
          back: `/support/providers/${providerId}/users`,
          cancel: `/support/providers/${providerId}/users`,
          save: `/support/providers/${providerId}/users/new`
        }
      })
    }
  }

  if (!targetUser) {
    // Hash the default password for new users
    const hashedPassword = await bcrypt.hash('bat', 10)

    targetUser = await User.create({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      isActive: true,
      isApiUser: false,
      password: hashedPassword,
      createdById: req.user.id,
      updatedById: req.user.id
    })
  }

  await ProviderUser.create({
    providerId,
    userId: targetUser.id,
    createdById: req.user.id,
    updatedById: req.user.id
  })

  delete req.session.data.providerUser

  req.flash('success', 'User added')
  res.redirect(`/support/providers/${providerId}/users`)
}

/// ------------------------------------------------------------------------ ///
/// Edit provider user
/// ------------------------------------------------------------------------ ///

exports.editProviderUser_get = async (req, res) => {
  const { providerId, userId } = req.params
  const provider = await Provider.findByPk(providerId)
  const currentUser = await User.findByPk(userId)

  let user
  if (req.session.data.providerUser) {
    user = req.session.data.providerUser
  } else {
    user = currentUser
  }

  res.render('providers/users/edit', {
    provider,
    currentUser,
    user,
    actions: {
      back: `/support/providers/${providerId}/users/${userId}`,
      cancel: `/support/providers/${providerId}/users/${userId}`,
      save: `/support/providers/${providerId}/users/${userId}/edit`
    }
  })
}

exports.editProviderUser_post = async (req, res) => {
  const { providerId, userId } = req.params
  const provider = await Provider.findByPk(providerId)

  req.session.data = req.session.data || {}
  req.session.data.providerUser = req.session.data.providerUser || {}
  const user = req.session.data.providerUser
  const currentUser = await User.findByPk(userId)
  const errors = []
  const hasSignedInBefore = Boolean(currentUser.lastSignedInAt)

  if (hasSignedInBefore) {
    user.firstName = currentUser.firstName
    user.lastName = currentUser.lastName
    user.email = currentUser.email
  } else {
    user.firstName = user.firstName ? user.firstName.trim() : ''
    user.lastName = user.lastName ? user.lastName.trim() : ''
    user.email = normalizeEmail(user.email)

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
  }

  if (
    !hasSignedInBefore &&
    currentUser.email.toLowerCase() !== user.email.toLowerCase()
  ) {
    const existingProviderUser = await findProviderUserByEmail(providerId, user.email, {
      excludeUserId: currentUser.id
    })

    if (existingProviderUser) {
      const error = {}
      error.fieldName = 'email'
      error.href = '#email'
      error.text = 'User already added to this provider'
      errors.push(error)
    }
  }

  if (!hasSignedInBefore) {
    const isValidEmailAddress = !!(isValidEmail(user.email))

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
      error.text = 'Enter an email address in the correct format, like name@example.com'
      errors.push(error)
    }
  }

  if (errors.length) {
    res.render('providers/users/edit', {
      provider,
      currentUser,
      user,
      errors,
      actions: {
        back: `/support/providers/${providerId}/users/${userId}`,
        cancel: `/support/providers/${providerId}/users/${userId}`,
        save: `/support/providers/${providerId}/users/${userId}/edit`
      }
    })
  } else {
    res.redirect(`/support/providers/${providerId}/users/${userId}/edit/check`)
  }
}

exports.editProviderUserCheck_get = async (req, res) => {
  const { providerId, userId } = req.params
  const provider = await Provider.findByPk(providerId)
  const user = req.session.data.providerUser
  const currentUser = await User.findByPk(userId)

  res.render('providers/users/check-your-answers', {
    provider,
    currentUser,
    user,
    actions: {
      back: `/support/providers/${providerId}/users/${userId}/edit`,
      cancel: `/support/providers/${providerId}/users/${userId}`,
      change: `/support/providers/${providerId}/users/${userId}/edit`,
      save: `/support/providers/${providerId}/users/${userId}/edit/check`
    }
  })
}

exports.editProviderUserCheck_post = async (req, res) => {
  const { providerId, userId } = req.params
  req.session.data = req.session.data || {}
  req.session.data.providerUser = req.session.data.providerUser || {}
  const user = req.session.data.providerUser
  const currentUser = await User.findByPk(userId)
  const hasSignedInBefore = Boolean(currentUser.lastSignedInAt)

  // Convert isActive string to boolean
  const isActive = user.isActive === 'true' || user.isActive === true

  const updatePayload = {
    isActive: isActive,
    updatedById: req.user.id
  }

  if (!hasSignedInBefore) {
    updatePayload.firstName = user.firstName
    updatePayload.lastName = user.lastName
    updatePayload.email = user.email
  }

  currentUser.update(updatePayload)

  delete req.session.data.providerUser

  req.flash('success', 'User updated')
  res.redirect(`/support/providers/${providerId}/users/${userId}`)
}

/// ------------------------------------------------------------------------ ///
/// Delete provider user
/// ------------------------------------------------------------------------ ///

exports.deleteProviderUser_get = async (req, res) => {
  const { providerId, userId } = req.params
  const provider = await Provider.findByPk(providerId)
  const user = await User.findByPk(userId)

  res.render('providers/users/delete', {
    provider,
    user,
    actions: {
      back: `/support/providers/${providerId}/users/${userId}`,
      cancel: `/support/providers/${providerId}/users/${userId}`,
      delete: `/support/providers/${providerId}/users/${userId}/delete`
    }
  })
}

exports.deleteProviderUser_post = async (req, res) => {
  const { providerId, userId } = req.params
  const user = await User.findByPk(userId)
  const providerUser = await ProviderUser.findOne({
    where: {
      providerId,
      userId,
      deletedAt: null
    }
  })

  if (providerUser) {
    const otherProviderLinksCount = await ProviderUser.count({
      where: {
        userId,
        deletedAt: null,
        providerId: { [Op.ne]: providerId }
      }
    })

    if (!otherProviderLinksCount && user) {
      await user.update({
        deletedAt: new Date(),
        deletedById: req.user.id,
        updatedById: req.user.id
      })
    }

    await providerUser.update({
      deletedAt: new Date(),
      deletedById: req.user.id,
      updatedById: req.user.id
    })
  }

  req.flash('success', 'User deleted')
  res.redirect(`/support/providers/${providerId}/users`)
}
