'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class VendorSubsidiary extends Model {
    static associate(models) {
      if (models.Vendor) {
        VendorSubsidiary.belongsTo(models.Vendor, {
          foreignKey: 'vendor_id',
          as: 'vendor',
          onDelete: 'CASCADE',
        });
      }
      if (models.SubsidiaryMaster || models.Subsidiary) {
        const SubsidiaryModel = models.SubsidiaryMaster || models.Subsidiary;
        VendorSubsidiary.belongsTo(SubsidiaryModel, {
          foreignKey: 'subsidiary_id',
          as: 'subsidiary',
          onDelete: 'CASCADE',
        });
      }
    }
  }

  VendorSubsidiary.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      vendor_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: 'vendor_details',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      subsidiary_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: 'subsidiaries',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      credit_limit: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
        defaultValue: null,
        comment: 'Subsidiary-specific credit limit override',
      },
      tax_code_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        comment: 'Subsidiary-specific default tax code identifier',
      },
      is_primary: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Designates primary subsidiary relationship',
      },
    },
    {
      tableName: 'vendor_subsidiaries',
      sequelize,
      timestamps: true,
      indexes: [
        {
          unique: true,
          name: 'unique_vendor_subsidiary_junction',
          fields: ['vendor_id', 'subsidiary_id'],
        },
        {
          name: 'idx_vendor_subsidiary_subsidiary_id',
          fields: ['subsidiary_id'],
        },
      ],
    }
  );

  return VendorSubsidiary;
};
