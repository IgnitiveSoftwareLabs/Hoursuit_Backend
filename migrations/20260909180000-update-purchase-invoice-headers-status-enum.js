'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      await queryInterface.sequelize.query('ALTER TABLE "purchase_invoice_headers" ALTER COLUMN "status" DROP DEFAULT;');
      await queryInterface.sequelize.query('ALTER TABLE "purchase_invoice_headers" ALTER COLUMN "status" TYPE VARCHAR(50) USING "status"::text;');
      await queryInterface.sequelize.query('ALTER TABLE "purchase_invoice_headers" ALTER COLUMN "status" SET DEFAULT \'PENDING_APPROVAL\';');
      await queryInterface.sequelize.query(`
        UPDATE "purchase_invoice_headers"
        SET "status" = CASE
          WHEN "status" = 'DRAFT' THEN 'PENDING_APPROVAL'
          WHEN "status" = 'POSTED' THEN 'APPROVED'
          ELSE "status"
        END;
      `);
    } catch (error) {
      console.warn('Could not update purchase_invoice_headers status in migration:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      await queryInterface.sequelize.query('ALTER TABLE "purchase_invoice_headers" ALTER COLUMN "status" DROP DEFAULT;');
      await queryInterface.sequelize.query('ALTER TABLE "purchase_invoice_headers" ALTER COLUMN "status" TYPE VARCHAR(50) USING "status"::text;');
      await queryInterface.sequelize.query('ALTER TABLE "purchase_invoice_headers" ALTER COLUMN "status" SET DEFAULT \'PENDING_APPROVAL\';');
    } catch (error) {
      console.warn('Could not revert purchase_invoice_headers status in migration:', error.message);
    }
  },
};
