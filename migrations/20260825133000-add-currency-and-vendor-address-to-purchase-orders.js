'use strict';

const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    const tableDescription = await queryInterface.describeTable('purchase_order_headers');

    if (!tableDescription.currency_id) {
      await queryInterface.addColumn('purchase_order_headers', 'currency_id', {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
      });
    }

    if (!tableDescription.vendor_address_id) {
      await queryInterface.addColumn('purchase_order_headers', 'vendor_address_id', {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
      });
    }

    if (!tableDescription.billing_address) {
      await queryInterface.addColumn('purchase_order_headers', 'billing_address', {
        type: DataTypes.TEXT,
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const tableDescription = await queryInterface.describeTable('purchase_order_headers');

    if (tableDescription.currency_id) {
      await queryInterface.removeColumn('purchase_order_headers', 'currency_id');
    }
    if (tableDescription.vendor_address_id) {
      await queryInterface.removeColumn('purchase_order_headers', 'vendor_address_id');
    }
    if (tableDescription.billing_address) {
      await queryInterface.removeColumn('purchase_order_headers', 'billing_address');
    }
  },
};
