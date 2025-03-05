const { Model, DataTypes } = require('sequelize')
const { v4: uuid } = require('uuid')

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
        defaultValue: uuid(),
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
      }
    },
    {
      sequelize,
      modelName: 'ProviderAccreditation',
      tableName: 'provider_accreditations',
      timestamps: true
    }
  )

  return ProviderAccreditation
}
