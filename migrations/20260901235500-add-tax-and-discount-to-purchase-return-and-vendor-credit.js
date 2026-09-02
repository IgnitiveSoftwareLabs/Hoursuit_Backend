'use strict';

const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    // 1. Update purchase_return_lines
    try {
      const prLinesDesc = await queryInterface.describeTable('purchase_return_lines');

      if (!prLinesDesc.discountPercent && !prLinesDesc.discount_percent) {
        await queryInterface.addColumn('purchase_return_lines', 'discountPercent', {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: true,
          defaultValue: 0,
        });
      }

      if (!prLinesDesc.discountAmount && !prLinesDesc.discount_amount) {
        await queryInterface.addColumn('purchase_return_lines', 'discountAmount', {
          type: DataTypes.DECIMAL(18, 2),
          allowNull: true,
          defaultValue: 0,
        });
      }

      if (!prLinesDesc.taxPercent && !prLinesDesc.tax_percent) {
        await queryInterface.addColumn('purchase_return_lines', 'taxPercent', {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: true,
          defaultValue: 0,
        });
      }

      if (!prLinesDesc.taxAmount && !prLinesDesc.tax_amount) {
        await queryInterface.addColumn('purchase_return_lines', 'taxAmount', {
          type: DataTypes.DECIMAL(18, 2),
          allowNull: true,
          defaultValue: 0,
        });
      }

      if (!prLinesDesc.lineTotal && !prLinesDesc.line_total) {
        await queryInterface.addColumn('purchase_return_lines', 'lineTotal', {
          type: DataTypes.DECIMAL(18, 2),
          allowNull: true,
          defaultValue: 0,
        });
      }
    } catch (error) {
      console.warn('Could not update purchase_return_lines table:', error.message);
    }

    // 2. Update purchase_return_headers
    try {
      const prHeaderDesc = await queryInterface.describeTable('purchase_return_headers');

      if (!prHeaderDesc.subtotal) {
        await queryInterface.addColumn('purchase_return_headers', 'subtotal', {
          type: DataTypes.DECIMAL(18, 2),
          allowNull: true,
          defaultValue: 0,
        });
      }

      if (!prHeaderDesc.discountAmount && !prHeaderDesc.discount_amount) {
        await queryInterface.addColumn('purchase_return_headers', 'discountAmount', {
          type: DataTypes.DECIMAL(18, 2),
          allowNull: true,
          defaultValue: 0,
        });
      }

      if (!prHeaderDesc.taxAmount && !prHeaderDesc.tax_amount) {
        await queryInterface.addColumn('purchase_return_headers', 'taxAmount', {
          type: DataTypes.DECIMAL(18, 2),
          allowNull: true,
          defaultValue: 0,
        });
      }

      if (!prHeaderDesc.totalAmount && !prHeaderDesc.total_amount) {
        await queryInterface.addColumn('purchase_return_headers', 'totalAmount', {
          type: DataTypes.DECIMAL(18, 2),
          allowNull: true,
          defaultValue: 0,
        });
      }
    } catch (error) {
      console.warn('Could not update purchase_return_headers table:', error.message);
    }

    // 3. Update vendor_credit_lines
    try {
      const vcLinesDesc = await queryInterface.describeTable('vendor_credit_lines');

      if (!vcLinesDesc.discountPercent && !vcLinesDesc.discount_percent) {
        await queryInterface.addColumn('vendor_credit_lines', 'discountPercent', {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: true,
          defaultValue: 0,
        });
      }

      if (!vcLinesDesc.discountAmount && !vcLinesDesc.discount_amount) {
        await queryInterface.addColumn('vendor_credit_lines', 'discountAmount', {
          type: DataTypes.DECIMAL(18, 2),
          allowNull: true,
          defaultValue: 0,
        });
      }

      if (!vcLinesDesc.taxPercent && !vcLinesDesc.tax_percent) {
        await queryInterface.addColumn('vendor_credit_lines', 'taxPercent', {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: true,
          defaultValue: 0,
        });
      }

      if (!vcLinesDesc.taxAmount && !vcLinesDesc.tax_amount) {
        await queryInterface.addColumn('vendor_credit_lines', 'taxAmount', {
          type: DataTypes.DECIMAL(18, 2),
          allowNull: true,
          defaultValue: 0,
        });
      }
    } catch (error) {
      console.warn('Could not update vendor_credit_lines table:', error.message);
    }

    // 4. Update vendor_credit_headers
    try {
      const vcHeaderDesc = await queryInterface.describeTable('vendor_credit_headers');

      if (!vcHeaderDesc.subtotal) {
        await queryInterface.addColumn('vendor_credit_headers', 'subtotal', {
          type: DataTypes.DECIMAL(15, 4),
          allowNull: true,
          defaultValue: 0,
        });
      }

      if (!vcHeaderDesc.discountAmount && !vcHeaderDesc.discount_amount) {
        await queryInterface.addColumn('vendor_credit_headers', 'discountAmount', {
          type: DataTypes.DECIMAL(15, 4),
          allowNull: true,
          defaultValue: 0,
        });
      }

      if (!vcHeaderDesc.taxAmount && !vcHeaderDesc.tax_amount) {
        await queryInterface.addColumn('vendor_credit_headers', 'taxAmount', {
          type: DataTypes.DECIMAL(15, 4),
          allowNull: true,
          defaultValue: 0,
        });
      }
    } catch (error) {
      console.warn('Could not update vendor_credit_headers table:', error.message);
    }
  },

  async down(queryInterface) {
    // 1. Revert purchase_return_lines
    try {
      const prLinesDesc = await queryInterface.describeTable('purchase_return_lines');
      if (prLinesDesc.discountPercent) await queryInterface.removeColumn('purchase_return_lines', 'discountPercent');
      if (prLinesDesc.discountAmount) await queryInterface.removeColumn('purchase_return_lines', 'discountAmount');
      if (prLinesDesc.taxPercent) await queryInterface.removeColumn('purchase_return_lines', 'taxPercent');
      if (prLinesDesc.taxAmount) await queryInterface.removeColumn('purchase_return_lines', 'taxAmount');
      if (prLinesDesc.lineTotal) await queryInterface.removeColumn('purchase_return_lines', 'lineTotal');
    } catch (error) {
      console.warn('Could not revert purchase_return_lines columns:', error.message);
    }

    // 2. Revert purchase_return_headers
    try {
      const prHeaderDesc = await queryInterface.describeTable('purchase_return_headers');
      if (prHeaderDesc.subtotal) await queryInterface.removeColumn('purchase_return_headers', 'subtotal');
      if (prHeaderDesc.discountAmount) await queryInterface.removeColumn('purchase_return_headers', 'discountAmount');
      if (prHeaderDesc.taxAmount) await queryInterface.removeColumn('purchase_return_headers', 'taxAmount');
      if (prHeaderDesc.totalAmount) await queryInterface.removeColumn('purchase_return_headers', 'totalAmount');
    } catch (error) {
      console.warn('Could not revert purchase_return_headers columns:', error.message);
    }

    // 3. Revert vendor_credit_lines
    try {
      const vcLinesDesc = await queryInterface.describeTable('vendor_credit_lines');
      if (vcLinesDesc.discountPercent) await queryInterface.removeColumn('vendor_credit_lines', 'discountPercent');
      if (vcLinesDesc.discountAmount) await queryInterface.removeColumn('vendor_credit_lines', 'discountAmount');
      if (vcLinesDesc.taxPercent) await queryInterface.removeColumn('vendor_credit_lines', 'taxPercent');
      if (vcLinesDesc.taxAmount) await queryInterface.removeColumn('vendor_credit_lines', 'taxAmount');
    } catch (error) {
      console.warn('Could not revert vendor_credit_lines columns:', error.message);
    }

    // 4. Revert vendor_credit_headers
    try {
      const vcHeaderDesc = await queryInterface.describeTable('vendor_credit_headers');
      if (vcHeaderDesc.subtotal) await queryInterface.removeColumn('vendor_credit_headers', 'subtotal');
      if (vcHeaderDesc.discountAmount) await queryInterface.removeColumn('vendor_credit_headers', 'discountAmount');
      if (vcHeaderDesc.taxAmount) await queryInterface.removeColumn('vendor_credit_headers', 'taxAmount');
    } catch (error) {
      console.warn('Could not revert vendor_credit_headers columns:', error.message);
    }
  },
};
