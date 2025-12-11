const { Model, DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  class UserRevision extends Model {
    static associate(models) {
      UserRevision.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      })

      UserRevision.belongsTo(models.User, {
        foreignKey: 'revisionById',
        as: 'revisionByUser'
      })
    }
  }

  UserRevision.init(
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
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      isApiUser: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'is_api_user'
      },
      lastSignedInAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'last_signed_in_at'
      },
      revisionNumber: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'revision_number'
      },
      revisionAt: {
        type: DataTypes.DATE,
        field: 'revision_at'
      },
      revisionById: {
        type: DataTypes.UUID,
        field: 'revision_by_id'
      }
    },
    {
      sequelize,
      modelName: 'UserRevision',
      tableName: 'user_revisions',
      timestamps: false
    }
  )

  const activityHook = require('../hooks/activityHook')

  UserRevision.addHook('afterCreate', (instance, options) =>
    activityHook({
      entityType: 'user',
      revisionTable: 'user_revisions',
      entityIdField: 'userId'
    })(instance, {
      ...options,
      hookName: 'afterCreate'
    })
  )

  return UserRevision
}
