const revisionFields = require('../constants/revisionFields')

const createRevisionHook = ({ revisionModelName, modelKey }) => {
  return async (instance, options) => {
    const sequelize = instance.sequelize
    const RevisionModel = sequelize.models[revisionModelName]
    const trackedFields = revisionFields[modelKey] || []

    // Determine revisionById (if possible)
    const revisionById = instance.get('updatedById') || instance.get('createdById') || null

    // Always create revision on creation
    if (options?.hookName === 'afterCreate') {
      await RevisionModel.create({
        ...instance.get({ plain: true }),
        [`${modelKey}Id`]: instance.id,
        revisionNumber: 1,
        revisionById: revisionById
      })
      return
    }

    // Get the latest revision
    const latest = await RevisionModel.findOne({
      where: { [`${modelKey}Id`]: instance.id },
      order: [['revisionNumber', 'DESC']]
    })

    if (!latest) {
      await RevisionModel.create({
        ...instance.get({ plain: true }),
        [`${modelKey}Id`]: instance.id,
        revisionNumber: 1,
        revisionById: revisionById
      })
      return
    }

    const hasChanged = trackedFields.some(field => {
      return instance.get(field) !== latest.get(field)
    })

    if (!hasChanged) return

    const revisionData = {
      ...instance.get({ plain: true }),
      [`${modelKey}Id`]: instance.id,
      revisionNumber: latest.revisionNumber + 1,
      revisionById: revisionById
    }

    delete revisionData.id
    await RevisionModel.create(revisionData)
  }
}

module.exports = createRevisionHook
