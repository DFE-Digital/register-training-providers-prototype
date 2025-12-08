//
// For guidance on how to create routes see:
// https://prototype-kit.service.gov.uk/docs/create-routes
//

require('dotenv').config()

const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()
const session = require('express-session')

/// ------------------------------------------------------------------------ ///
/// Session configuration
/// ------------------------------------------------------------------------ ///
router.use(
  session({
    secret: process.env.SESSION_SECRET || 'default-insecure-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 4, // 4 hours
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true
    }
  })
)

/// ------------------------------------------------------------------------ ///
/// Flash messaging
/// ------------------------------------------------------------------------ ///
const flash = require('connect-flash')
router.use(flash())

/// ------------------------------------------------------------------------ ///
/// Passport authentication
/// ------------------------------------------------------------------------ ///
const passport = require('./config/passport')

router.use(passport.initialize())
router.use(passport.session())

/// ------------------------------------------------------------------------ ///
/// Controller modules
/// ------------------------------------------------------------------------ ///
const accountController = require('./controllers/account')
const activityController = require('./controllers/activity')
const apiClientController = require('./controllers/apiClient')
const authenticationController = require('./controllers/authentication')
const contentController = require('./controllers/content')
const errorController = require('./controllers/error')
const feedbackController = require('./controllers/feedback')
const providerAccreditationController = require('./controllers/providerAccreditation')
const providerActivityController = require('./controllers/providerActivity')
const providerAddressController = require('./controllers/providerAddress')
const providerContactController = require('./controllers/providerContact')
const providerController = require('./controllers/provider')
const providerPartnershipController = require('./controllers/providerPartnership')
const userController = require('./controllers/user')

/// ------------------------------------------------------------------------ ///
/// Authentication middleware
/// ------------------------------------------------------------------------ ///
const checkIsAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    if (!req.user.isActive) {
      return res.redirect('/account-not-authorised')
    }

    // Set base URLs for navigation
    res.locals.baseUrl = `/providers/${req.params.providerId}`
    res.locals.supportBaseUrl = `/providers/${req.params.providerId}`
    // Make user available in templates
    res.locals.passport = {
      user: {
        id: req.user.id,
        first_name: req.user.firstName,
        last_name: req.user.lastName,
        email: req.user.email
      }
    }
    return next()
  }

  // Save the original URL to redirect after login
  req.session.returnTo = req.originalUrl
  res.redirect('/auth/sign-in')
}

/// ------------------------------------------------------------------------ ///
/// ALL ROUTES
/// ------------------------------------------------------------------------ ///
router.all('*', (req, res, next) => {
  res.locals.referrer = req.query.referrer
  res.locals.query = req.query
  res.locals.flash = req.flash('success') // pass through 'success' messages only
  next()
})

/// ------------------------------------------------------------------------ ///
/// AUTHENTICATION ROUTES
/// ------------------------------------------------------------------------ ///
router.get('/sign-in', (req, res) => {
  res.redirect('/auth/sign-in')
})
router.get('/auth/sign-in', authenticationController.signIn_get)
router.get('/auth/sign-in/email', authenticationController.signInEmail_get)
router.post('/auth/sign-in/email', authenticationController.signInEmail_post)
router.get('/auth/sign-in/password', authenticationController.signInPassword_get)
router.post('/auth/sign-in/password', authenticationController.signInPassword_post)
router.get('/auth/persona', authenticationController.persona_get)
router.post('/auth/persona', authenticationController.persona_post)
router.get('/auth/sign-out', authenticationController.signOut_get)

// Redirect /support/sign-out to new auth route for backwards compatibility
router.get('/sign-out', (req, res) => {
  res.redirect('/auth/sign-out')
})

/// ------------------------------------------------------------------------ ///
/// HOMEPAGE ROUTE
/// ------------------------------------------------------------------------ ///
router.get('/', (req, res) => {
  res.redirect('/start')
})

router.get('/start', (req, res) => {
  res.render('start', {
    actions: {
      start: "/sign-in"
    }
  })
})

/// ------------------------------------------------------------------------ ///
/// USER ROUTES
/// ------------------------------------------------------------------------ ///
router.get('/users/new', checkIsAuthenticated, userController.newUser_get)
router.post('/users/new', checkIsAuthenticated, userController.newUser_post)

