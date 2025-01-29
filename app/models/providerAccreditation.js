const { Model, DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  class ProviderAccreditation extends Model {
    static associate(models) {
      ProviderAccreditation.belongsTo(models.Provider, {
        foreignKey: 'provider_id',
        as: 'provider'
      })

      ProviderAccreditation.belongsTo(models.User, {
        foreignKey: 'created_by_id',
        as: 'createdByUser'
      })

      ProviderAccreditation.belongsTo(models.User, {
        foreignKey: 'updated_by_id',
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
      provider_id: {
        type: DataTypes.UUID,
        allowNull: false
      },
      number: {
        type: DataTypes.STRING,
        allowNull: false
      },
      starts_on: {
        type: DataTypes.DATE,
        allowNull: false
      },
      ends_on: {
        type: DataTypes.DATE
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false
      },
      created_by_id: {
        type: DataTypes.UUID,
        allowNull: false
      },
      updated_at: {
        type: DataTypes.DATE
      },
      updated_by_id: {
        type: DataTypes.UUID
      }
    },
    {
      sequelize,
      modelName: 'ProviderAccreditation',
      tableName: 'provider_accreditations'
    }
  )

  return ProviderAccreditation
}
