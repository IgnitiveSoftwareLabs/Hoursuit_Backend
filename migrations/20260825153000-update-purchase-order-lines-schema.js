'use strict';

const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    const tableDescription = await queryInterface.describeTable('purchase_order_lines');

    // 1. Rename ndian_tax_nature to indian_tax_nature if old column exists
    if (tableDescription.ndian_tax_nature && !tableDescription.indian_tax_nature) {
      await queryInterface.renameColumn('purchase_order_lines', 'ndian_tax_nature', 'indian_tax_nature');
    } else if (!tableDescription.indian_tax_nature) {
      await queryInterface.addColumn('purchase_order_lines', 'indian_tax_nature', {
        type: DataTypes.ENUM('Good', 'Services'),
        allowNull: true,
      });
    }

    // 2. Make work_order_no nullable
    if (tableDescription.work_order_no) {
      await queryInterface.changeColumn('purchase_order_lines', 'work_order_no', {
        type: DataTypes.STRING(100),
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const tableDescription = await queryInterface.describeTable('purchase_order_lines');

    if (tableDescription.indian_tax_nature && !tableDescription.ndian_tax_nature) {
      await queryInterface.renameColumn('purchase_order_lines', 'indian_tax_nature', 'ndian_tax_nature');
    }
  },
};
