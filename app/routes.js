//
// For guidance on how to create routes see:
// https://prototype-kit.service.gov.uk/docs/create-routes
//

require('dotenv').config()

const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()
const session = require('express-session')
const { startAccreditationStatusScheduler } = require('./services/accreditationStatus')

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

// Keep provider accreditation flags up to date in the background
const accreditationRefreshMs = Number(process.env.ACCREDITATION_STATUS_REFRESH_MS) || (1000 * 60 * 30)
startAccreditationStatusScheduler(accreditationRefreshMs)

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
const apiProvidersController = require('./controllers/api/providers')
const apiDocsController = require('./controllers/api/docs')

/// ------------------------------------------------------------------------ ///
/// Middleware
/// ------------------------------------------------------------------------ ///
const apiAuth = require('./middleware/apiAuth')
const { checkIsAuthenticated, checkIsSupportUser } = require('./middleware/auth')

const supportOnly = [checkIsAuthenticated, checkIsSupportUser]

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
router.get('/users/new', ...supportOnly, userController.newUser_get)
router.post('/users/new', ...supportOnly, userController.newUser_post)

router.get('/users/new/check', ...supportOnly, userController.newUserCheck_get)
router.post('/users/new/check', ...supportOnly, userController.newUserCheck_post)

router.get('/users/:userId/edit', ...supportOnly, userController.editUser_get)
router.post('/users/:userId/edit', ...supportOnly, userController.editUser_post)

router.get('/users/:userId/edit/check', ...supportOnly, userController.editUserCheck_get)
router.post('/users/:userId/edit/check', ...supportOnly, userController.editUserCheck_post)

router.get('/users/:userId/delete', ...supportOnly, userController.deleteUser_get)
router.post('/users/:userId/delete', ...supportOnly, userController.deleteUser_post)

router.get('/users/:userId', ...supportOnly, userController.userDetails)

router.get('/users', ...supportOnly, userController.usersList)

/// ------------------------------------------------------------------------ ///
/// PROVIDER ACCREDITATION ROUTES
/// ------------------------------------------------------------------------ ///

router.get('/providers/:providerId/accreditations/new', ...supportOnly, providerAccreditationController.newProviderAccreditation_get)
router.post('/providers/:providerId/accreditations/new', ...supportOnly, providerAccreditationController.newProviderAccreditation_post)

router.get('/providers/:providerId/accreditations/new/check', ...supportOnly, providerAccreditationController.newProviderAccreditationCheck_get)
router.post('/providers/:providerId/accreditations/new/check', ...supportOnly, providerAccreditationController.newProviderAccreditationCheck_post)

router.get('/providers/:providerId/accreditations/:accreditationId/edit', ...supportOnly, providerAccreditationController.editProviderAccreditation_get)
router.post('/providers/:providerId/accreditations/:accreditationId/edit', ...supportOnly, providerAccreditationController.editProviderAccreditation_post)

router.get('/providers/:providerId/accreditations/:accreditationId/edit/check', ...supportOnly, providerAccreditationController.editProviderAccreditationCheck_get)
router.post('/providers/:providerId/accreditations/:accreditationId/edit/check', ...supportOnly, providerAccreditationController.editProviderAccreditationCheck_post)

router.get('/providers/:providerId/accreditations/:accreditationId/delete', ...supportOnly, providerAccreditationController.deleteProviderAccreditation_get)
router.post('/providers/:providerId/accreditations/:accreditationId/delete', ...supportOnly, providerAccreditationController.deleteProviderAccreditation_post)

router.get('/providers/:providerId/accreditations/:accreditationId', ...supportOnly, providerAccreditationController.providerAccreditationDetails)

router.get('/providers/:providerId/accreditations', ...supportOnly, providerAccreditationController.providerAccreditationsList)

/// ------------------------------------------------------------------------ ///
/// PROVIDER CONTACT ROUTES
/// ------------------------------------------------------------------------ ///

router.get('/providers/:providerId/contacts/new', ...supportOnly, providerContactController.newProviderContact_get)
router.post('/providers/:providerId/contacts/new', ...supportOnly, providerContactController.newProviderContact_post)

router.get('/providers/:providerId/contacts/new/check', ...supportOnly, providerContactController.newProviderContactCheck_get)
router.post('/providers/:providerId/contacts/new/check', ...supportOnly, providerContactController.newProviderContactCheck_post)

