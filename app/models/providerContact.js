const { Model, DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  class ProviderContact extends Model {
    static associate(models) {
      ProviderContact.belongsTo(models.Provider, {
        foreignKey: 'provider_id',
        as: 'provider'
      })

      ProviderContact.belongsTo(models.User, {
        foreignKey: 'created_by_id',
        as: 'createdByUser'
      })

      ProviderContact.belongsTo(models.User, {
        foreignKey: 'updated_by_id',
        as: 'updatedByUser'
      })
    }
  }

  ProviderContact.init(
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
      first_name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      last_name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
          isEmail: true
        }
      },
      telephone: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          is: /^(\+44\s?|0)(?:\d\s?){9,10}$/
        }
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
      modelName: 'ProviderContact',
      tableName: 'provider_contacts'
    }
  )

  return ProviderContact
}
