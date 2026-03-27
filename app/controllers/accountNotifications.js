const { UserNotification } = require('../models')

const FREQUENCY_LABELS = {
  daily: 'Once a day',
  weekly: 'Once a week',
  immediate: 'Each time a provider is updated (you may get more than one email a day)',
  never: 'I do not want to receive emails'
}

const CHANGE_OPTIONS = [
  { value: 'provider_details', label: 'Provider details', field: 'providerDetails' },
  { value: 'provider_accreditations', label: 'Provider accreditations', field: 'providerAccreditations' },
  { value: 'provider_addresses', label: 'Provider addresses', field: 'providerAddresses' },
  { value: 'provider_contacts', label: 'Provider contacts', field: 'providerContacts' },
  { value: 'provider_partnerships', label: 'Provider partnerships', field: 'providerPartnerships' },
  { value: 'provider_users', label: 'Provider users', field: 'providerUsers' }
]

const getSessionData = (req) => {
  req.session.data = req.session.data || {}
  req.session.data.accountNotifications = req.session.data.accountNotifications || {}
  return req.session.data.accountNotifications
}

const normaliseSelection = (value) => {
  if (!value) return []
  if (Array.isArray(value)) return value
  return [value]
}

const ensureSessionFromExisting = async (req) => {
  const sessionData = getSessionData(req)
  if (sessionData.notificationFrequency && sessionData.changes != null) {
    return sessionData
  }

  const existing = await UserNotification.findOne({
    where: {
      userId: req.user.id,
      deletedAt: null
    }
  })

  if (!existing) {
    return sessionData
  }

  if (!sessionData.notificationFrequency) {
    sessionData.notificationFrequency = existing.notificationFrequency
  }

  if (sessionData.changes == null) {
    sessionData.changes = CHANGE_OPTIONS
      .filter((option) => Boolean(existing[option.field]))
      .map((option) => option.value)
  }

  return sessionData
}

const getReferrer = (req) => (req.query.referrer === 'check' ? 'check' : null)

const buildCheckboxItems = (selected) => (
  CHANGE_OPTIONS.map((option) => ({
    value: option.value,
    text: option.label,
    checked: selected.includes(option.value)
  }))
)

const ensureSupportUser = (req, res) => {
  if (req.user?.type !== 'support') {
    res.redirect('/account')
    return false
  }
  return true
}

exports.notificationsFrequency_get = async (req, res) => {
  if (!ensureSupportUser(req, res)) return

  const referrer = getReferrer(req)
  const sessionData = await ensureSessionFromExisting(req)

  res.render('account/notifications/frequency', {
    errors: [],
    notificationFrequency: sessionData.notificationFrequency,
    referrer,
    actions: {
      back: referrer ? '/account/notifications/check' : '/account',
      cancel: '/account',
      save: referrer ? '/account/notifications?referrer=check' : '/account/notifications'
    }
  })
}

exports.notificationsFrequency_post = async (req, res) => {
  if (!ensureSupportUser(req, res)) return

  const referrer = getReferrer(req)
  const sessionData = getSessionData(req)
  const errors = []

  if (!sessionData.notificationFrequency) {
    errors.push({
      fieldName: 'notificationFrequency',
      href: '#notificationFrequency',
      text: 'Select how often you want to get emails'
    })
  }

  if (errors.length) {
    return res.render('account/notifications/frequency', {
      errors,
      notificationFrequency: sessionData.notificationFrequency,
      referrer,
      actions: {
        back: referrer ? '/account/notifications/check' : '/account',
        cancel: '/account',
        save: referrer ? '/account/notifications?referrer=check' : '/account/notifications'
      }
    })
  }

  if (sessionData.notificationFrequency === 'never') {
    sessionData.changes = []
    return res.redirect('/account/notifications/check')
  }

  if (referrer) {
    return res.redirect('/account/notifications/changes?referrer=check')
  }

  res.redirect('/account/notifications/changes')
}