router.get('/providers/:providerId/contacts/:contactId/edit', ...supportOnly, providerContactController.editProviderContact_get)
router.post('/providers/:providerId/contacts/:contactId/edit', ...supportOnly, providerContactController.editProviderContact_post)

router.get('/providers/:providerId/contacts/:contactId/edit/check', ...supportOnly, providerContactController.editProviderContactCheck_get)
router.post('/providers/:providerId/contacts/:contactId/edit/check', ...supportOnly, providerContactController.editProviderContactCheck_post)

router.get('/providers/:providerId/contacts/:contactId/delete', ...supportOnly, providerContactController.deleteProviderContact_get)
router.post('/providers/:providerId/contacts/:contactId/delete', ...supportOnly, providerContactController.deleteProviderContact_post)

router.get('/providers/:providerId/contacts/:contactId', ...supportOnly, providerContactController.providerContactDetails)

router.get('/providers/:providerId/contacts', ...supportOnly, providerContactController.providerContactsList)

/// ------------------------------------------------------------------------ ///
/// PROVIDER ADDRESS ROUTES
/// ------------------------------------------------------------------------ ///

router.get('/providers/:providerId/addresses/new', ...supportOnly, providerAddressController.newFindProviderAddress_get)
router.post('/providers/:providerId/addresses/new', ...supportOnly, providerAddressController.newFindProviderAddress_post)

router.get('/providers/:providerId/addresses/new/select', ...supportOnly, providerAddressController.newSelectProviderAddress_get)
router.post('/providers/:providerId/addresses/new/select', ...supportOnly, providerAddressController.newSelectProviderAddress_post)

router.get('/providers/:providerId/addresses/new/enter', ...supportOnly, providerAddressController.newEnterProviderAddress_get)
router.post('/providers/:providerId/addresses/new/enter', ...supportOnly, providerAddressController.newEnterProviderAddress_post)

router.get('/providers/:providerId/addresses/new/check', ...supportOnly, providerAddressController.newProviderAddressCheck_get)
router.post('/providers/:providerId/addresses/new/check', ...supportOnly, providerAddressController.newProviderAddressCheck_post)

router.get('/providers/:providerId/addresses/:addressId/edit', ...supportOnly, providerAddressController.editProviderAddress_get)
router.post('/providers/:providerId/addresses/:addressId/edit', ...supportOnly, providerAddressController.editProviderAddress_post)

router.get('/providers/:providerId/addresses/:addressId/edit/check', ...supportOnly, providerAddressController.editProviderAddressCheck_get)
router.post('/providers/:providerId/addresses/:addressId/edit/check', ...supportOnly, providerAddressController.editProviderAddressCheck_post)

router.get('/providers/:providerId/addresses/:addressId/delete', ...supportOnly, providerAddressController.deleteProviderAddress_get)
router.post('/providers/:providerId/addresses/:addressId/delete', ...supportOnly, providerAddressController.deleteProviderAddress_post)

router.get('/providers/:providerId/addresses/:addressId', ...supportOnly, providerAddressController.providerAddressDetails)

router.get('/providers/:providerId/addresses', ...supportOnly, providerAddressController.providerAddressesList)

/// ------------------------------------------------------------------------ ///
/// PROVIDER PARTNERSHIP ROUTES
/// ------------------------------------------------------------------------ ///

router.get('/providers/:providerId/partnerships/new', ...supportOnly, providerPartnershipController.newProviderPartnership_get)
router.post('/providers/:providerId/partnerships/new', ...supportOnly, providerPartnershipController.newProviderPartnership_post)

router.get('/providers/:providerId/partnerships/new/duplicate', ...supportOnly, providerPartnershipController.newProviderPartnershipDuplicate_get)

router.get('/providers/:providerId/partnerships/new/choose', ...supportOnly, providerPartnershipController.newProviderPartnershipChoose_get)
router.post('/providers/:providerId/partnerships/new/choose', ...supportOnly, providerPartnershipController.newProviderPartnershipChoose_post)

router.get('/providers/:providerId/partnerships/new/dates', ...supportOnly, providerPartnershipController.newProviderPartnershipDates_get)
router.post('/providers/:providerId/partnerships/new/dates', ...supportOnly, providerPartnershipController.newProviderPartnershipDates_post)

