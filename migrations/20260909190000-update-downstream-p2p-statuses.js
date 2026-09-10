'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // 1. purchase_payment_headers
      await queryInterface.sequelize.query('ALTER TABLE "purchase_payment_headers" ALTER COLUMN "status" DROP DEFAULT;');
      await queryInterface.sequelize.query('ALTER TABLE "purchase_payment_headers" ALTER COLUMN "status" TYPE VARCHAR(50) USING "status"::text;');
      await queryInterface.sequelize.query('ALTER TABLE "purchase_payment_headers" ALTER COLUMN "status" SET DEFAULT \'PENDING_APPROVAL\';');
      await queryInterface.sequelize.query(`
        UPDATE "purchase_payment_headers"
        SET "status" = CASE
          WHEN "status" = 'DRAFT' THEN 'PENDING_APPROVAL'
          WHEN "status" = 'POSTED' THEN 'APPROVED'
          ELSE "status"
        END;
      `);

      // 2. purchase_return_headers
      await queryInterface.sequelize.query('ALTER TABLE "purchase_return_headers" ALTER COLUMN "status" DROP DEFAULT;');
      await queryInterface.sequelize.query('ALTER TABLE "purchase_return_headers" ALTER COLUMN "status" TYPE VARCHAR(50) USING "status"::text;');
      await queryInterface.sequelize.query('ALTER TABLE "purchase_return_headers" ALTER COLUMN "status" SET DEFAULT \'PENDING_APPROVAL\';');
      await queryInterface.sequelize.query(`
        UPDATE "purchase_return_headers"
        SET "status" = CASE
          WHEN "status" = 'DRAFT' THEN 'PENDING_APPROVAL'
          WHEN "status" = 'AUTHORIZED' OR "status" = 'APPROVED' THEN 'PENDING_RETURN'
          WHEN "status" = 'PARTIALLY_FULFILLED' THEN 'PARTIALLY_RETURNED'
          WHEN "status" = 'FULFILLED' OR "status" = 'RETURNED' THEN 'PENDING_CREDIT'
          ELSE "status"
        END;
      `);

      // 3. purchase_return_fulfillment_headers
      await queryInterface.sequelize.query('ALTER TABLE "purchase_return_fulfillment_headers" ALTER COLUMN "status" DROP DEFAULT;');
      await queryInterface.sequelize.query('ALTER TABLE "purchase_return_fulfillment_headers" ALTER COLUMN "status" TYPE VARCHAR(50) USING "status"::text;');
      await queryInterface.sequelize.query('ALTER TABLE "purchase_return_fulfillment_headers" ALTER COLUMN "status" SET DEFAULT \'PENDING_APPROVAL\';');
      await queryInterface.sequelize.query(`
        UPDATE "purchase_return_fulfillment_headers"
        SET "status" = CASE
          WHEN "status" = 'DRAFT' THEN 'PENDING_APPROVAL'
          WHEN "status" = 'FULFILLED' THEN 'APPROVED'
          ELSE "status"
        END;
      `);

      // 4. vendor_credit_headers
      await queryInterface.sequelize.query('ALTER TABLE "vendor_credit_headers" ALTER COLUMN "status" DROP DEFAULT;');
      await queryInterface.sequelize.query('ALTER TABLE "vendor_credit_headers" ALTER COLUMN "status" TYPE VARCHAR(50) USING "status"::text;');
      await queryInterface.sequelize.query('ALTER TABLE "vendor_credit_headers" ALTER COLUMN "status" SET DEFAULT \'PENDING_APPROVAL\';');
      await queryInterface.sequelize.query(`
        UPDATE "vendor_credit_headers"
        SET "status" = CASE
          WHEN "status" = 'DRAFT' THEN 'PENDING_APPROVAL'
          WHEN "status" = 'POSTED' THEN 'APPROVED'
          ELSE "status"
        END;
      `);

      // 5. vendor_refund_headers
      await queryInterface.sequelize.query('ALTER TABLE "vendor_refund_headers" ALTER COLUMN "status" DROP DEFAULT;');
      await queryInterface.sequelize.query('ALTER TABLE "vendor_refund_headers" ALTER COLUMN "status" TYPE VARCHAR(50) USING "status"::text;');
      await queryInterface.sequelize.query('ALTER TABLE "vendor_refund_headers" ALTER COLUMN "status" SET DEFAULT \'PENDING_APPROVAL\';');
      await queryInterface.sequelize.query(`
        UPDATE "vendor_refund_headers"
        SET "status" = CASE
          WHEN "status" = 'DRAFT' THEN 'PENDING_APPROVAL'
          WHEN "status" = 'POSTED' THEN 'APPROVED'
          ELSE "status"
        END;
      `);

      console.log('Successfully updated downstream P2P status columns and normalized values.');
    } catch (error) {
      console.warn('Could not update downstream P2P status in migration:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      for (const tbl of [
        'purchase_payment_headers',
        'purchase_return_headers',
        'purchase_return_fulfillment_headers',
        'vendor_credit_headers',
        'vendor_refund_headers'
      ]) {
        await queryInterface.sequelize.query(`ALTER TABLE "${tbl}" ALTER COLUMN "status" TYPE VARCHAR(50) USING "status"::text;`);
      }
    } catch (error) {
      console.warn('Could not revert downstream P2P statuses in migration:', error.message);
    }
  },
};
