const { Model, DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  class ProviderContact extends Model {
    static associate(models) {
      ProviderContact.belongsTo(models.Provider, {
        foreignKey: 'providerId',
        as: 'provider'
      })

      ProviderContact.belongsTo(models.User, {
        foreignKey: 'createdById',
        as: 'createdByUser'
      })

      ProviderContact.belongsTo(models.User, {
        foreignKey: 'updatedById',
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
      providerId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'provider_id'
      },
      firstName: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'first_name'
      },
      lastName: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'last_name'
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
      modelName: 'ProviderContact',
      tableName: 'provider_contacts',
      timestamps: true
    }
  )

  return ProviderContact
}
