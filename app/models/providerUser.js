const { Model, DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  class ProviderUser extends Model {
    static associate(models) {
      ProviderUser.belongsTo(models.Provider, {
        foreignKey: 'providerId',
        as: 'provider'
      })

      ProviderUser.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      })

      ProviderUser.belongsTo(models.User, {
        foreignKey: 'createdById',
        as: 'createdByUser'
      })

      ProviderUser.belongsTo(models.User, {
        foreignKey: 'updatedById',
        as: 'updatedByUser'
      })
    }
  }

  ProviderUser.init(
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
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'user_id'
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
      modelName: 'ProviderUser',
      tableName: 'provider_users',
      timestamps: true
    }
  )

  return ProviderUser
}
