const revisionFields = require('../constants/revisionFields')

const createRevisionHook = ({ revisionModelName, modelKey }) => {
  return async (instance, options) => {
    const sequelize = instance.sequelize
    const RevisionModel = sequelize.models[revisionModelName]
    const trackedFields = revisionFields[modelKey] || []

    // Compute revisionById from the source row (fallback to null)
    const revisionById =
      instance.get('updatedById') ||
      instance.get('createdById') ||
      null

    // Only copy fields that actually exist on the revision model
    const src = instance.get({ plain: true })
    const pickForRevision = (obj) => {
      const revisionAttrs = Object.keys(RevisionModel.rawAttributes)
      const omit = new Set(['id']) // add other auto fields if you like
      return Object.fromEntries(
        Object.entries(obj).filter(([k]) => revisionAttrs.includes(k) && !omit.has(k))
      )
    }

    // Helper to build the payload consistently
    const buildPayload = (overrides = {}) => ({
      ...pickForRevision(src),
      [`${modelKey}Id`]: instance.id,
      revisionById,
      // let DB default set revisionAt, or set here:
      // revisionAt: new Date(),
      ...overrides
    })

    // Always create revision on creation
    if (options?.hookName === 'afterCreate') {
      await RevisionModel.create(buildPayload({ revisionNumber: 1 }))
      return
    }

    // Get latest revision
    const latest = await RevisionModel.findOne({
      where: { [`${modelKey}Id`]: instance.id },
      order: [['revisionNumber', 'DESC']]
    })

    if (!latest) {
      await RevisionModel.create(buildPayload({ revisionNumber: 1 }))
      return
    }

    // Compare only tracked fields
    const hasChanged = trackedFields.some(field => {
      return instance.get(field) !== latest.get(field)
    })
    if (!hasChanged) return

    await RevisionModel.create(
      buildPayload({ revisionNumber: latest.revisionNumber + 1 })
    )
  }
}

module.exports = createRevisionHook
