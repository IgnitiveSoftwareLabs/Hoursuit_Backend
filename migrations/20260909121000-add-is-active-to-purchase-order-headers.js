'use strict';

const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    try {
      const tableDescription = await queryInterface.describeTable('purchase_order_headers');

      if (!tableDescription.isActive && !tableDescription.is_active) {
        await queryInterface.addColumn('purchase_order_headers', 'isActive', {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        });
      }
    } catch (error) {
      console.warn('Could not update purchase_order_headers table:', error.message);
    }
  },

  async down(queryInterface) {
    try {
      const tableDescription = await queryInterface.describeTable('purchase_order_headers');

      if (tableDescription.isActive) {
        await queryInterface.removeColumn('purchase_order_headers', 'isActive');
      }
      if (tableDescription.is_active) {
        await queryInterface.removeColumn('purchase_order_headers', 'is_active');
      }
    } catch (error) {
      console.warn('Could not revert purchase_order_headers table:', error.message);
    }
  },
};
