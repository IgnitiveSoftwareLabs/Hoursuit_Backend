'use strict';

const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    const tableDescription = await queryInterface.describeTable('purchase_order_headers');

    if (tableDescription.work_order_no) {
      await queryInterface.changeColumn('purchase_order_headers', 'work_order_no', {
        type: DataTypes.STRING(100),
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const tableDescription = await queryInterface.describeTable('purchase_order_headers');

    if (tableDescription.work_order_no) {
      await queryInterface.changeColumn('purchase_order_headers', 'work_order_no', {
        type: DataTypes.STRING(100),
        allowNull: true,
      });
    }
  },
};