router.get('/providers/:providerId/partnerships/new/academic-years', ...supportOnly, providerPartnershipController.newProviderPartnershipAcademicYears_get)
router.post('/providers/:providerId/partnerships/new/academic-years', ...supportOnly, providerPartnershipController.newProviderPartnershipAcademicYears_post)

router.get('/providers/:providerId/partnerships/new/check', ...supportOnly, providerPartnershipController.newProviderPartnershipCheck_get)
router.post('/providers/:providerId/partnerships/new/check', ...supportOnly, providerPartnershipController.newProviderPartnershipCheck_post)

router.get('/providers/:providerId/partnerships/:partnershipId/dates', ...supportOnly, providerPartnershipController.editProviderPartnershipDates_get)
router.post('/providers/:providerId/partnerships/:partnershipId/dates', ...supportOnly, providerPartnershipController.editProviderPartnershipDates_post)

router.get('/providers/:providerId/partnerships/:partnershipId/academic-years', ...supportOnly, providerPartnershipController.editProviderPartnershipAcademicYears_get)
router.post('/providers/:providerId/partnerships/:partnershipId/academic-years', ...supportOnly, providerPartnershipController.editProviderPartnershipAcademicYears_post)

router.get('/providers/:providerId/partnerships/:partnershipId/check', ...supportOnly, providerPartnershipController.editProviderPartnershipCheck_get)
router.post('/providers/:providerId/partnerships/:partnershipId/check', ...supportOnly, providerPartnershipController.editProviderPartnershipCheck_post)

router.get('/providers/:providerId/partnerships/:partnershipId/delete', ...supportOnly, providerPartnershipController.deleteProviderPartnership_get)
router.post('/providers/:providerId/partnerships/:partnershipId/delete', ...supportOnly, providerPartnershipController.deleteProviderPartnership_post)

// router.get('/providers/:providerId/partnerships/:partnershipId', checkIsAuthenticated, providerPartnershipController.providerPartnershipDetails)

router.get('/providers/:providerId/partnerships', ...supportOnly, providerPartnershipController.providerPartnershipsList)

/// ------------------------------------------------------------------------ ///
/// PROVIDER ROUTES
/// ------------------------------------------------------------------------ ///

router.get('/providers/remove-provider-type-filter/:providerType', ...supportOnly, providerController.removeProviderTypeFilter)
router.get('/providers/remove-accreditation-type-filter/:accreditationType', ...supportOnly, providerController.removeAccreditationTypeFilter)
router.get('/providers/remove-show-archived-provider-filter/:showArchivedProvider', ...supportOnly, providerController.removeShowArchivedProviderFilter)

router.get('/providers/remove-all-filters', ...supportOnly, providerController.removeAllFilters)

router.get('/providers/remove-keyword-search', ...supportOnly, providerController.removeKeywordSearch)

router.get('/providers/new', ...supportOnly, providerController.newProviderIsAccredited_get)
router.post('/providers/new', ...supportOnly, providerController.newProviderIsAccredited_post)

router.get('/providers/new/type', ...supportOnly, providerController.newProviderType_get)
router.post('/providers/new/type', ...supportOnly, providerController.newProviderType_post)

router.get('/providers/new/details', ...supportOnly, providerController.newProviderDetails_get)
router.post('/providers/new/details', ...supportOnly, providerController.newProviderDetails_post)

router.get('/providers/new/accreditation', ...supportOnly, providerController.newProviderAccreditation_get)
router.post('/providers/new/accreditation', ...supportOnly, providerController.newProviderAccreditation_post)

router.get('/providers/new/address', ...supportOnly, providerController.newProviderFindAddress_get)
router.post('/providers/new/address', ...supportOnly, providerController.newProviderFindAddress_post)

router.get('/providers/new/address/select', ...supportOnly, providerController.newProviderSelectAddress_get)
router.post('/providers/new/address/select', ...supportOnly, providerController.newProviderSelectAddress_post)

router.get('/providers/new/address/enter', ...supportOnly, providerController.newProviderEnterAddress_get)
router.post('/providers/new/address/enter', ...supportOnly, providerController.newProviderEnterAddress_post)

router.get('/providers/new/check', ...supportOnly, providerController.newProviderCheck_get)
router.post('/providers/new/check', ...supportOnly, providerController.newProviderCheck_post)

