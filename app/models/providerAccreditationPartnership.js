const { Model, DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  class ProviderAccreditationPartnership extends Model {
    /**
     * Wire up ProviderAccreditationPartnership associations.
     * @param {object} models
     */
    static associate(models) {
      /**
       * Partnership belongs to the **training provider** (the partner).
       * FK lives on ProviderAccreditationPartnership.partnerId.
       */
      ProviderAccreditationPartnership.belongsTo(models.Provider, {
        foreignKey: 'partnerId',
        as: 'partner'
      })

      /**
       * Partnership belongs to a specific **accreditation** (owned by an accredited provider).
       * FK lives on ProviderAccreditationPartnership.providerAccreditationId.
       * To reach the accredited provider: providerAccreditation → provider.
       */
      ProviderAccreditationPartnership.belongsTo(models.ProviderAccreditation, {
        foreignKey: 'providerAccreditationId',
        as: 'providerAccreditation'
      })

      /**
       * Metadata: created by user.
       * FK lives on ProviderAccreditationPartnership.createdById.
       */
      ProviderAccreditationPartnership.belongsTo(models.User, {
        foreignKey: 'createdById',
        as: 'createdByUser'
      })

      /**
       * Metadata: updated by user.
       * FK lives on ProviderAccreditationPartnership.updatedById.
       */
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
      partnerId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'partner_id'
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
