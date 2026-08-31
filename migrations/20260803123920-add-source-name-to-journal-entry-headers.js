"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable("journal_entry_headers");
    if (!tableDescription.source_name) {
      await queryInterface.addColumn(
        "journal_entry_headers",
        "source_name",
        {
          type: Sequelize.STRING(100),
          allowNull: false,
          defaultValue: "UNKNOWN",
        }
      );
    }
  },

  async down(queryInterface) {
    const tableDescription = await queryInterface.describeTable("journal_entry_headers");
    if (tableDescription.source_name) {
      await queryInterface.removeColumn(
        "journal_entry_headers",
        "source_name"
      );
    }
  },
};