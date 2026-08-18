"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Add purchaseInvoiceHeaderId to purchase_payment_headers
    await queryInterface.addColumn(
      "purchase_payment_headers",
      "purchaseInvoiceHeaderId",
      {
        type: Sequelize.INTEGER,
        allowNull: true,
      }
    );

    // 2. Change purchaseInvoiceHeaderId
    //    to purchaseInvoiceLineId in purchase_payment_lines

    await queryInterface.addColumn(
      "purchase_payment_lines",
      "purchaseInvoiceLineId",
      {
        type: Sequelize.INTEGER,
        allowNull: true,
      }
    );

    // 3. Copy existing values from old column if required
    await queryInterface.sequelize.query(`
      UPDATE purchase_payment_lines
      SET "purchaseInvoiceLineId" = "purchaseInvoiceHeaderId"
      WHERE "purchaseInvoiceHeaderId" IS NOT NULL
    `);

    // 4. Remove old column
    await queryInterface.removeColumn(
      "purchase_payment_lines",
      "purchaseInvoiceHeaderId"
    );

    // 5. Make the new column NOT NULL
    await queryInterface.changeColumn(
      "purchase_payment_lines",
      "purchaseInvoiceLineId",
      {
        type: Sequelize.INTEGER,
        allowNull: false,
      }
    );
  },

  async down(queryInterface, Sequelize) {
    // Reverse purchase_payment_lines

    await queryInterface.addColumn(
      "purchase_payment_lines",
      "purchaseInvoiceHeaderId",
      {
        type: Sequelize.INTEGER,
        allowNull: true,
      }
    );

    await queryInterface.sequelize.query(`
      UPDATE purchase_payment_lines
      SET "purchaseInvoiceHeaderId" = "purchaseInvoiceLineId"
      WHERE "purchaseInvoiceLineId" IS NOT NULL
    `);

    await queryInterface.removeColumn(
      "purchase_payment_lines",
      "purchaseInvoiceLineId"
    );

    // Remove purchaseInvoiceHeaderId from header

    await queryInterface.removeColumn(
      "purchase_payment_headers",
      "purchaseInvoiceHeaderId"
    );
  },
};