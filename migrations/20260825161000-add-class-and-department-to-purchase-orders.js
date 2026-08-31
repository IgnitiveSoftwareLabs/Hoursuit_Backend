'use strict';

const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    const tableDescription = await queryInterface.describeTable('purchase_order_headers');

    if (!tableDescription.class_id) {
      await queryInterface.addColumn('purchase_order_headers', 'class_id', {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
      });
    }

    if (!tableDescription.department_id) {
      await queryInterface.addColumn('purchase_order_headers', 'department_id', {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const tableDescription = await queryInterface.describeTable('purchase_order_headers');

    if (tableDescription.class_id) {
      await queryInterface.removeColumn('purchase_order_headers', 'class_id');
    }
    if (tableDescription.department_id) {
      await queryInterface.removeColumn('purchase_order_headers', 'department_id');
    }
  },
};
