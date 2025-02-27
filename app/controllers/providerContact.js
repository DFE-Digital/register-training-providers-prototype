const { v4: uuid } = require('uuid')
const { Provider, ProviderContact } = require('../models')
const { isAccreditedProvider } = require('../helpers/accreditation')
const Pagination = require('../helpers/pagination')

/// ------------------------------------------------------------------------ ///
/// List provider contacts
/// ------------------------------------------------------------------------ ///

exports.providerContactsList = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1
  const limit = parseInt(req.query.limit, 10) || 50
  const offset = (page - 1) * limit

  // get the providerId from the request for use in subsequent queries
  const { providerId } = req.params

  // get the current provider
  const provider = await Provider.findByPk(providerId)

  // calculate if the provider is accredited
  const isAccredited = await isAccreditedProvider({ providerId })

  // Get the total number of contacts for pagination metadata
  const totalCount = await ProviderContact.count({
    where: { providerId }
  })

  // Only fetch ONE page of contacts
  const contacts = await ProviderContact.findAll({
    where: { providerId },
    order: [['id', 'ASC']],
    limit,
    offset
  })

  // Create your Pagination object
  // using the chunk + the overall total count
  const pagination = new Pagination(contacts, totalCount, page, limit)

  // Clear session provider data
  delete req.session.data.contact

  res.render('providers/contact/index', {
    provider,
    isAccredited,
    // Contacts for *this* page
    contacts: pagination.getData(),
    // The pagination metadata (pageItems, nextPage, etc.)
    pagination,
    actions: {
      new: `/providers/${providerId}/contacts/new`
    }
  })
}

/// ------------------------------------------------------------------------ ///
/// Show single provider accreditataion
/// ------------------------------------------------------------------------ ///

exports.providerContactDetails = async (req, res) => {
  // Clear session provider data
  delete req.session.data.contact

  const contact = await ProviderContact.findByPk(req.params.contactId, {
    include: [
      {
        model: Provider,
        as: 'provider'
      }
    ]
  })
  res.render('providers/contact/show', { contact })
}

/// ------------------------------------------------------------------------ ///
/// New provider contact
/// ------------------------------------------------------------------------ ///

exports.newProviderContact_get = async (req, res) => {
  const provider = await Provider.findByPk(req.params.providerId)

  let back = `/providers/${req.params.providerId}`
  if (req.query.referrer === 'check') {
    back = `/providers/${req.params.providerId}/contacts/new/check`
  }

  res.render('providers/contact/edit', {
    provider,
    contact: req.session.data.contact,
    actions: {
      back,
      cancel: `/providers/${req.params.providerId}`,
      save: `/providers/${req.params.providerId}/contacts/new`
    }
  })
}

exports.newProviderContact_post = async (req, res) => {
  const provider = await Provider.findByPk(req.params.providerId)
  const errors = []

  if (!req.session.data.contact.firstName.length) {
    const error = {}
    error.fieldName = "firstName"
    error.href = "#firstName"
    error.text = "Enter a first name"
    errors.push(error)
  }

  if (!req.session.data.contact.lastName.length) {
    const error = {}
    error.fieldName = "lastName"
    error.href = "#lastName"
    error.text = "Enter a last name"
    errors.push(error)
  }

  if (!req.session.data.contact.email.length) {
    const error = {}
    error.fieldName = "email"
    error.href = "#email"
    error.text = "Enter an email address"
    errors.push(error)
  }

  if (!req.session.data.contact.telephone.length) {
    const error = {}
    error.fieldName = "telephone"
    error.href = "#telephone"
    error.text = "Enter a telephone number"
    errors.push(error)
  }

  if (errors.length) {
    let back = `/providers/${req.params.providerId}`
    if (req.query.referrer === 'check') {
      back = `/providers/${req.params.providerId}/contacts/new/check`
    }

    res.render('providers/contact/edit', {
      provider,
      contact: req.session.data.contact,
      errors,
      actions: {
        back,
        cancel: `/providers/${req.params.providerId}`,
        save: `/providers/${req.params.providerId}/contacts/new`
      }
    })
  } else {
    res.redirect(`/providers/${req.params.providerId}/contacts/new/check`)
  }
}

exports.newProviderContactCheck_get = async (req, res) => {
  const provider = await Provider.findByPk(req.params.providerId)
  res.render('providers/contact/check-your-answers', {
    provider,
    contact: req.session.data.contact,
    actions: {
      back: `/providers/${req.params.providerId}/contacts/new`,
      cancel: `/providers/${req.params.providerId}`,
      change: `/providers/${req.params.providerId}/contacts/new`,
      save: `/providers/${req.params.providerId}/contacts/new/check`
    }
  })
}

exports.newProviderContactCheck_post = async (req, res) => {
  await ProviderContact.create({
    id: uuid(),
    providerId: req.params.providerId,
    firstName: req.session.data.contact.firstName,
    lastName: req.session.data.contact.lastName,
    email: req.session.data.contact.email.length ? req.session.data.contact.email : null,
    telephone: req.session.data.contact.telephone.length ? req.session.data.contact.telephone : null,
    createdAt: new Date(),
    createdById: req.session.passport.user.id
  })

  delete req.session.data.contact

  req.flash('success', 'Contact added')
  res.redirect(`/providers/${req.params.providerId}`)
}

