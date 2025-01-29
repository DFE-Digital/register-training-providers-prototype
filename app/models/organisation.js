const { Model, DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  class Organisation extends Model {
    /**
    * Helper method for defining associations.
    * This method is not a part of Sequelize lifecycle.
    * The `models/index` file will call this method automatically.
    */
   static associate(models) {
    // Organisation.belongsTo(models.Provider, {
    //   foreignKey: 'organisation_id',
    //   as: 'organisation'
    // })

    Organisation.belongsTo(models.User, {
      foreignKey: 'created_by_id',
      as: 'createdByUser'
    })

    Organisation.belongsTo(models.User, {
      foreignKey: 'updated_by_id',
      as: 'updatedByUser'
    })
   }
  }

  Organisation.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      organisationId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'organisation_id'
      },
      organisationType: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'organisation_type'
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
      modelName: 'Organisation',
      tableName: 'organisations'
    }
  )

  return Organisation
}