router.get('/users/new/check', checkIsAuthenticated, userController.newUserCheck_get)
router.post('/users/new/check', checkIsAuthenticated, userController.newUserCheck_post)

router.get('/users/:userId/edit', checkIsAuthenticated, userController.editUser_get)
router.post('/users/:userId/edit', checkIsAuthenticated, userController.editUser_post)

router.get('/users/:userId/edit/check', checkIsAuthenticated, userController.editUserCheck_get)
router.post('/users/:userId/edit/check', checkIsAuthenticated, userController.editUserCheck_post)

router.get('/users/:userId/delete', checkIsAuthenticated, userController.deleteUser_get)
router.post('/users/:userId/delete', checkIsAuthenticated, userController.deleteUser_post)

router.get('/users/:userId', checkIsAuthenticated, userController.userDetails)

router.get('/users', checkIsAuthenticated, userController.usersList)

/// ------------------------------------------------------------------------ ///
/// PROVIDER ACCREDITATION ROUTES
/// ------------------------------------------------------------------------ ///

router.get('/providers/:providerId/accreditations/new', checkIsAuthenticated, providerAccreditationController.newProviderAccreditation_get)
router.post('/providers/:providerId/accreditations/new', checkIsAuthenticated, providerAccreditationController.newProviderAccreditation_post)

router.get('/providers/:providerId/accreditations/new/check', checkIsAuthenticated, providerAccreditationController.newProviderAccreditationCheck_get)
router.post('/providers/:providerId/accreditations/new/check', checkIsAuthenticated, providerAccreditationController.newProviderAccreditationCheck_post)

router.get('/providers/:providerId/accreditations/:accreditationId/edit', checkIsAuthenticated, providerAccreditationController.editProviderAccreditation_get)
router.post('/providers/:providerId/accreditations/:accreditationId/edit', checkIsAuthenticated, providerAccreditationController.editProviderAccreditation_post)

router.get('/providers/:providerId/accreditations/:accreditationId/edit/check', checkIsAuthenticated, providerAccreditationController.editProviderAccreditationCheck_get)
router.post('/providers/:providerId/accreditations/:accreditationId/edit/check', checkIsAuthenticated, providerAccreditationController.editProviderAccreditationCheck_post)

router.get('/providers/:providerId/accreditations/:accreditationId/delete', checkIsAuthenticated, providerAccreditationController.deleteProviderAccreditation_get)
router.post('/providers/:providerId/accreditations/:accreditationId/delete', checkIsAuthenticated, providerAccreditationController.deleteProviderAccreditation_post)

router.get('/providers/:providerId/accreditations/:accreditationId', checkIsAuthenticated, providerAccreditationController.providerAccreditationDetails)

router.get('/providers/:providerId/accreditations', checkIsAuthenticated, providerAccreditationController.providerAccreditationsList)

/// ------------------------------------------------------------------------ ///
/// PROVIDER CONTACT ROUTES
/// ------------------------------------------------------------------------ ///

router.get('/providers/:providerId/contacts/new', checkIsAuthenticated, providerContactController.newProviderContact_get)
router.post('/providers/:providerId/contacts/new', checkIsAuthenticated, providerContactController.newProviderContact_post)

router.get('/providers/:providerId/contacts/new/check', checkIsAuthenticated, providerContactController.newProviderContactCheck_get)
router.post('/providers/:providerId/contacts/new/check', checkIsAuthenticated, providerContactController.newProviderContactCheck_post)

router.get('/providers/:providerId/contacts/:contactId/edit', checkIsAuthenticated, providerContactController.editProviderContact_get)
router.post('/providers/:providerId/contacts/:contactId/edit', checkIsAuthenticated, providerContactController.editProviderContact_post)

router.get('/providers/:providerId/contacts/:contactId/edit/check', checkIsAuthenticated, providerContactController.editProviderContactCheck_get)
router.post('/providers/:providerId/contacts/:contactId/edit/check', checkIsAuthenticated, providerContactController.editProviderContactCheck_post)

router.get('/providers/:providerId/contacts/:contactId/delete', checkIsAuthenticated, providerContactController.deleteProviderContact_get)
router.post('/providers/:providerId/contacts/:contactId/delete', checkIsAuthenticated, providerContactController.deleteProviderContact_post)

