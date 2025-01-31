const { Model, DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  class ProviderHistory extends Model {
    static associate(models) {
      ProviderHistory.belongsTo(models.Provider, {
        foreignKey: 'provider_id',
        as: 'provider'
      })

      ProviderHistory.belongsTo(models.User, {
        foreignKey: 'created_by_id',
        as: 'createdByUser'
      })

      ProviderHistory.belongsTo(models.User, {
        foreignKey: 'updated_by_id',
        as: 'updatedByUser'
      })
    }
  }

  ProviderHistory.init(
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
      operatingName: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'operating_name',
      },
      legalName: {
        type: DataTypes.STRING,
        field: 'legal_name'
      },
      ukprn: {
        type: DataTypes.STRING,
        allowNull: false
      },
      code: {
        type: DataTypes.STRING,
        allowNull: false
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
      modelName: 'ProviderHistory',
      tableName: 'provider_histories'
    }
  )

  return ProviderHistory
}
