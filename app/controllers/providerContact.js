const { getProviderLastUpdated } = require('../helpers/activityLog')
const { isAccreditedProvider } = require('../helpers/accreditation')
const { isValidEmail,isValidTelephone } = require('../helpers/validation')
const { nullIfEmpty } = require('../helpers/string')
const { Provider, ProviderContact, ProviderContactType } = require('../models')
const Pagination = require('../helpers/pagination')

const getContactTypes = async () => {
  return ProviderContactType.findAll({
    where: {
      deletedAt: null
    },
    order: [
      ['rank', 'ASC'],
      ['name', 'ASC']
    ]
  })
}

const getContactTypeLabel = (contactTypes, contact) => {
  if (!contact?.contactTypeId) {
    return 'Not entered'
  }

  const contactType = contactTypes.find((type) => type.id === contact.contactTypeId)

  if (!contactType) {
    return 'Not entered'
  }

  if (contactType.name === 'Other' && contact.contactTypeOther?.length) {
    return `Other - ${contact.contactTypeOther}`
  }

  return contactType.name
}

const getContactTypeOtherValue = async (contactTypeId, contactTypeOther) => {
  if (!contactTypeId) {
    return null
  }

  const contactType = await ProviderContactType.findByPk(contactTypeId)
  if (!contactType || contactType.name !== 'Other') {
    return null
  }

  return nullIfEmpty(contactTypeOther)
}

/// ------------------------------------------------------------------------ ///
/// List provider contacts
/// ------------------------------------------------------------------------ ///

exports.providerContactsList = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1
  const limit = parseInt(req.query.limit, 10) || 15
  const offset = (page - 1) * limit

  // get the providerId from the request for use in subsequent queries
  const { providerId } = req.params

  // get the current provider
  const provider = await Provider.findByPk(providerId)

  // Run in parallel: accreditation flag + last update (by providerId)
  const [isAccredited, lastUpdate] = await Promise.all([
    isAccreditedProvider({ providerId }),
    getProviderLastUpdated(providerId, { includeDeletedChildren: true })
  ])

  // Get the total number of contacts for pagination metadata
  const totalCount = await ProviderContact.count({
    where: {
      providerId,
      'deletedAt': null
    }
  })

  // Only fetch ONE page of contacts
  const contacts = await ProviderContact.findAll({
    where: {
      providerId,
      'deletedAt': null
    },
    include: [
      {
        model: ProviderContactType,
        as: 'contactType'
      }
    ],
    order: [['id', 'ASC']],
    limit,
    offset
  })

  // Create your Pagination object
  // using the chunk + the overall total count
  const pagination = new Pagination(contacts, totalCount, page, limit)

  // Clear session provider data
  delete req.session.data.contact

  res.render('providers/contacts/index', {
    provider,
    isAccredited,
    lastUpdate,
    // Contacts for *this* page
    contacts: pagination.getData(),
    // The pagination metadata (pageItems, nextPage, etc.)
    pagination,
    actions: {
      new: `/support/providers/${providerId}/contacts/new`,
      change: `/support/providers/${providerId}/contacts`,
      delete: `/support/providers/${providerId}/contacts`
    }
  })
}

/// ------------------------------------------------------------------------ ///
/// Show single provider accreditataion
/// ------------------------------------------------------------------------ ///

exports.providerContactDetails = async (req, res) => {
  const { contactId } = req.params

  // Clear session provider data
  delete req.session.data.contact

  const contact = await ProviderContact.findByPk(contactId, {
    include: [
      {
        model: Provider,
        as: 'provider'
      }
    ]
  })
  res.render('providers/contacts/show', { contact })
}

/// ------------------------------------------------------------------------ ///
/// New provider contact
/// ------------------------------------------------------------------------ ///

exports.newProviderContact_get = async (req, res) => {
  const { providerId } = req.params
  const { contact } = req.session.data
  const provider = await Provider.findByPk(providerId)
  const contactTypes = await getContactTypes()

  let back = `/support/providers/${providerId}/contacts`
  if (req.query.referrer === 'check') {
    back = `/support/providers/${providerId}/contacts/new/check`
  }

  res.render('providers/contacts/edit', {
    provider,
    contact,
    contactTypes,
    actions: {
      back,
      cancel: `/support/providers/${providerId}/contacts`,
      save: `/support/providers/${providerId}/contacts/new`
    }
  })
}

