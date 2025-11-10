const { Model, DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  class AcademicYearRevision extends Model {
    static associate(models) {
      AcademicYearRevision.belongsTo(models.AcademicYear, {
        foreignKey: 'academicYearId',
        as: 'academicYear'
      })

      AcademicYearRevision.belongsTo(models.User, {
        foreignKey: 'revisionById',
        as: 'revisionByUser'
      })
    }
  }

  AcademicYearRevision.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      academicYearId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'academic_year_id'
      },
      code: {
        type: DataTypes.STRING,
        allowNull: false
      },
      name: {
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
        allowNull: false,
        field: 'ends_on'
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
      modelName: 'AcademicYearRevision',
      tableName: 'academic_year_revisions',
      timestamps: false
    }
  )

  const activityHook = require('../hooks/activityHook')

  AcademicYearRevision.addHook('afterCreate', (instance, options) =>
    activityHook({
      entityType: 'academic_year',
      revisionTable: 'academic_year_revisions',
      entityIdField: 'academicYearId'
    })(instance, {
      ...options,
      hookName: 'afterCreate'
    })
  )

  return AcademicYearRevision
}
