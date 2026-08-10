"use strict";

const { DataTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE grn_lines
      SET "qcRequired" = false
      WHERE "qcRequired" IS NULL;
    `);

    await queryInterface.changeColumn("grn_lines", "qcRequired", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
  },

  async down(queryInterface) {
    await queryInterface.changeColumn("grn_lines", "qcRequired", {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    });
  },
};