"use strict";

const { DataTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // 1. journal_entry_headers
    const headerDesc = await queryInterface.describeTable("journal_entry_headers");
    if (!headerDesc.vendor_id) {
      await queryInterface.addColumn("journal_entry_headers", "vendor_id", {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        defaultValue: null,
      });
    }
    if (!headerDesc.customer_id) {
      await queryInterface.addColumn("journal_entry_headers", "customer_id", {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        defaultValue: null,
      });
    }
    if (!headerDesc.employee_id) {
      await queryInterface.addColumn("journal_entry_headers", "employee_id", {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        defaultValue: null,
      });
    }

    // 2. journal_entry_lines
    const lineDesc = await queryInterface.describeTable("journal_entry_lines");
    if (!lineDesc.vendor_id) {
      await queryInterface.addColumn("journal_entry_lines", "vendor_id", {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        defaultValue: null,
      });
    }
    if (!lineDesc.customer_id) {
      await queryInterface.addColumn("journal_entry_lines", "customer_id", {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        defaultValue: null,
      });
    }
    if (!lineDesc.employee_id) {
      await queryInterface.addColumn("journal_entry_lines", "employee_id", {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        defaultValue: null,
      });
    }
  },

  async down(queryInterface) {
    const headerDesc = await queryInterface.describeTable("journal_entry_headers");
    if (headerDesc.vendor_id) {
      await queryInterface.removeColumn("journal_entry_headers", "vendor_id");
    }
    if (headerDesc.customer_id) {
      await queryInterface.removeColumn("journal_entry_headers", "customer_id");
    }
    if (headerDesc.employee_id) {
      await queryInterface.removeColumn("journal_entry_headers", "employee_id");
    }

    const lineDesc = await queryInterface.describeTable("journal_entry_lines");
    if (lineDesc.vendor_id) {
      await queryInterface.removeColumn("journal_entry_lines", "vendor_id");
    }
    if (lineDesc.customer_id) {
      await queryInterface.removeColumn("journal_entry_lines", "customer_id");
    }
    if (lineDesc.employee_id) {
      await queryInterface.removeColumn("journal_entry_lines", "employee_id");
    }
  },
};