router.get('/providers/:providerId/contacts/:contactId', checkIsAuthenticated, providerContactController.providerContactDetails)

router.get('/providers/:providerId/contacts', checkIsAuthenticated, providerContactController.providerContactsList)

/// ------------------------------------------------------------------------ ///
/// PROVIDER ADDRESS ROUTES
/// ------------------------------------------------------------------------ ///

router.get('/providers/:providerId/addresses/new', checkIsAuthenticated, providerAddressController.newFindProviderAddress_get)
router.post('/providers/:providerId/addresses/new', checkIsAuthenticated, providerAddressController.newFindProviderAddress_post)

router.get('/providers/:providerId/addresses/new/select', checkIsAuthenticated, providerAddressController.newSelectProviderAddress_get)
router.post('/providers/:providerId/addresses/new/select', checkIsAuthenticated, providerAddressController.newSelectProviderAddress_post)

router.get('/providers/:providerId/addresses/new/enter', checkIsAuthenticated, providerAddressController.newEnterProviderAddress_get)
router.post('/providers/:providerId/addresses/new/enter', checkIsAuthenticated, providerAddressController.newEnterProviderAddress_post)

router.get('/providers/:providerId/addresses/new/check', checkIsAuthenticated, providerAddressController.newProviderAddressCheck_get)
router.post('/providers/:providerId/addresses/new/check', checkIsAuthenticated, providerAddressController.newProviderAddressCheck_post)

router.get('/providers/:providerId/addresses/:addressId/edit', checkIsAuthenticated, providerAddressController.editProviderAddress_get)
router.post('/providers/:providerId/addresses/:addressId/edit', checkIsAuthenticated, providerAddressController.editProviderAddress_post)

router.get('/providers/:providerId/addresses/:addressId/edit/check', checkIsAuthenticated, providerAddressController.editProviderAddressCheck_get)
router.post('/providers/:providerId/addresses/:addressId/edit/check', checkIsAuthenticated, providerAddressController.editProviderAddressCheck_post)

router.get('/providers/:providerId/addresses/:addressId/delete', checkIsAuthenticated, providerAddressController.deleteProviderAddress_get)
router.post('/providers/:providerId/addresses/:addressId/delete', checkIsAuthenticated, providerAddressController.deleteProviderAddress_post)

router.get('/providers/:providerId/addresses/:addressId', checkIsAuthenticated, providerAddressController.providerAddressDetails)

router.get('/providers/:providerId/addresses', checkIsAuthenticated, providerAddressController.providerAddressesList)

/// ------------------------------------------------------------------------ ///
/// PROVIDER PARTNERSHIP ROUTES
/// ------------------------------------------------------------------------ ///

router.get('/providers/:providerId/partnerships/new', checkIsAuthenticated, providerPartnershipController.newProviderPartnership_get)
router.post('/providers/:providerId/partnerships/new', checkIsAuthenticated, providerPartnershipController.newProviderPartnership_post)

router.get('/providers/:providerId/partnerships/new/duplicate', checkIsAuthenticated, providerPartnershipController.newProviderPartnershipDuplicate_get)

router.get('/providers/:providerId/partnerships/new/choose', checkIsAuthenticated, providerPartnershipController.newProviderPartnershipChoose_get)
router.post('/providers/:providerId/partnerships/new/choose', checkIsAuthenticated, providerPartnershipController.newProviderPartnershipChoose_post)

router.get('/providers/:providerId/partnerships/new/dates', checkIsAuthenticated, providerPartnershipController.newProviderPartnershipDates_get)
router.post('/providers/:providerId/partnerships/new/dates', checkIsAuthenticated, providerPartnershipController.newProviderPartnershipDates_post)

router.get('/providers/:providerId/partnerships/new/academic-years', checkIsAuthenticated, providerPartnershipController.newProviderPartnershipAcademicYears_get)
router.post('/providers/:providerId/partnerships/new/academic-years', checkIsAuthenticated, providerPartnershipController.newProviderPartnershipAcademicYears_post)

