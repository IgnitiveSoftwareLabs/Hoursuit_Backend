'use strict';

const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    const tableDescription = await queryInterface.describeTable('purchase_order_headers');

    if (tableDescription.transportation_mode_id) {
      await queryInterface.changeColumn('purchase_order_headers', 'transportation_mode_id', {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
      });
    }

    if (tableDescription.warehouse_id) {
      await queryInterface.changeColumn('purchase_order_headers', 'warehouse_id', {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const tableDescription = await queryInterface.describeTable('purchase_order_headers');

    if (tableDescription.transportation_mode_id) {
      await queryInterface.changeColumn('purchase_order_headers', 'transportation_mode_id', {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
      });
    }

    if (tableDescription.warehouse_id) {
      await queryInterface.changeColumn('purchase_order_headers', 'warehouse_id', {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
      });
    }
  },
};
