'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Update Purchase Invoice journal entries
    await queryInterface.sequelize.query(`
      UPDATE journal_entry_headers 
      SET source_name = 'PurchaseInvoice' 
      WHERE entry_no LIKE 'JE-INV-%' 
         OR narration LIKE '%Purchase Invoice%' 
         OR reference_no LIKE 'INV-%' 
         OR reference_no LIKE 'Inv-%';
    `);

    // 2. Update Purchase Payment journal entries
    await queryInterface.sequelize.query(`
      UPDATE journal_entry_headers 
      SET source_name = 'PurchasePayment' 
      WHERE entry_no LIKE 'JE-PAY-%' 
         OR narration LIKE '%Purchase Payment%' 
         OR source_name = 'PURCHASE_PAYMENT';
    `);

    // 3. Update Purchase Return journal entries
    await queryInterface.sequelize.query(`
      UPDATE journal_entry_headers 
      SET source_name = 'PurchaseReturn' 
      WHERE entry_no LIKE 'JE-RET-%' 
         OR narration LIKE '%Purchase Return%' 
         OR source_name = 'PURCHASE_RETURN';
    `);
  },

  async down(queryInterface, Sequelize) {
    // No-op rollback
  }
};