/// ------------------------------------------------------------------------ ///
/// Edit provider contact
/// ------------------------------------------------------------------------ ///

exports.editProviderContact_get = async (req, res) => {
  const provider = await Provider.findByPk(req.params.providerId)
  const currentContact = await ProviderContact.findByPk(req.params.contactId)

  let contact
  if (req.session.data?.contact) {
    contact = req.session.data.contact
  } else {
    contact = await ProviderContact.findByPk(req.params.contactId)
  }

  let back = `/providers/${req.params.providerId}`
  if (req.query.referrer === 'check') {
    back = `/providers/${req.params.providerId}/contacts/${req.params.contactId}/edit/check`
  }

  res.render('providers/contact/edit', {
    provider,
    currentContact,
    contact,
    actions: {
      back,
      cancel: `/providers/${req.params.providerId}`,
      save: `/providers/${req.params.providerId}/contacts/${req.params.contactId}/edit`
    }
  })
}

exports.editProviderContact_post = async (req, res) => {
  const provider = await Provider.findByPk(req.params.providerId)
  const currentContact = await ProviderContact.findByPk(req.params.contactId)

  const errors = []

  if (!req.session.data.contact.firstName.length) {
    const error = {}
    error.fieldName = "firstName"
    error.href = "#firstName"
    error.text = "Enter a first name"
    errors.push(error)
  }

  if (!req.session.data.contact.lastName.length) {
    const error = {}
    error.fieldName = "lastName"
    error.href = "#lastName"
    error.text = "Enter a last name"
    errors.push(error)
  }

  if (!req.session.data.contact.email.length) {
    const error = {}
    error.fieldName = "email"
    error.href = "#email"
    error.text = "Enter an email address"
    errors.push(error)
  }

  if (!req.session.data.contact.telephone.length) {
    const error = {}
    error.fieldName = "telephone"
    error.href = "#telephone"
    error.text = "Enter a telephone number"
    errors.push(error)
  }

  if (errors.length) {
    let back = `/providers/${req.params.providerId}`
    if (req.query.referrer === 'check') {
      back = `/providers/${req.params.providerId}/contacts/${req.params.contactId}/edit/check`
    }

    res.render('providers/contact/edit', {
      provider,
      currentContact,
      contact: req.session.data.contact,
      errors,
      actions: {
        back,
        cancel: `/providers/${req.params.providerId}`,
        save: `/providers/${req.params.providerId}/contacts/${req.params.contactId}/edit`
      }
    })
  } else {
    res.redirect(`/providers/${req.params.providerId}/contacts/${req.params.contactId}/edit/check`)
  }
}

exports.editProviderContactCheck_get = async (req, res) => {
  const provider = await Provider.findByPk(req.params.providerId)
  const currentContact = await ProviderContact.findByPk(req.params.contactId)

  res.render('providers/contact/check-your-answers', {
    provider,
    currentContact,
    contact: req.session.data.contact,
    actions: {
      back: `/providers/${req.params.providerId}/contacts/${req.params.contactId}/edit`,
      cancel: `/providers/${req.params.providerId}`,
      change: `/providers/${req.params.providerId}/contacts/${req.params.contactId}/edit`,
      save: `/providers/${req.params.providerId}/contacts/${req.params.contactId}/edit/check`
    }
  })
}

exports.editProviderContactCheck_post = async (req, res) => {
  const contact = await ProviderContact.findByPk(req.params.contactId)
  await contact.update({
    firstName: req.session.data.contact.firstName,
    lastName: req.session.data.contact.lastName,
    email: req.session.data.contact.email.length ? req.session.data.contact.email : null,
    telephone: req.session.data.contact.telephone.length ? req.session.data.contact.telephone : null,
    updatedAt: new Date(),
    updatedById: req.session.passport.user.id
  })

  delete req.session.data.contact

  req.flash('success', 'Contact updated')
  res.redirect(`/providers/${req.params.providerId}`)
}

/// ------------------------------------------------------------------------ ///
/// Delete provider contact
/// ------------------------------------------------------------------------ ///

exports.deleteProviderContact_get = async (req, res) => {
  const provider = await Provider.findByPk(req.params.providerId)
  const contact = await ProviderContact.findByPk(req.params.contactId)
  res.render('providers/contact/delete', {
    provider,
    contact,
    actions: {
      back: `/providers/${req.params.providerId}`,
      cancel: `/providers/${req.params.providerId}`,
      save: `/providers/${req.params.providerId}/contacts/${req.params.contactId}/delete`
    }
  })
}

exports.deleteProviderContact_post = async (req, res) => {
  const contact = await ProviderContact.findByPk(req.params.contactId)
  await contact.destroy()

  req.flash('success', 'Contact removed')
  res.redirect(`/providers/${req.params.providerId}`)
}
