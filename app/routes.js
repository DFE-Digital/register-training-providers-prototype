//
// For guidance on how to create routes see:
// https://prototype-kit.service.gov.uk/docs/create-routes
//

const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()

/// ------------------------------------------------------------------------ ///
/// Flash messaging
/// ------------------------------------------------------------------------ ///
const flash = require('connect-flash')
router.use(flash())

/// ------------------------------------------------------------------------ ///
/// User authentication
/// ------------------------------------------------------------------------ ///
// TODO: Replace with Passport
const passport = {
  user: {
    id: '3faa7586-951b-495c-9999-e5fc4367b507',
    first_name: 'Colin',
    last_name: 'Chapman',
    email: 'colin.chapman@example.gov.uk'
  }
}

/// ------------------------------------------------------------------------ ///
/// Controller modules
/// ------------------------------------------------------------------------ ///
const errorController = require('./controllers/error')
const providerController = require('./controllers/provider')
const providerAccreditationController = require('./controllers/providerAccreditation')
const providerAddressController = require('./controllers/providerAddress')
const providerContactController = require('./controllers/providerContact')
const providerPartnershipController = require('./controllers/providerPartnership')
const userController = require('./controllers/user')

/// ------------------------------------------------------------------------ ///
/// Authentication middleware
/// ------------------------------------------------------------------------ ///
const checkIsAuthenticated = (req, res, next) => {
  // the signed in user
  req.session.passport = passport
  // the base URL for navigation
  res.locals.baseUrl = `/providers/${req.params.providerId}`
  next()
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
/// HOMEPAGE ROUTE
/// ------------------------------------------------------------------------ ///
router.get('/', (req, res) => {
  res.redirect('/providers')
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

router.get('/providers/:providerId/partnerships/new/check', checkIsAuthenticated, providerPartnershipController.newProviderPartnershipCheck_get)
router.post('/providers/:providerId/partnerships/new/check', checkIsAuthenticated, providerPartnershipController.newProviderPartnershipCheck_post)

router.get('/providers/:providerId/partnerships/:partnershipId/delete', checkIsAuthenticated, providerPartnershipController.deleteProviderPartnership_get)
router.post('/providers/:providerId/partnerships/:partnershipId/delete', checkIsAuthenticated, providerPartnershipController.deleteProviderPartnership_post)

router.get('/providers/:providerId/partnerships/:partnershipId', checkIsAuthenticated, providerPartnershipController.providerPartnershipDetails)

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
/// GENERAL ROUTES
/// ------------------------------------------------------------------------ ///

router.get('/404', checkIsAuthenticated, errorController.pageNotFound)
router.get('/page-not-found', checkIsAuthenticated, errorController.pageNotFound)

router.get('/500', errorController.unexpectedError)
router.get('/server-error', errorController.unexpectedError)

router.get('/503', errorController.serviceUnavailable)
router.get('/service-unavailable', errorController.serviceUnavailable)

router.get('/unauthorised', errorController.unauthorised)

router.get('/account-not-recognised', errorController.accountNotRecognised)

router.get('/account-no-organisation', errorController.accountNoOrganisation)

/// ------------------------------------------------------------------------ ///
/// AUTOCOMPLETE ROUTES
/// ------------------------------------------------------------------------ ///

router.get('/accredited-provider-suggestions', providerController.accreditedProviderSuggestions_json)

router.get('/training-provider-suggestions', providerController.trainingProviderSuggestions_json)

/// ------------------------------------------------------------------------ ///
///
/// ------------------------------------------------------------------------ ///

module.exports = router
