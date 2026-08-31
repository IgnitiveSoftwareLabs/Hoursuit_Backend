'use strict';

const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    // 1. Update grn_headers table
    const headerTableDesc = await queryInterface.describeTable('grn_headers');

    if (headerTableDesc.warehouseId) {
      await queryInterface.changeColumn('grn_headers', 'warehouseId', {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
      });
    }

    if (headerTableDesc.godownId) {
      await queryInterface.changeColumn('grn_headers', 'godownId', {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
      });
    }

    if (headerTableDesc.stackId) {
      await queryInterface.changeColumn('grn_headers', 'stackId', {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
      });
    }

    if (!headerTableDesc.transportationModeId) {
      await queryInterface.addColumn('grn_headers', 'transportationModeId', {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
      });
    }

    if (!headerTableDesc.driverName) {
      await queryInterface.addColumn('grn_headers', 'driverName', {
        type: DataTypes.STRING(100),
        allowNull: true,
      });
    }

    if (!headerTableDesc.driverPhoneNo) {
      await queryInterface.addColumn('grn_headers', 'driverPhoneNo', {
        type: DataTypes.STRING(100),
        allowNull: true,
      });
    }

    if (!headerTableDesc.vehicleNo) {
      await queryInterface.addColumn('grn_headers', 'vehicleNo', {
        type: DataTypes.STRING(100),
        allowNull: true,
      });
    }

    if (!headerTableDesc.memo) {
      await queryInterface.addColumn('grn_headers', 'memo', {
        type: DataTypes.TEXT,
        allowNull: true,
      });
    }

    // 2. Update grn_lines table
    const lineTableDesc = await queryInterface.describeTable('grn_lines');

    if (!lineTableDesc.locationId) {
      await queryInterface.addColumn('grn_lines', 'locationId', {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
      });
    }

    if (!lineTableDesc.onHand) {
      await queryInterface.addColumn('grn_lines', 'onHand', {
        type: DataTypes.DECIMAL(15, 4),
        allowNull: true,
        defaultValue: 0,
      });
    }
  },

  async down(queryInterface) {
    const headerTableDesc = await queryInterface.describeTable('grn_headers');

    if (headerTableDesc.transportationModeId) {
      await queryInterface.removeColumn('grn_headers', 'transportationModeId');
    }
    if (headerTableDesc.driverName) {
      await queryInterface.removeColumn('grn_headers', 'driverName');
    }
    if (headerTableDesc.driverPhoneNo) {
      await queryInterface.removeColumn('grn_headers', 'driverPhoneNo');
    }
    if (headerTableDesc.vehicleNo) {
      await queryInterface.removeColumn('grn_headers', 'vehicleNo');
    }
    if (headerTableDesc.memo) {
      await queryInterface.removeColumn('grn_headers', 'memo');
    }

    const lineTableDesc = await queryInterface.describeTable('grn_lines');

    if (lineTableDesc.locationId) {
      await queryInterface.removeColumn('grn_lines', 'locationId');
    }
    if (lineTableDesc.onHand) {
      await queryInterface.removeColumn('grn_lines', 'onHand');
    }
  },
};
