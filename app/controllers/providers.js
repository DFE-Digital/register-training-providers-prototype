const { v4: uuid } = require('uuid')
const { Provider } = require('../models')

exports.providersList = async (req, res) => {
  const providers = await Provider.findAll()
  delete req.session.data.provider
  res.render('providers/index', { providers })
}

exports.providerDetails = async (req, res) => {
  const provider = await Provider.findOne({ where: { id: req.params.providerId } })
  res.render('providers/show', { provider })
}

exports.newProvider_get = async (req, res) => {
  res.render('providers/edit', {
    provider: req.session.data.provider,
    actions: {
      back: '/providers',
      cancel: '/providers',
      save: '/providers/new'
    }
  })
}

exports.newProvider_post = async (req, res) => {
  const errors = []

  if (!req.session.data.provider.operatingName.length) {
    const error = {}
    error.fieldName = 'operatingName'
    error.href = '#operatingName'
    error.text = 'Enter an operating name'
    errors.push(error)
  }

  if (!req.session.data.provider.legalName.length) {
    const error = {}
    error.fieldName = 'legalName'
    error.href = '#legalName'
    error.text = 'Enter a legal name'
    errors.push(error)
  }

  if (!req.session.data.provider.type) {
    const error = {}
    error.fieldName = 'type'
    error.href = '#type'
    error.text = 'Select a provider type'
    errors.push(error)
  }

  if (errors.length) {
    res.render('providers/edit', {
      provider: req.session.data.provider,
      errors,
      actions: {
        back: '/providers',
        cancel: '/providers',
        save: '/providers/new'
      }
    })
  } else {
    res.redirect('/providers/new/check')
  }
}

exports.newProviderCheck_get = async (req, res) => {
  res.render('providers/check-your-answers', {
    provider: req.session.data.provider,
    actions: {
      back: `/providers/new`,
      cancel: `/providers`,
      save: `/providers/new/check`
    }
  })
}

exports.newProviderCheck_post = async (req, res) => {
  const provider = await Provider.create({
    id: uuid(),
    operatingName: req.session.data.provider.operatingName,
    legalName: req.session.data.provider.legalName,
    type: req.session.data.provider.type,
    code: 'O1A',
    ukprn: 1234567,
    createdAt: new Date(),
    createdById: req.session.passport.user.id
  })

  delete req.session.data.provider

  req.flash('success', 'Provider added')
  res.redirect('/providers')
}

exports.editProvider_get = async (req, res) => {
  const currentProvider = await Provider.findOne({ where: { id: req.params.providerId } })

  let provider
  if (req.session.data.provider) {
    provider = req.session.data.provider
  } else {
    provider = currentProvider
  }

  res.render('providers/edit', {
    currentProvider,
    provider,
    actions: {
      back: `/providers/${req.params.providerId}`,
      cancel: `/providers/${req.params.providerId}`,
      save: `/providers/${req.params.providerId}/edit`
    }
  })
}

exports.editProvider_post = async (req, res) => {
  const errors = []

  if (!req.session.data.provider.operatingName.length) {
    const error = {}
    error.fieldName = 'operatingName'
    error.href = '#operatingName'
    error.text = 'Enter an operating name'
    errors.push(error)
  }

  if (!req.session.data.provider.legalName.length) {
    const error = {}
    error.fieldName = 'legalName'
    error.href = '#legalName'
    error.text = 'Enter a legal name'
    errors.push(error)
  }

  // if (!req.session.data.provider.ukprn.length) {
  //   const error = {}
  //   error.fieldName = 'ukprn'
  //   error.href = '#ukprn'
  //   error.text = 'Enter a UK provider reference number (UKPRN)'
  //   errors.push(error)
  // }

  if (errors.length) {
    res.render('providers/edit', {
      provider: req.session.data.provider,
      errors,
      actions: {
        back: `/providers/${req.params.providerId}`,
        cancel: `/providers/${req.params.providerId}`,
        save: `/providers/${req.params.providerId}/edit`
      }
    })
  } else {
    res.redirect(`/providers/${req.params.providerId}/edit/check`)
  }
}

exports.editProviderCheck_get = async (req, res) => {
  const currentProvider = await Provider.findOne({ where: { id: req.params.providerId } })

  res.render('providers/check-your-answers', {
    currentProvider,
    provider: req.session.data.provider,
    actions: {
      back: `/providers/${req.params.providerId}/edit`,
      cancel: `/providers/${req.params.providerId}`,
      save: `/providers/${req.params.providerId}/edit/check`
    }
  })
}

exports.editProviderCheck_post = async (req, res) => {
  const provider = await Provider.findOne({ where: { id: req.params.providerId } })
  provider.update({
    operatingName: req.session.data.provider.operatingName,
    legalName: req.session.data.provider.legalName,
    type: req.session.data.provider.type,
    code: 'O1A',
    ukprn: 1234567,
    updatedAt: new Date(),
    updatedById: req.session.passport.user.id
  })

  delete req.session.data.provider

  req.flash('success', 'Provider updated')
  res.redirect(`/providers/${req.params.providerId}`)
}

exports.deleteProvider_get = async (req, res) => {
  const provider = await Provider.findOne({ where: { id: req.params.providerId } })
  res.render('providers/delete', { provider })
}

exports.deleteProvider_post = async (req, res) => {
  const provider = await Provider.findOne({ where: { id: req.params.providerId } })
  provider.destroy()

  req.flash('success', 'Provider removed')
  res.redirect('/providers')
}
