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

router.get('/providers/:providerId/addresses/new', checkIsAuthenticated, providerAddressController.newProviderAddress_get)
router.post('/providers/:providerId/addresses/new', checkIsAuthenticated, providerAddressController.newProviderAddress_post)

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

router.get('/providers/:providerId/partnerships/:partnershipId/edit', checkIsAuthenticated, providerPartnershipController.editProviderPartnership_get)
router.post('/providers/:providerId/partnerships/:partnershipId/edit', checkIsAuthenticated, providerPartnershipController.editProviderPartnership_post)

router.get('/providers/:providerId/partnerships/:partnershipId/edit/check', checkIsAuthenticated, providerPartnershipController.editProviderPartnershipCheck_get)
router.post('/providers/:providerId/partnerships/:partnershipId/edit/check', checkIsAuthenticated, providerPartnershipController.editProviderPartnershipCheck_post)

router.get('/providers/:providerId/partnerships/:partnershipId/delete', checkIsAuthenticated, providerPartnershipController.deleteProviderPartnership_get)
router.post('/providers/:providerId/partnerships/:partnershipId/delete', checkIsAuthenticated, providerPartnershipController.deleteProviderPartnership_post)

router.get('/providers/:providerId/partnerships/:partnershipId', checkIsAuthenticated, providerPartnershipController.providerPartnershipDetails)

router.get('/providers/:providerId/partnerships', checkIsAuthenticated, providerPartnershipController.providerPartnershipsList)

/// ------------------------------------------------------------------------ ///
/// PROVIDER ROUTES
/// ------------------------------------------------------------------------ ///
router.get('/providers/new', checkIsAuthenticated, providerController.newProviderIsAccredited_get)
router.post('/providers/new', checkIsAuthenticated, providerController.newProviderIsAccredited_post)

router.get('/providers/new/type', checkIsAuthenticated, providerController.newProviderType_get)
router.post('/providers/new/type', checkIsAuthenticated, providerController.newProviderType_post)

router.get('/providers/new/details', checkIsAuthenticated, providerController.newProviderDetails_get)
router.post('/providers/new/details', checkIsAuthenticated, providerController.newProviderDetails_post)

router.get('/providers/new/accreditation', checkIsAuthenticated, providerController.newProviderAccreditation_get)
router.post('/providers/new/accreditation', checkIsAuthenticated, providerController.newProviderAccreditation_post)

router.get('/providers/new/address', checkIsAuthenticated, providerController.newProviderAddress_get)
router.post('/providers/new/address', checkIsAuthenticated, providerController.newProviderAddress_post)

router.get('/providers/new/check', checkIsAuthenticated, providerController.newProviderCheck_get)
router.post('/providers/new/check', checkIsAuthenticated, providerController.newProviderCheck_post)

router.get('/providers/:providerId/edit', checkIsAuthenticated, providerController.editProvider_get)
router.post('/providers/:providerId/edit', checkIsAuthenticated, providerController.editProvider_post)

router.get('/providers/:providerId/edit/check', checkIsAuthenticated, providerController.editProviderCheck_get)
router.post('/providers/:providerId/edit/check', checkIsAuthenticated, providerController.editProviderCheck_post)

router.get('/providers/:providerId/delete', checkIsAuthenticated, providerController.deleteProvider_get)
router.post('/providers/:providerId/delete', checkIsAuthenticated, providerController.deleteProvider_post)

router.get('/providers/:providerId', checkIsAuthenticated, providerController.providerDetails)

router.get('/providers', checkIsAuthenticated, providerController.providersList)

module.exports = router
