const { Model, DataTypes, Op } = require('sequelize')

module.exports = (sequelize) => {
  class ProviderAccreditation extends Model {
    /**
     * Wire up ProviderAccreditation associations.
     * @param {object} models
     */
    static associate(models) {
      /**
       * Each accreditation belongs to the **accredited provider** that owns it.
       * FK lives on ProviderAccreditation.providerId.
       */
      ProviderAccreditation.belongsTo(models.Provider, {
        foreignKey: 'providerId',
        as: 'provider'
      })

      /**
       * Metadata: created by user.
       * FK lives on ProviderAccreditation.createdById.
       */
      ProviderAccreditation.belongsTo(models.User, {
        foreignKey: 'createdById',
        as: 'createdByUser'
      })

      /**
       * Metadata: updated by user.
       * FK lives on ProviderAccreditation.updatedById.
       */
      ProviderAccreditation.belongsTo(models.User, {
        foreignKey: 'updatedById',
        as: 'updatedByUser'
      })
    }
  }

  ProviderAccreditation.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      providerId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'provider_id'
      },
      number: {
        type: DataTypes.STRING,
        allowNull: false
      },
      startsOn: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'starts_on'
      },
      endsOn: {
        type: DataTypes.DATE,
        field: 'ends_on'
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'created_at'
      },
      createdById: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'created_by_id'
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'updated_at'
      },
      updatedById: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'updated_by_id'
      },
      deletedAt: {
        type: DataTypes.DATE,
        field: 'deleted_at'
      },
      deletedById: {
        type: DataTypes.UUID,
        field: 'deleted_by_id'
      }
    },
    {
      sequelize,
      modelName: 'ProviderAccreditation',
      tableName: 'provider_accreditations',
      timestamps: true
    }
  )

  const revisionHook = require('../hooks/revisionHook')

  const refreshProviderAccreditationStatusForInstance = async (instance, options = {}) => {
    const now = new Date()
    const { Provider, ProviderAccreditation } = instance.sequelize.models

    const accreditationCount = await ProviderAccreditation.count({
      where: {
        providerId: instance.providerId,
        deletedAt: null,
        startsOn: { [Op.lte]: now },
        [Op.or]: [
          { endsOn: null },
          { endsOn: { [Op.gte]: now } }
        ]
      },
      transaction: options.transaction
    })

    const provider = await Provider.findByPk(instance.providerId, {
      transaction: options.transaction
    })

    if (!provider) return

    const nextValue = accreditationCount > 0

    if (provider.isAccredited !== nextValue) {
      await provider.update({ isAccredited: nextValue }, { transaction: options.transaction })
    }
  }

  ProviderAccreditation.addHook('afterCreate', (instance, options) =>
    revisionHook({ revisionModelName: 'ProviderAccreditationRevision', modelKey: 'providerAccreditation' })(instance, {
      ...options,
      hookName: 'afterCreate'
    })
  )

  ProviderAccreditation.addHook('afterUpdate',
    revisionHook({ revisionModelName: 'ProviderAccreditationRevision', modelKey: 'providerAccreditation' })
  )

  ProviderAccreditation.addHook('afterCreate', async (instance, options) => {
    await refreshProviderAccreditationStatusForInstance(instance, options)
  })

  ProviderAccreditation.addHook('afterUpdate', async (instance, options) => {
    await refreshProviderAccreditationStatusForInstance(instance, options)
  })

  return ProviderAccreditation
}
