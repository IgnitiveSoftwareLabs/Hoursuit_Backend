'use strict';

const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    const tableDescription = await queryInterface.describeTable('purchase_order_lines');

    if (!tableDescription.discount_percent) {
      await queryInterface.addColumn('purchase_order_lines', 'discount_percent', {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 0,
      });
    }

    if (!tableDescription.discount_amount) {
      await queryInterface.addColumn('purchase_order_lines', 'discount_amount', {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
        defaultValue: 0,
      });
    }

    if (!tableDescription.subtotal) {
      await queryInterface.addColumn('purchase_order_lines', 'subtotal', {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
        defaultValue: 0,
      });
    }
  },

  async down(queryInterface) {
    const tableDescription = await queryInterface.describeTable('purchase_order_lines');

    if (tableDescription.discount_percent) {
      await queryInterface.removeColumn('purchase_order_lines', 'discount_percent');
    }

    if (tableDescription.discount_amount) {
      await queryInterface.removeColumn('purchase_order_lines', 'discount_amount');
    }

    if (tableDescription.subtotal) {
      await queryInterface.removeColumn('purchase_order_lines', 'subtotal');
    }
  },
};
