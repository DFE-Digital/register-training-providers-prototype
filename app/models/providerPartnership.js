const { Model, DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  class ProviderPartnership extends Model {
    static associate(models) {
      ProviderPartnership.belongsTo(models.Provider, {
        foreignKey: 'trainingProviderId',
        as: 'trainingProvider'
      })

      ProviderPartnership.belongsTo(models.Provider, {
        foreignKey: 'accreditedProviderId',
        as: 'accreditedProvider'
      })

      ProviderPartnership.belongsTo(models.User, {
        foreignKey: 'createdById',
        as: 'createdByUser'
      })

      ProviderPartnership.belongsTo(models.User, {
        foreignKey: 'updatedById',
        as: 'updatedByUser'
      })
    }
  }

  ProviderPartnership.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      trainingProviderId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'training_provider_id'
      },
      accreditedProviderId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'accredited_provider_id'
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
        field: 'updated_at'
      },
      updatedById: {
        type: DataTypes.UUID,
        field: 'updated_by_id'
      }
    },
    {
      sequelize,
      modelName: 'ProviderPartnership',
      tableName: 'provider_partnerships',
      timestamps: false
    }
  )

  return ProviderPartnership
}