exports.newProviderContact_post = async (req, res) => {
  const { providerId } = req.params
  const { contact } = req.session.data
  const provider = await Provider.findByPk(providerId)
  const contactTypes = await getContactTypes()
  const errors = []

  if (!contact.firstName.length) {
    const error = {}
    error.fieldName = "firstName"
    error.href = "#firstName"
    error.text = "Enter first name"
    errors.push(error)
  }

  if (!contact.lastName.length) {
    const error = {}
    error.fieldName = "lastName"
    error.href = "#lastName"
    error.text = "Enter last name"
    errors.push(error)
  }

  if (!contact.email.length) {
    const error = {}
    error.fieldName = "email"
    error.href = "#email"
    error.text = "Enter email address"
    errors.push(error)
  } else if (!isValidEmail(contact.email)) {
    const error = {}
    error.fieldName = 'email'
    error.href = '#email'
    error.text = 'Enter an email address in the correct format, like name@example.com'
    errors.push(error)
  }

  if (contact.telephone.length && !isValidTelephone(contact.telephone)) {
    const error = {}
    error.fieldName = 'telephone'
    error.href = '#telephone'
    error.text = 'Enter a phone number, like 01632 960 001, 07700 900 982 or +44 808 157 0192'
    errors.push(error)
  }

  if (!contact.contactTypeId?.length) {
    const error = {}
    error.fieldName = 'contactTypeId'
    error.href = '#contactTypeId'
    error.text = 'Select role'
    errors.push(error)
  } else {
    const selectedType = contactTypes.find((type) => type.id === contact.contactTypeId)
    if (selectedType?.name === 'Other' && !contact.contactTypeOther?.length) {
      const error = {}
      error.fieldName = 'contactTypeOther'
      error.href = '#contactTypeOther'
      error.text = 'Enter other role'
      errors.push(error)
    }
  }

  if (errors.length) {
    let back = `/support/providers/${providerId}/contacts`
    if (req.query.referrer === 'check') {
      back = `/support/providers/${providerId}/contacts/new/check`
    }

    res.render('providers/contacts/edit', {
      provider,
      contact,
      contactTypes,
      errors,
      actions: {
        back,
        cancel: `/support/providers/${providerId}/contacts`,
        save: `/support/providers/${providerId}/contacts/new`
      }
    })
  } else {
    res.redirect(`/support/providers/${providerId}/contacts/new/check`)
  }
}

exports.newProviderContactCheck_get = async (req, res) => {
  const { providerId } = req.params
  const { contact } = req.session.data
  const provider = await Provider.findByPk(providerId)
  const contactTypes = await getContactTypes()
  res.render('providers/contacts/check-your-answers', {
    provider,
    contact,
    contactTypeLabel: getContactTypeLabel(contactTypes, contact),
    actions: {
      back: `/support/providers/${providerId}/contacts/new`,
      cancel: `/support/providers/${providerId}/contacts`,
      change: `/support/providers/${providerId}/contacts/new`,
      save: `/support/providers/${providerId}/contacts/new/check`
    }
  })
}

exports.newProviderContactCheck_post = async (req, res) => {
  const { providerId } = req.params
  const { contact } = req.session.data
  const userId = req.user.id
  const contactTypeOther = await getContactTypeOtherValue(contact.contactTypeId, contact.contactTypeOther)

  await ProviderContact.create({
    providerId,
    contactTypeId: contact.contactTypeId,
    contactTypeOther,
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: nullIfEmpty(contact.email),
    telephone: nullIfEmpty(contact.telephone),
    createdById: userId,
    updatedById: userId
  })

  delete req.session.data.contact

  req.flash('success', 'Contact added')
  res.redirect(`/support/providers/${req.params.providerId}/contacts`)
}

/// ------------------------------------------------------------------------ ///
/// Edit provider contact
/// ------------------------------------------------------------------------ ///

exports.editProviderContact_get = async (req, res) => {
  const { contactId, providerId } = req.params
  const provider = await Provider.findByPk(providerId)
  const currentContact = await ProviderContact.findByPk(contactId)
  const contactTypes = await getContactTypes()

  let contact
  if (req.session.data?.contact) {
    contact = req.session.data.contact
  } else {
    contact = await ProviderContact.findByPk(contactId)
  }

  let back = `/support/providers/${providerId}/contacts`
  if (req.query.referrer === 'check') {
    back = `/support/providers/${providerId}/contacts/${contactId}/edit/check`
  }

  res.render('providers/contacts/edit', {
    provider,
    currentContact,
    contact,
    contactTypes,
    actions: {
      back,
      cancel: `/support/providers/${providerId}/contacts`,
      save: `/support/providers/${providerId}/contacts/${contactId}/edit`
    }
  })
}

