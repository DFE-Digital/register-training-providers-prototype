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
/// Controller modules
/// ------------------------------------------------------------------------ ///
const userController = require('./controllers/users')

/// ------------------------------------------------------------------------ ///
// Authentication middleware
/// ------------------------------------------------------------------------ ///
const checkIsAuthenticated = (req, res, next) => {
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
  res.redirect('/users')
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

module.exports = router
