"use strict";

const { DataTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const tableDescription = await queryInterface.describeTable("journal_entry_headers");
    if (!tableDescription.source_id) {
      await queryInterface.addColumn("journal_entry_headers", "source_id", {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        defaultValue: null,
      });
    }
  },

  async down(queryInterface) {
    const tableDescription = await queryInterface.describeTable("journal_entry_headers");
    if (tableDescription.source_id) {
      await queryInterface.removeColumn("journal_entry_headers", "source_id");
    }
  },
};