exports.editProviderContact_post = async (req, res) => {
  const { contactId, providerId } = req.params
  const { contact } = req.session.data
  const provider = await Provider.findByPk(providerId)
  const currentContact = await ProviderContact.findByPk(contactId)
  const contactTypes = await getContactTypes()

  const errors = []

  if (!contact.firstName.length) {
    const error = {}
    error.fieldName = "firstName"
    error.href = "#firstName"
    error.text = "Enter first name"
    errors.push(error)
  }

  if (!contact.lastName.length) {
    const error = {}
    error.fieldName = "lastName"
    error.href = "#lastName"
    error.text = "Enter last name"
    errors.push(error)
  }

  if (!contact.email.length) {
    const error = {}
    error.fieldName = "email"
    error.href = "#email"
    error.text = "Enter email address"
    errors.push(error)
  } else if (!isValidEmail(contact.email)) {
    const error = {}
    error.fieldName = 'email'
    error.href = '#email'
    error.text = 'Enter an email address in the correct format, like name@example.com'
    errors.push(error)
  }

  if (contact.telephone.length && !isValidTelephone(contact.telephone)) {
    const error = {}
    error.fieldName = 'telephone'
    error.href = '#telephone'
    error.text = 'Enter a phone number, like 01632 960 001, 07700 900 982 or +44 808 157 0192'
    errors.push(error)
  }

  if (!contact.contactTypeId?.length) {
    const error = {}
    error.fieldName = 'contactTypeId'
    error.href = '#contactTypeId'
    error.text = 'Select role'
    errors.push(error)
  } else {
    const selectedType = contactTypes.find((type) => type.id === contact.contactTypeId)
    if (selectedType?.name === 'Other' && !contact.contactTypeOther?.length) {
      const error = {}
      error.fieldName = 'contactTypeOther'
      error.href = '#contactTypeOther'
      error.text = 'Enter other role'
      errors.push(error)
    }
  }

  if (errors.length) {
    let back = `/support/providers/${providerId}/contacts`
    if (req.query.referrer === 'check') {
      back = `/support/providers/${providerId}/contacts/${contactId}/edit/check`
    }

    res.render('providers/contacts/edit', {
      provider,
      currentContact,
      contact,
      contactTypes,
      errors,
      actions: {
        back,
        cancel: `/support/providers/${providerId}/contacts`,
        save: `/support/providers/${providerId}/contacts/${contactId}/edit`
      }
    })
  } else {
    res.redirect(`/support/providers/${providerId}/contacts/${contactId}/edit/check`)
  }
}

exports.editProviderContactCheck_get = async (req, res) => {
  const { contactId, providerId } = req.params
  const { contact } = req.session.data
  const provider = await Provider.findByPk(providerId)
  const currentContact = await ProviderContact.findByPk(contactId)
  const contactTypes = await getContactTypes()

  res.render('providers/contacts/check-your-answers', {
    provider,
    currentContact,
    contact,
    contactTypeLabel: getContactTypeLabel(contactTypes, contact),
    actions: {
      back: `/support/providers/${providerId}/contacts/${contactId}/edit`,
      cancel: `/support/providers/${providerId}/contacts`,
      change: `/support/providers/${providerId}/contacts/${contactId}/edit`,
      save: `/support/providers/${providerId}/contacts/${contactId}/edit/check`
    }
  })
}

exports.editProviderContactCheck_post = async (req, res) => {
  const { contactId, providerId } = req.params
  const contact = await ProviderContact.findByPk(contactId)
  const contactTypeOther = await getContactTypeOtherValue(
    req.session.data.contact.contactTypeId,
    req.session.data.contact.contactTypeOther
  )
  await contact.update({
    contactTypeId: req.session.data.contact.contactTypeId,
    contactTypeOther,
    firstName: req.session.data.contact.firstName,
    lastName: req.session.data.contact.lastName,
    email: nullIfEmpty(req.session.data.contact.email),
    telephone: nullIfEmpty(req.session.data.contact.telephone),
    updatedById: req.user.id
  })

  delete req.session.data.contact

  req.flash('success', 'Contact updated')
  res.redirect(`/support/providers/${providerId}/contacts`)
}

/// ------------------------------------------------------------------------ ///
/// Delete provider contact
/// ------------------------------------------------------------------------ ///

exports.deleteProviderContact_get = async (req, res) => {
  const { contactId, providerId } = req.params
  const provider = await Provider.findByPk(providerId)
  const contact = await ProviderContact.findByPk(contactId)

  res.render('providers/contacts/delete', {
    provider,
    contact,
    actions: {
      back: `/support/providers/${providerId}/contacts`,
      cancel: `/support/providers/${providerId}/contacts`,
      save: `/support/providers/${providerId}/contacts/${contactId}/delete`
    }
  })
}

exports.deleteProviderContact_post = async (req, res) => {
  const { contactId, providerId } = req.params
  const userId = req.user.id
  const contact = await ProviderContact.findByPk(contactId)
  await contact.update({
    deletedAt: new Date(),
    deletedById: userId,
    updatedById: userId
  })

  req.flash('success', 'Contact deleted')
  res.redirect(`/support/providers/${providerId}/contacts`)
}
