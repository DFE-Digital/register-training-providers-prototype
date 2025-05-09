const { Model, DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  class ActivityLog extends Model {
    static associate(models) {
      ActivityLog.belongsTo(models.User, {
        foreignKey: 'changedById',
        as: 'changedByUser'
      })
    }
  }

  ActivityLog.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      revisionTable: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      revisionId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      entityType: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      entityId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      revisionNumber: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      changedById: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      changedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      }
    },
    {
      sequelize,
      modelName: 'ActivityLog',
      tableName: 'activity_logs',
      underscored: true
    }
  )

  return ActivityLog
}
