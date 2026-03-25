const { Model, DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  class UserNotification extends Model {
    static associate(models) {
      UserNotification.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      })

      UserNotification.belongsTo(models.User, {
        foreignKey: 'createdById',
        as: 'createdByUser'
      })

      UserNotification.belongsTo(models.User, {
        foreignKey: 'updatedById',
        as: 'updatedByUser'
      })
    }
  }

  UserNotification.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'user_id'
      },
      notificationFrequency: {
        type: DataTypes.ENUM('immediate', 'daily', 'weekly', 'never'),
        allowNull: false,
        field: 'notification_frequency'
      },
      providerDetails: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'provider_details'
      },
      providerAccreditations: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'provider_accreditations'
      },
      providerAddresses: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'provider_addresses'
      },
      providerContacts: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'provider_contacts'
      },
      providerPartnerships: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'provider_partnerships'
      },
      providerUsers: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'provider_users'
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
      modelName: 'UserNotification',
      tableName: 'user_notifications',
      timestamps: true
    }
  )

  return UserNotification
}
