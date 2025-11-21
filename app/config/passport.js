const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const bcrypt = require('bcrypt')
const { User } = require('../models')

/**
 * Configure Passport local strategy for email/password authentication
 */
passport.use(
  new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password'
    },
    async (email, password, done) => {
      try {
        // Find user by email
        const user = await User.findOne({
          where: { email: email.toLowerCase() }
        })

        // User not found
        if (!user) {
          return done(null, false, {
            message: 'Enter a valid email address and password'
          })
        }

        // Check if user is active
        if (!user.isActive) {
          return done(null, false, {
            redirect: '/account-not-authorised'
          })
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password)

        if (!isPasswordValid) {
          return done(null, false, {
            message: 'Enter a valid email address and password'
          })
        }

        // Authentication successful
        return done(null, user)
      } catch (error) {
        return done(error)
      }
    }
  )
)

/**
 * Serialize user to session
 * Store only user ID in session
 */
passport.serializeUser((user, done) => {
  done(null, user.id)
})

/**
 * Deserialize user from session
 * Retrieve full user object from database
 */
passport.deserializeUser(async (id, done) => {
  try {
    let lookupId = id

    if (lookupId && typeof lookupId === 'object') {
      if ('id' in lookupId) {
        lookupId = lookupId.id
      } else if (lookupId.user && typeof lookupId.user === 'object' && 'id' in lookupId.user) {
        lookupId = lookupId.user.id
      }
    }

    if (!lookupId || typeof lookupId !== 'string') {
      return done(null, false)
    }

    const user = await User.findByPk(lookupId)

    if (!user) {
      return done(null, false)
    }

    // Check if user is still active
    if (!user.isActive) {
      return done(null, false)
    }

    done(null, user)
  } catch (error) {
    done(error)
  }
})

module.exports = passport