router.get('/providers/:providerId/partnerships/new/check', checkIsAuthenticated, providerPartnershipController.newProviderPartnershipCheck_get)
router.post('/providers/:providerId/partnerships/new/check', checkIsAuthenticated, providerPartnershipController.newProviderPartnershipCheck_post)

router.get('/providers/:providerId/partnerships/:partnershipId/dates', checkIsAuthenticated, providerPartnershipController.editProviderPartnershipDates_get)
router.post('/providers/:providerId/partnerships/:partnershipId/dates', checkIsAuthenticated, providerPartnershipController.editProviderPartnershipDates_post)

router.get('/providers/:providerId/partnerships/:partnershipId/academic-years', checkIsAuthenticated, providerPartnershipController.editProviderPartnershipAcademicYears_get)
router.post('/providers/:providerId/partnerships/:partnershipId/academic-years', checkIsAuthenticated, providerPartnershipController.editProviderPartnershipAcademicYears_post)

router.get('/providers/:providerId/partnerships/:partnershipId/check', checkIsAuthenticated, providerPartnershipController.editProviderPartnershipCheck_get)
router.post('/providers/:providerId/partnerships/:partnershipId/check', checkIsAuthenticated, providerPartnershipController.editProviderPartnershipCheck_post)

router.get('/providers/:providerId/partnerships/:partnershipId/delete', checkIsAuthenticated, providerPartnershipController.deleteProviderPartnership_get)
router.post('/providers/:providerId/partnerships/:partnershipId/delete', checkIsAuthenticated, providerPartnershipController.deleteProviderPartnership_post)

// router.get('/providers/:providerId/partnerships/:partnershipId', checkIsAuthenticated, providerPartnershipController.providerPartnershipDetails)

router.get('/providers/:providerId/partnerships', checkIsAuthenticated, providerPartnershipController.providerPartnershipsList)

/// ------------------------------------------------------------------------ ///
/// PROVIDER ROUTES
/// ------------------------------------------------------------------------ ///

router.get('/providers/remove-provider-type-filter/:providerType', checkIsAuthenticated, providerController.removeProviderTypeFilter)
router.get('/providers/remove-accreditation-type-filter/:accreditationType', checkIsAuthenticated, providerController.removeAccreditationTypeFilter)
router.get('/providers/remove-show-archived-provider-filter/:showArchivedProvider', checkIsAuthenticated, providerController.removeShowArchivedProviderFilter)

router.get('/providers/remove-all-filters', checkIsAuthenticated, providerController.removeAllFilters)

router.get('/providers/remove-keyword-search', checkIsAuthenticated, providerController.removeKeywordSearch)

router.get('/providers/new', checkIsAuthenticated, providerController.newProviderIsAccredited_get)
router.post('/providers/new', checkIsAuthenticated, providerController.newProviderIsAccredited_post)

router.get('/providers/new/type', checkIsAuthenticated, providerController.newProviderType_get)
router.post('/providers/new/type', checkIsAuthenticated, providerController.newProviderType_post)

router.get('/providers/new/details', checkIsAuthenticated, providerController.newProviderDetails_get)
router.post('/providers/new/details', checkIsAuthenticated, providerController.newProviderDetails_post)

router.get('/providers/new/accreditation', checkIsAuthenticated, providerController.newProviderAccreditation_get)
router.post('/providers/new/accreditation', checkIsAuthenticated, providerController.newProviderAccreditation_post)

router.get('/providers/new/address', checkIsAuthenticated, providerController.newProviderFindAddress_get)
router.post('/providers/new/address', checkIsAuthenticated, providerController.newProviderFindAddress_post)

router.get('/providers/new/address/select', checkIsAuthenticated, providerController.newProviderSelectAddress_get)
router.post('/providers/new/address/select', checkIsAuthenticated, providerController.newProviderSelectAddress_post)

router.get('/providers/new/address/enter', checkIsAuthenticated, providerController.newProviderEnterAddress_get)
router.post('/providers/new/address/enter', checkIsAuthenticated, providerController.newProviderEnterAddress_post)

router.get('/providers/new/check', checkIsAuthenticated, providerController.newProviderCheck_get)
router.post('/providers/new/check', checkIsAuthenticated, providerController.newProviderCheck_post)

router.get('/providers/:providerId/edit', checkIsAuthenticated, providerController.editProvider_get)
router.post('/providers/:providerId/edit', checkIsAuthenticated, providerController.editProvider_post)

