const { Model, DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  class ProviderHistory extends Model {
    static associate(models) {
      ProviderHistory.belongsTo(models.Provider, {
        foreignKey: 'provider_id',
        as: 'provider'
      })
    }
  }

  ProviderHistory.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true
      },
      provider_id: {
        type: DataTypes.UUID,
        allowNull: false
      },
      operating_name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      legal_name: {
        type: DataTypes.STRING,
        allowNull: true
      },
      ukprn: {
        type: DataTypes.STRING,
        allowNull: false
      },
      changed_at: {
        type: DataTypes.DATE,
        allowNull: false
      },
    },
    {
      sequelize,
      modelName: 'ProviderHistory',
      tableName: 'provider_histories'
    }
  )

  return ProviderHistory
}
