const { Op } = require('sequelize')

const { Provider, ProviderAccreditation } = require('../models')

const getAccreditedProviderIds = async (now, options = {}) => {
  const rows = await ProviderAccreditation.findAll({
    attributes: ['providerId'],
    where: {
      deletedAt: null,
      startsOn: { [Op.lte]: now },
      [Op.or]: [
        { endsOn: null },
        { endsOn: { [Op.gte]: now } }
      ]
    },
    group: ['providerId'],
    transaction: options.transaction
  })

  return rows.map(row => row.providerId)
}

const refreshProviderAccreditationStatus = async (providerId, options = {}) => {
  const now = new Date()

  const accreditationCount = await ProviderAccreditation.count({
    where: {
      providerId,
      deletedAt: null,
      startsOn: { [Op.lte]: now },
      [Op.or]: [
        { endsOn: null },
        { endsOn: { [Op.gte]: now } }
      ]
    },
    transaction: options.transaction
  })

  const provider = await Provider.findByPk(providerId, {
    transaction: options.transaction
  })

  if (!provider) return null

  const nextValue = accreditationCount > 0

  if (provider.isAccredited !== nextValue) {
    await provider.update({ isAccredited: nextValue }, { transaction: options.transaction })
  }

  return nextValue
}

const refreshAllProviderAccreditationStatuses = async (options = {}) => {
  const now = new Date()
  const accreditedProviderIds = await getAccreditedProviderIds(now, options)

  if (accreditedProviderIds.length) {
    await Provider.update(
      { isAccredited: true },
      {
        where: {
          id: { [Op.in]: accreditedProviderIds },
          isAccredited: false
        },
        transaction: options.transaction
      }
    )
  }

  const notInClause = accreditedProviderIds.length
    ? { id: { [Op.notIn]: accreditedProviderIds } }
    : {}

  await Provider.update(
    { isAccredited: false },
    {
      where: {
        ...notInClause,
        isAccredited: true
      },
      transaction: options.transaction
    }
  )

  return accreditedProviderIds.length
}

const startAccreditationStatusScheduler = (intervalMs = 1000 * 60 * 60) => {
  if (global.__accreditationStatusSchedulerStarted) return
  global.__accreditationStatusSchedulerStarted = true

  const runRefresh = async () => {
    try {
      await refreshAllProviderAccreditationStatuses()
    } catch (error) {
      console.error('Accreditation status refresh failed:', error)
    }
  }

  runRefresh()
  setInterval(runRefresh, intervalMs)
}

module.exports = {
  refreshProviderAccreditationStatus,
  refreshAllProviderAccreditationStatuses,
  startAccreditationStatusScheduler
}