router.get('/providers/:providerId/edit/check', checkIsAuthenticated, providerController.editProviderCheck_get)
router.post('/providers/:providerId/edit/check', checkIsAuthenticated, providerController.editProviderCheck_post)

router.get('/providers/:providerId/delete', checkIsAuthenticated, providerController.deleteProvider_get)
router.post('/providers/:providerId/delete', checkIsAuthenticated, providerController.deleteProvider_post)

router.get('/providers/:providerId/archive', checkIsAuthenticated, providerController.archiveProvider_get)
router.post('/providers/:providerId/archive', checkIsAuthenticated, providerController.archiveProvider_post)

router.get('/providers/:providerId/restore', checkIsAuthenticated, providerController.restoreProvider_get)
router.post('/providers/:providerId/restore', checkIsAuthenticated, providerController.restoreProvider_post)

router.get('/providers/:providerId', checkIsAuthenticated, providerController.providerDetails)

router.get('/providers', checkIsAuthenticated, providerController.providersList)

/// ------------------------------------------------------------------------ ///
/// MY ACCOUNT ROUTES
/// ------------------------------------------------------------------------ ///

router.get('/account', checkIsAuthenticated, accountController.userAccount)

/// ------------------------------------------------------------------------ ///
/// ACTIVITY ROUTES
/// ------------------------------------------------------------------------ ///

router.get('/activity', checkIsAuthenticated, activityController.activityList)

router.get('/providers/:providerId/activity', checkIsAuthenticated, providerActivityController.activityList)

/// ------------------------------------------------------------------------ ///
/// API CLIENT ROUTES
/// ------------------------------------------------------------------------ ///

router.get('/api-clients', checkIsAuthenticated, apiClientController.apiClientList)

router.get('/api-clients/new', checkIsAuthenticated, apiClientController.newApiClientToken_get)
router.post('/api-clients/new', checkIsAuthenticated, apiClientController.newApiClientToken_post)

router.get('/api-clients/new/check', checkIsAuthenticated, apiClientController.newApiClientTokenCheck_get)
router.post('/api-clients/new/check', checkIsAuthenticated, apiClientController.newApiClientTokenCheck_post)

router.get('/api-clients/new/confirmation', checkIsAuthenticated, apiClientController.newApiClientTokenConfirmation_get)

/// ------------------------------------------------------------------------ ///
/// FEEDBACK ROUTES
/// ------------------------------------------------------------------------ ///

router.get('/feedback', feedbackController.newFeedback_get)
router.post('/feedback', feedbackController.newFeedback_post)

router.get('/feedback/check', feedbackController.newFeedbackCheck_get)
router.post('/feedback/check', feedbackController.newFeedbackCheck_post)

router.get('/feedback/confirmation', feedbackController.newFeedbackConfirmation_get)

/// ------------------------------------------------------------------------ ///
/// GENERAL ROUTES
/// ------------------------------------------------------------------------ ///

router.get('/accessibility', contentController.accessibility)

router.get('/cookies', contentController.cookies)

router.get('/privacy', contentController.privacy)

router.get('/404', checkIsAuthenticated, errorController.pageNotFound)
router.get('/page-not-found', checkIsAuthenticated, errorController.pageNotFound)

router.get('/500', errorController.unexpectedError)
router.get('/server-error', errorController.unexpectedError)

router.get('/503', errorController.serviceUnavailable)
router.get('/service-unavailable', errorController.serviceUnavailable)

router.get('/unauthorised', errorController.unauthorised)
router.get('/account-not-authorised', errorController.unauthorised)

router.get('/account-not-recognised', errorController.accountNotRecognised)

router.get('/account-no-organisation', errorController.accountNoOrganisation)


/// ------------------------------------------------------------------------ ///
/// AUTOCOMPLETE ROUTES
/// ------------------------------------------------------------------------ ///

router.get('/accredited-provider-suggestions', providerController.accreditedProviderSuggestions_json)

router.get('/training-partner-suggestions', providerController.trainingPartnerSuggestions_json)

/// ------------------------------------------------------------------------ ///
///
/// ------------------------------------------------------------------------ ///

module.exports = router
