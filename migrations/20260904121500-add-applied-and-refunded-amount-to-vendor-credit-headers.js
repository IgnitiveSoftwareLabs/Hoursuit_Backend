'use strict';

const { DataTypes } = require('sequelize');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      const tableDescription = await queryInterface.describeTable('vendor_credit_headers');

      // 1. appliedAmount
      if (!tableDescription.appliedAmount && !tableDescription.applied_amount) {
        await queryInterface.addColumn('vendor_credit_headers', 'appliedAmount', {
          type: DataTypes.DECIMAL(15, 4),
          allowNull: true,
          defaultValue: 0,
        });
      }

      // 2. refundedAmount
      if (!tableDescription.refundedAmount && !tableDescription.refunded_amount) {
        await queryInterface.addColumn('vendor_credit_headers', 'refundedAmount', {
          type: DataTypes.DECIMAL(15, 4),
          allowNull: true,
          defaultValue: 0,
        });
      }

      // 3. subtotal (if not already present)
      if (!tableDescription.subtotal) {
        await queryInterface.addColumn('vendor_credit_headers', 'subtotal', {
          type: DataTypes.DECIMAL(15, 4),
          allowNull: true,
          defaultValue: 0,
        });
      }

      // 4. discountAmount (if not already present)
      if (!tableDescription.discountAmount && !tableDescription.discount_amount) {
        await queryInterface.addColumn('vendor_credit_headers', 'discountAmount', {
          type: DataTypes.DECIMAL(15, 4),
          allowNull: true,
          defaultValue: 0,
        });
      }

      // 5. taxAmount (if not already present)
      if (!tableDescription.taxAmount && !tableDescription.tax_amount) {
        await queryInterface.addColumn('vendor_credit_headers', 'taxAmount', {
          type: DataTypes.DECIMAL(15, 4),
          allowNull: true,
          defaultValue: 0,
        });
      }
    } catch (error) {
      console.warn('Could not update vendor_credit_headers table:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      const tableDescription = await queryInterface.describeTable('vendor_credit_headers');

      if (tableDescription.appliedAmount) {
        await queryInterface.removeColumn('vendor_credit_headers', 'appliedAmount');
      } else if (tableDescription.applied_amount) {
        await queryInterface.removeColumn('vendor_credit_headers', 'applied_amount');
      }

      if (tableDescription.refundedAmount) {
        await queryInterface.removeColumn('vendor_credit_headers', 'refundedAmount');
      } else if (tableDescription.refunded_amount) {
        await queryInterface.removeColumn('vendor_credit_headers', 'refunded_amount');
      }
    } catch (error) {
      console.warn('Could not revert vendor_credit_headers columns:', error.message);
      throw error;
    }
  },
};
