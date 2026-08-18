"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable("item_masters");

    // Remove legacy item_type string column if present
    if (tableDescription.item_type) {
      try {
        await queryInterface.removeColumn("item_masters", "item_type");
      } catch (err) {
        console.log("Could not remove column 'item_type':", err.message);
      }
    }

    // Add item_type_id foreign key column if not present
    if (!tableDescription.item_type_id) {
      await queryInterface.addColumn("item_masters", "item_type_id", {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        defaultValue: null,
        references: {
          model: "item_types",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable("item_masters");

    if (tableDescription.item_type_id) {
      await queryInterface.removeColumn("item_masters", "item_type_id");
    }

    if (!tableDescription.item_type) {
      await queryInterface.addColumn("item_masters", "item_type", {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: "",
      });
    }
  },
};
