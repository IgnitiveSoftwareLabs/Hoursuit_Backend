'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const statuses = [
      'PENDING_APPROVAL',
      'APPROVED',
      'REJECTED',
      'PENDING_RECEIPT',
      'PARTIALLY_RECEIVED',
      'RECEIVED',
      'PENDING_BILLING',
      'PARTIALLY_BILLED',
      'FULLY_BILLED',
      'CLOSED',
      'CANCELLED',
      // Legacy compatibility
      'DRAFT',
      'PARTIAL_RECEIVED',
      'COMPLETED',
    ];

    try {
      // 1. Drop existing default
      await queryInterface.sequelize.query(`ALTER TABLE "purchase_order_headers" ALTER COLUMN "status" DROP DEFAULT;`);

      // 2. Ensure all enum values exist in PostgreSQL type
      const [existingEnums] = await queryInterface.sequelize.query(`
        SELECT e.enumlabel
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typname = 'enum_purchase_order_headers_status';
      `);
      const existingLabels = (existingEnums || []).map((r) => r.enumlabel);

      if (existingLabels.length === 0) {
        const valuesList = statuses.map((s) => `'${s}'`).join(', ');
        await queryInterface.sequelize.query(`CREATE TYPE "enum_purchase_order_headers_status" AS ENUM (${valuesList});`);
      } else {
        for (const s of statuses) {
          if (!existingLabels.includes(s)) {
            await queryInterface.sequelize.query(`ALTER TYPE "enum_purchase_order_headers_status" ADD VALUE IF NOT EXISTS '${s}';`);
          }
        }
      }

      // 3. Migrate legacy statuses
      await queryInterface.sequelize.query(`
        UPDATE "purchase_order_headers"
        SET "status" = CASE
          WHEN "status"::text = 'DRAFT' THEN 'PENDING_APPROVAL'
          WHEN "status"::text = 'PARTIAL_RECEIVED' THEN 'PARTIALLY_RECEIVED'
          WHEN "status"::text = 'COMPLETED' THEN 'CLOSED'
          ELSE "status"
        END;
      `);

      // 4. Alter column type to enum
      await queryInterface.sequelize.query(`
        ALTER TABLE "purchase_order_headers"
        ALTER COLUMN "status" TYPE "enum_purchase_order_headers_status"
        USING "status"::text::"enum_purchase_order_headers_status";
      `);

      // 5. Set default value to PENDING_APPROVAL
      await queryInterface.sequelize.query(`
        ALTER TABLE "purchase_order_headers"
        ALTER COLUMN "status" SET DEFAULT 'PENDING_APPROVAL'::"enum_purchase_order_headers_status";
      `);
    } catch (error) {
      console.warn('Could not update purchase_order_headers status enum in migration:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      await queryInterface.sequelize.query(`ALTER TABLE "purchase_order_headers" ALTER COLUMN "status" DROP DEFAULT;`);
      await queryInterface.sequelize.query(`
        ALTER TABLE "purchase_order_headers"
        ALTER COLUMN "status" TYPE VARCHAR(50)
        USING "status"::text;
      `);
      await queryInterface.sequelize.query(`
        ALTER TABLE "purchase_order_headers"
        ALTER COLUMN "status" SET DEFAULT 'PENDING_APPROVAL';
      `);
    } catch (error) {
      console.warn('Could not revert purchase_order_headers status enum in migration:', error.message);
    }
  },
};
