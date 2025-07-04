const { Model, DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  class ProviderAccreditationPartnership extends Model {
    static associate(models) {
      ProviderAccreditationPartnership.belongsTo(models.Provider, {
        foreignKey: 'providerId',
        as: 'provider'
      })

      ProviderAccreditationPartnership.belongsTo(models.ProviderAccreditation, {
        foreignKey: 'providerAccreditationId',
        as: 'providerAccreditation'
      })

      ProviderAccreditationPartnership.belongsTo(models.User, {
        foreignKey: 'createdById',
        as: 'createdByUser'
      })

      ProviderAccreditationPartnership.belongsTo(models.User, {
        foreignKey: 'updatedById',
        as: 'updatedByUser'
      })
    }
  }

  ProviderAccreditationPartnership.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      providerAccreditationId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'provider_accreditation_id'
      },
      providerId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'provider_id'
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
      modelName: 'ProviderAccreditationPartnership',
      tableName: 'provider_accreditation_partnerships',
      timestamps: true
    }
  )

  // const createRevisionHook = require('../hooks/revisionHook')

  // ProviderAccreditationPartnership.addHook('afterCreate', (instance, options) =>
  //   createRevisionHook({ revisionModelName: 'ProviderAccreditationPartnershipRevision', modelKey: 'providerAccreditationPartnership' })(instance, {
  //     ...options,
  //     hookName: 'afterCreate'
  //   })
  // )

  // ProviderAccreditationPartnership.addHook('afterUpdate',
  //   createRevisionHook({ revisionModelName: 'ProviderAccreditationPartnershipRevision', modelKey: 'providerAccreditationPartnership' })
  // )

  return ProviderAccreditationPartnership
}
