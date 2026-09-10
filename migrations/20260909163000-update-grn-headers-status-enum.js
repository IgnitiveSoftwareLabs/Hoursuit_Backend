'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const statuses = [
      'PENDING_RECEIPT',
      'APPROVED',
      'PARTIALLY_RECEIVED',
      'PENDING_BILLING',
      'PENDING_BILLING_PARTIALLY_RECEIVED',
      'FULLY_BILLED',
      'CLOSED',
      'CANCELLED',
      'REJECTED',
      // Legacy compatibility
      'DRAFT',
      'RECEIVED',
      'QC_PENDING',
      'QC_COMPLETED',
      'COMPLETED',
      'BILLED',
    ];

    try {
      // 1. Drop existing default
      await queryInterface.sequelize.query(`ALTER TABLE "grn_headers" ALTER COLUMN "status" DROP DEFAULT;`);

      // 2. Ensure all enum values exist in PostgreSQL type
      const [existingEnums] = await queryInterface.sequelize.query(`
        SELECT e.enumlabel
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typname = 'enum_grn_headers_status';
      `);
      const existingLabels = (existingEnums || []).map((r) => r.enumlabel);

      if (existingLabels.length === 0) {
        const valuesList = statuses.map((s) => `'${s}'`).join(', ');
        await queryInterface.sequelize.query(`CREATE TYPE "enum_grn_headers_status" AS ENUM (${valuesList});`);
      } else {
        for (const s of statuses) {
          if (!existingLabels.includes(s)) {
            await queryInterface.sequelize.query(`ALTER TYPE "enum_grn_headers_status" ADD VALUE IF NOT EXISTS '${s}';`);
          }
        }
      }

      // 3. Migrate legacy statuses
      await queryInterface.sequelize.query(`
        UPDATE "grn_headers"
        SET "status" = CASE
          WHEN "status"::text = 'DRAFT' THEN 'PENDING_RECEIPT'
          WHEN "status"::text = 'COMPLETED' THEN 'CLOSED'
          WHEN "status"::text = 'BILLED' THEN 'FULLY_BILLED'
          ELSE "status"
        END;
      `);

      // 4. Alter column type to enum
      await queryInterface.sequelize.query(`
        ALTER TABLE "grn_headers"
        ALTER COLUMN "status" TYPE "enum_grn_headers_status"
        USING "status"::text::"enum_grn_headers_status";
      `);

      // 5. Set default value to PENDING_RECEIPT
      await queryInterface.sequelize.query(`
        ALTER TABLE "grn_headers"
        ALTER COLUMN "status" SET DEFAULT 'PENDING_RECEIPT'::"enum_grn_headers_status";
      `);
    } catch (error) {
      console.warn('Could not update grn_headers status enum in migration:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      await queryInterface.sequelize.query(`ALTER TABLE "grn_headers" ALTER COLUMN "status" DROP DEFAULT;`);
      await queryInterface.sequelize.query(`
        ALTER TABLE "grn_headers"
        ALTER COLUMN "status" TYPE VARCHAR(50)
        USING "status"::text;
      `);
      await queryInterface.sequelize.query(`
        ALTER TABLE "grn_headers"
        ALTER COLUMN "status" SET DEFAULT 'PENDING_RECEIPT';
      `);
    } catch (error) {
      console.warn('Could not revert grn_headers status enum in migration:', error.message);
    }
  },
};
