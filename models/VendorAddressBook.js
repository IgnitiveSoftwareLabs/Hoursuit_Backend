'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class VendorAddressBook extends Model {
    static associate(models) {
      if (models.Vendor) {
        VendorAddressBook.belongsTo(models.Vendor, {
          foreignKey: 'vendor_id',
          as: 'vendor',
          onDelete: 'CASCADE',
        });
      }
      if (models.CityMaster || models.City) {
        VendorAddressBook.belongsTo(models.CityMaster || models.City, {
          foreignKey: 'city_id',
          as: 'city',
          onDelete: 'RESTRICT',
        });
      }
      if (models.StateCode || models.State) {
        VendorAddressBook.belongsTo(models.StateCode || models.State, {
          foreignKey: 'state_code_id',
          as: 'state',
          onDelete: 'RESTRICT',
        });
      }
      if (models.Country) {
        VendorAddressBook.belongsTo(models.Country, {
          foreignKey: 'country_id',
          as: 'country',
          onDelete: 'RESTRICT',
        });
      }
    }
  }

  VendorAddressBook.init(
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
      label: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Address custom label e.g. HQ, Warehouse, Branch',
      },
      attention: {
        type: DataTypes.STRING(150),
        allowNull: true,
        comment: 'Attention / Contact Person',
      },
      addressee: {
        type: DataTypes.STRING(200),
        allowNull: true,
        comment: 'Addressee name on shipping/billing label',
      },
      addr1: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Address Line 1',
      },
      addr2: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Address Line 2',
      },
      city_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
      },
      state_code_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
      },
      zip: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      country_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
      },
      default_billing: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      default_shipping: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      tableName: 'vendor_address_books',
      sequelize,
      timestamps: true,
      indexes: [
        {
          name: 'idx_vendor_address_vendor_id',
          fields: ['vendor_id'],
        },
        {
          name: 'idx_vendor_address_defaults',
          fields: ['vendor_id', 'default_billing', 'default_shipping'],
        },
      ],
    }
  );

  return VendorAddressBook;
};
