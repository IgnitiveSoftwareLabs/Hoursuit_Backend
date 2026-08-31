"use strict";

const { DataTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const tableDescription = await queryInterface.describeTable("inventory_counts");
    if (tableDescription.customer_id) {
      await queryInterface.changeColumn("inventory_counts", "customer_id", {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        defaultValue: null,
      });
    }
  },

  async down(queryInterface) {
    const tableDescription = await queryInterface.describeTable("inventory_counts");
    if (tableDescription.customer_id) {
      await queryInterface.changeColumn("inventory_counts", "customer_id", {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: null,
      });
    }
  },
};