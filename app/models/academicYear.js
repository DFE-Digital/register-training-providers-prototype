const { Model, DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  class AcademicYear extends Model {
    /**
     * Wire up AcademicYear associations.
     * @param {object} models
     */
    static associate(models) {
      /**
       * Metadata: created by user.
       * FK lives on AcademicYear.createdById.
       */
      AcademicYear.belongsTo(models.User, {
        foreignKey: 'createdById',
        as: 'createdByUser'
      })

      /**
       * Metadata: updated by user.
       * FK lives on AcademicYear.updatedById.
       */
      AcademicYear.belongsTo(models.User, {
        foreignKey: 'updatedById',
        as: 'updatedByUser'
      })
    }
  }

  AcademicYear.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
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
      modelName: 'AcademicYear',
      tableName: 'academic_years',
      timestamps: true
    }
  )

  const revisionHook = require('../hooks/revisionHook')

  AcademicYear.addHook('afterCreate', (instance, options) =>
    revisionHook({ revisionModelName: 'AcademicYearRevision', modelKey: 'academicYearRevision' })(instance, {
      ...options,
      hookName: 'afterCreate'
    })
  )

  AcademicYear.addHook('afterUpdate',
    revisionHook({ revisionModelName: 'AcademicYearRevision', modelKey: 'academicYearRevision' })
  )

  return AcademicYear
}
