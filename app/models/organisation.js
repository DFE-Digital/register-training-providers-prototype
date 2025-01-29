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
      organisation_id: {
        type: DataTypes.UUID,
        allowNull: false
      },
      organisation_type: {
        type: DataTypes.STRING,
        allowNull: false
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
