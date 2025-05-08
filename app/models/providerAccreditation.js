const { Model, DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  class ProviderAccreditation extends Model {
    static associate(models) {
      ProviderAccreditation.belongsTo(models.Provider, {
        foreignKey: 'providerId',
        as: 'provider'
      })

      ProviderAccreditation.belongsTo(models.User, {
        foreignKey: 'createdById',
        as: 'createdByUser'
      })

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

  const createRevisionHook = require('../hooks/revisionHook')

  ProviderAccreditation.addHook('afterCreate', (instance, options) =>
    createRevisionHook({ revisionModelName: 'ProviderAccreditationRevision', modelKey: 'providerAccreditation' })(instance, {
      ...options,
      hookName: 'afterCreate'
    })
  )

  ProviderAccreditation.addHook('afterUpdate',
    createRevisionHook({ revisionModelName: 'ProviderAccreditationRevision', modelKey: 'providerAccreditation' })
  )

  return ProviderAccreditation
}
