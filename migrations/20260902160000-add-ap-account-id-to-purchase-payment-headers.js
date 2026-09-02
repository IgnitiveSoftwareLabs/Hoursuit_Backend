'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable(
      'purchase_payment_headers'
    );

    if (!tableDescription.ap_account_id) {
      await queryInterface.addColumn(
        'purchase_payment_headers',
        'ap_account_id',
        {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'chart_of_account_masters',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        }
      );
    }
  },

  async down(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable(
      'purchase_payment_headers'
    );

    if (tableDescription.ap_account_id) {
      await queryInterface.removeColumn(
        'purchase_payment_headers',
        'ap_account_id'
      );
    }
  },
};