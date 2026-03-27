const { Model, DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  class User extends Model {
    static associate(models) {
      User.hasMany(models.UserNotification, {
        foreignKey: 'userId',
        as: 'notifications'
      })
    }
  }

  User.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        primaryKey: true
      },
      firstName: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'first_name',
        validate: {
          notEmpty: true
        }
      },
      lastName: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'last_name',
        validate: {
          notEmpty: true
        }
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
          isEmail: true
        }
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'bat'
      },
      type: {
        type: DataTypes.ENUM('support', 'provider', 'api'),
        allowNull: false,
        defaultValue: 'support'
      },
      isApiUser: {
        type: DataTypes.VIRTUAL,
        get() {
          return this.getDataValue('type') === 'api'
        }
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      lastSignedInAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'last_signed_in_at'
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
      modelName: 'User',
      tableName: 'users',
      timestamps: true
    }
  )

  const revisionHook = require('../hooks/revisionHook')

  User.addHook('afterCreate', (instance, options) =>
    revisionHook({ revisionModelName: 'UserRevision', modelKey: 'user' })(instance, {
      ...options,
      hookName: 'afterCreate'
    })
  )

  User.addHook('afterUpdate', (instance, options) => {
    const hookName = instance.deletedById !== null ? 'afterDestroy' : 'afterUpdate'
    revisionHook({ revisionModelName: 'UserRevision', modelKey: 'user' })(instance, {
      ...options,
      hookName
    })
  })

  return User
}
