"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      "journal_entry_headers",
      "source_name",
      {
        type: Sequelize.STRING(100),
        allowNull: false,
        defaultValue: "UNKNOWN",
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn(
      "journal_entry_headers",
      "source_name"
    );
  },
};