router.get('/providers/:providerId/edit', ...supportOnly, providerController.editProvider_get)
router.post('/providers/:providerId/edit', ...supportOnly, providerController.editProvider_post)

router.get('/providers/:providerId/edit/check', ...supportOnly, providerController.editProviderCheck_get)
router.post('/providers/:providerId/edit/check', ...supportOnly, providerController.editProviderCheck_post)

router.get('/providers/:providerId/delete', ...supportOnly, providerController.deleteProvider_get)
router.post('/providers/:providerId/delete', ...supportOnly, providerController.deleteProvider_post)

router.get('/providers/:providerId/archive', ...supportOnly, providerController.archiveProvider_get)
router.post('/providers/:providerId/archive', ...supportOnly, providerController.archiveProvider_post)

router.get('/providers/:providerId/restore', ...supportOnly, providerController.restoreProvider_get)
router.post('/providers/:providerId/restore', ...supportOnly, providerController.restoreProvider_post)

router.get('/providers/:providerId', ...supportOnly, providerController.providerDetails)

router.get('/providers', ...supportOnly, providerController.providersList)

/// ------------------------------------------------------------------------ ///
/// MY ACCOUNT ROUTES
/// ------------------------------------------------------------------------ ///

router.get('/account', checkIsAuthenticated, accountController.userAccount)

/// ------------------------------------------------------------------------ ///
/// ACTIVITY ROUTES
/// ------------------------------------------------------------------------ ///

router.get('/activity', ...supportOnly, activityController.activityList)

router.get('/providers/:providerId/activity', ...supportOnly, providerActivityController.activityList)

/// ------------------------------------------------------------------------ ///
/// API CLIENT ROUTES
/// ------------------------------------------------------------------------ ///

router.get('/api-clients', checkIsAuthenticated, apiClientController.apiClientList)

router.get('/api-clients/new', checkIsAuthenticated, apiClientController.newApiClientToken_get)
router.post('/api-clients/new', checkIsAuthenticated, apiClientController.newApiClientToken_post)

router.get('/api-clients/new/check', checkIsAuthenticated, apiClientController.newApiClientTokenCheck_get)
router.post('/api-clients/new/check', checkIsAuthenticated, apiClientController.newApiClientTokenCheck_post)

router.get('/api-clients/new/confirmation', checkIsAuthenticated, apiClientController.newApiClientTokenConfirmation_get)

router.get('/api-clients/:apiClientId/edit', checkIsAuthenticated, apiClientController.editApiClientToken_get)
router.post('/api-clients/:apiClientId/edit', checkIsAuthenticated, apiClientController.editApiClientToken_post)

router.get('/api-clients/:apiClientId/check', checkIsAuthenticated, apiClientController.editApiClientTokenCheck_get)
router.post('/api-clients/:apiClientId/check', checkIsAuthenticated, apiClientController.editApiClientTokenCheck_post)

router.get('/api-clients/:apiClientId/revoke', checkIsAuthenticated, apiClientController.revokeApiClientTokenCheck_get)
router.post('/api-clients/:apiClientId/revoke', checkIsAuthenticated, apiClientController.revokeApiClientTokenCheck_post)

router.get('/api-clients/:apiClientId/delete', checkIsAuthenticated, apiClientController.deleteApiClientTokenCheck_get)
router.post('/api-clients/:apiClientId/delete', checkIsAuthenticated, apiClientController.deleteApiClientTokenCheck_post)

router.get('/api-clients/:apiClientId', checkIsAuthenticated, apiClientController.apiClientTokenDetails)

/// ------------------------------------------------------------------------ ///
/// API ROUTES
/// ------------------------------------------------------------------------ ///

router.get('/api/v1/providers', apiAuth, apiProvidersController.list)

/// ------------------------------------------------------------------------ ///
/// API DOCUMENTATION ROUTES
/// ------------------------------------------------------------------------ ///

router.get('/api-docs', apiDocsController.list)

router.get('/api-docs/providers', apiDocsController.providers)

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

router.get('/accredited-provider-suggestions', ...supportOnly, providerController.accreditedProviderSuggestions_json)

router.get('/training-partner-suggestions', ...supportOnly, providerController.trainingPartnerSuggestions_json)

/// ------------------------------------------------------------------------ ///
///
/// ------------------------------------------------------------------------ ///

module.exports = router
