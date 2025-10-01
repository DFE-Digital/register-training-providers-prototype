/**
 * Generic revisioning hook.
 * Creates a new revision row for a model whenever tracked fields change.
 */

const revisionFields = require('../constants/revisionFields')

/**
 * @typedef {Object} RevisionHookConfig
 * @property {string} revisionModelName - The Sequelize model name of the revision table (e.g. 'ProviderContactRevision').
 * @property {string} modelKey          - Key used in `revisionFields` and to construct FK (e.g. 'providerContact' -> 'providerContactId').
 */

/**
 * @typedef {Object} RevisionHookOptions
 * @property {'afterCreate'|'afterUpdate'|'afterDestroy'} [hookName] - Name of the lifecycle hook that invoked this function.
 * // Note: Sequelize will pass many other options (transaction, logging, etc.); we keep the type open.
 */

/**
 * Factory that returns a Sequelize hook to create revision rows.
 *
 * Behaviour:
 *  - On creation (`afterCreate`), writes revision #1.
 *  - On updates, compares only fields listed in `revisionFields[modelKey]`;
 *    if any changed, increments `revisionNumber` and writes a new row.
 *  - Sets `revisionById` from `updatedById` falling back to `createdById`.
 *  - Sets `revisionAt` on write (so activities have a stable timestamp).
 *  - Emits an `activityAction` alongside the create so the activity hook
 *    can log 'create'/'update' (and 'delete' if you detect soft delete).
 *
 * Soft deletes:
 *  - If you soft-delete on the *source* model (set `deletedAt` then save),
 *    detect that change here and pass `activityAction: 'delete'`.
 *
 * @param {RevisionHookConfig} param0
 * @returns {(instance: import('sequelize').Model, options?: RevisionHookOptions) => Promise<void>}
 */
const createRevisionHook = ({ revisionModelName, modelKey }) => {
  return async (instance, options = {}) => {
    const sequelize = instance.sequelize
    const RevisionModel = sequelize.models[revisionModelName]
    const trackedFields = revisionFields[modelKey] || []

    // Who caused the change
    const revisionById =
      instance.get('updatedById') ||
      instance.get('createdById') ||
      null

    // Safely pick only attributes that exist on the revision model
    const src = instance.get({ plain: true })
    const pickForRevision = (obj) => {
      const revisionAttrs = Object.keys(RevisionModel.rawAttributes)
      const omit = new Set(['id']) // avoid copying PK from source into revision
      return Object.fromEntries(
        Object.entries(obj).filter(([k]) => revisionAttrs.includes(k) && !omit.has(k))
      )
    }

    const buildPayload = (overrides = {}) => ({
      ...pickForRevision(src),
      [`${modelKey}Id`]: instance.id,
      revisionById,
      revisionAt: new Date(),
      ...overrides
    })

    // First revision on create
    if (options?.hookName === 'afterCreate') {
      await RevisionModel.create(
        buildPayload({ revisionNumber: 1 }),
        /** @type {import('sequelize').CreateOptions & { activityAction?: 'create' }} */ ({
          activityAction: 'create'
        })
      )
      return
    }

    // Find latest existing revision
    const latest = await RevisionModel.findOne({
      where: { [`${modelKey}Id`]: instance.id },
      order: [['revisionNumber', 'DESC']]
    })

    // 🔎 Add your debug log right here:
    // console.log('[revHook]', {
    //   modelKey,
    //   hook: options?.hookName || 'afterUpdate',
    //   changed_deletedAt: typeof instance.changed === 'function' && instance.changed('deletedAt'),
    //   deletedAt: instance.get('deletedAt'),
    //   tracked: trackedFields,
    //   // Optional extra context that’s often handy:
    //   latestRevisionNumber: latest?.revisionNumber,
    //   // show which tracked fields differ from latest
    //   diffs: trackedFields.reduce((acc, f) => {
    //     acc[f] = { now: instance.get(f), latest: latest?.get?.(f) }
    //     return acc
    //   }, {})
    // })

    if (!latest) {
      // Shouldn't usually happen, but be resilient
      await RevisionModel.create(
        buildPayload({ revisionNumber: 1 }),
        { activityAction: 'create' }
      )
      return
    }

    // Only write a new revision if tracked fields changed
    const hasChanged = trackedFields.some((field) => instance.get(field) !== latest.get(field))
    if (!hasChanged) return

    // Optional: treat soft delete (deletedAt changed to non-null) as a 'delete'
    const deletedAtChanged =
      typeof instance.changed === 'function' ? instance.changed('deletedAt') : false
    const isDelete = deletedAtChanged && instance.get('deletedAt') != null

    await RevisionModel.create(
      buildPayload({ revisionNumber: latest.revisionNumber + 1 }),
      { activityAction: isDelete ? 'delete' : 'update' }
    )
  }
}

module.exports = createRevisionHook