exports.notificationsChanges_get = async (req, res) => {
  if (!ensureSupportUser(req, res)) return

  const referrer = getReferrer(req)
  const sessionData = await ensureSessionFromExisting(req)

  if (!sessionData.notificationFrequency) {
    return res.redirect('/account/notifications')
  }

  if (sessionData.notificationFrequency === 'never') {
    return res.redirect('/account/notifications/check')
  }

  const selectedChanges = normaliseSelection(sessionData.changes)

  res.render('account/notifications/changes', {
    errors: [],
    referrer,
    changeItems: buildCheckboxItems(selectedChanges),
    actions: {
      back: referrer ? '/account/notifications/check' : '/account/notifications',
      cancel: '/account',
      save: referrer ? '/account/notifications/changes?referrer=check' : '/account/notifications/changes'
    }
  })
}

exports.notificationsChanges_post = async (req, res) => {
  if (!ensureSupportUser(req, res)) return

  const referrer = getReferrer(req)
  const sessionData = getSessionData(req)
  const errors = []

  if (!sessionData.notificationFrequency) {
    return res.redirect('/account/notifications')
  }

  const selectedChanges = normaliseSelection(sessionData.changes)

  if (sessionData.notificationFrequency !== 'never' && selectedChanges.length === 0) {
    errors.push({
      fieldName: 'changes',
      href: '#changes',
      text: 'Select what changes you want to be notified about'
    })
  }

  if (errors.length) {
    return res.render('account/notifications/changes', {
      errors,
      referrer,
      changeItems: buildCheckboxItems(selectedChanges),
      actions: {
        back: referrer ? '/account/notifications/check' : '/account/notifications',
        cancel: '/account',
        save: referrer ? '/account/notifications/changes?referrer=check' : '/account/notifications/changes'
      }
    })
  }

  res.redirect('/account/notifications/check')
}

exports.notificationsCheck_get = async (req, res) => {
  if (!ensureSupportUser(req, res)) return

  const sessionData = await ensureSessionFromExisting(req)

  if (!sessionData.notificationFrequency) {
    return res.redirect('/account/notifications')
  }

  const selectedChanges = normaliseSelection(sessionData.changes)
  const changeLabels = CHANGE_OPTIONS
    .filter((option) => selectedChanges.includes(option.value))
    .map((option) => option.label)

  res.render('account/notifications/check-your-answers', {
    notificationFrequencyLabel: FREQUENCY_LABELS[sessionData.notificationFrequency],
    changeLabels,
    actions: {
      back: '/account/notifications/changes',
      cancel: '/account',
      changeFrequency: '/account/notifications?referrer=check',
      changeChanges: '/account/notifications/changes?referrer=check',
      save: '/account/notifications/check'
    }
  })
}

exports.notificationsCheck_post = async (req, res) => {
  if (!ensureSupportUser(req, res)) return

  const sessionData = getSessionData(req)

  if (!sessionData.notificationFrequency) {
    return res.redirect('/account/notifications')
  }

  const frequency = sessionData.notificationFrequency
  let selectedChanges = normaliseSelection(sessionData.changes)

  if (frequency === 'never') {
    selectedChanges = []
  }

  const payload = {
    notificationFrequency: frequency,
    providerDetails: selectedChanges.includes('provider_details'),
    providerAccreditations: selectedChanges.includes('provider_accreditations'),
    providerAddresses: selectedChanges.includes('provider_addresses'),
    providerContacts: selectedChanges.includes('provider_contacts'),
    providerPartnerships: selectedChanges.includes('provider_partnerships'),
    providerUsers: selectedChanges.includes('provider_users'),
    updatedById: req.user.id
  }

  const existing = await UserNotification.findOne({
    where: {
      userId: req.user.id,
      deletedAt: null
    }
  })

  if (existing) {
    await existing.update(payload)
  } else {
    await UserNotification.create({
      userId: req.user.id,
      ...payload,
      createdById: req.user.id
    })
  }

  delete req.session.data.accountNotifications

  req.flash('success', 'Email notifications updated')
  res.redirect('/account')
}
