"use strict";

const { DataTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const tableDescription = await queryInterface.describeTable("vendor_details");
    if (tableDescription.company_name) {
      await queryInterface.changeColumn("vendor_details", "company_name", {
        type: DataTypes.STRING(255),
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const tableDescription = await queryInterface.describeTable("vendor_details");
    if (tableDescription.company_name) {
      await queryInterface.changeColumn("vendor_details", "company_name", {
        type: DataTypes.STRING(255),
        allowNull: false,
      });
    }
  },
};
