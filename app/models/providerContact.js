const { Model, DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  class ProviderContact extends Model {
    static associate(models) {
      ProviderContact.belongsTo(models.Provider, {
        foreignKey: 'provider_id',
        as: 'provider'
      })
    }
  }

  ProviderContact.init(
    {
      id: {
        type: DataTypes.UUID,
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
        allowNull: false
      },
      telephone: {
        type: DataTypes.STRING,
        allowNull: false
      },
      changed_at: {
        type: DataTypes.DATE,
        allowNull: false
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
