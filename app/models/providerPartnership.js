const { Model, DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  class ProviderPartnership extends Model {
    static associate(models) {
      ProviderPartnership.belongsTo(models.Provider, {
        foreignKey: 'training_provider_id',
        as: 'trainingProvider'
      })

      ProviderPartnership.belongsTo(models.Provider, {
        foreignKey: 'accredited_provider_id',
        as: 'accreditedProvider'
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
      training_provider_id: {
        type: DataTypes.UUID,
        allowNull: false
      },
      accredited_provider_id: {
        type: DataTypes.UUID,
        allowNull: false
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false
      },
      created_by: {
        type: DataTypes.UUID,
        allowNull: false
      },
      updated_at: {
        type: DataTypes.DATE
      },
      updated_by: {
        type: DataTypes.UUID
      }
    },
    {
      sequelize,
      modelName: 'ProviderPartnership',
      tableName: 'provider_partnerships'
    }
  )

  return ProviderPartnership
}
