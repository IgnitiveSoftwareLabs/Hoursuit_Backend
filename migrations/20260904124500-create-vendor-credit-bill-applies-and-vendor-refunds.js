'use strict';

const { DataTypes } = require('sequelize');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();

    // 1. Create vendor_credit_bill_applies table
    if (!tables.includes('vendor_credit_bill_applies')) {
      await queryInterface.createTable('vendor_credit_bill_applies', {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        companyId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'companies',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        vendorCreditId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'vendor_credit_headers',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        purchaseInvoiceId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'purchase_invoice_headers',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        appliedAmount: {
          type: DataTypes.DECIMAL(15, 4),
          allowNull: false,
          defaultValue: 0,
        },
        applyDate: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
        },
        remarks: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        user_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'Users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
        },
      });
    }

    // 2. Create vendor_refund_headers table
    if (!tables.includes('vendor_refund_headers')) {
      await queryInterface.createTable('vendor_refund_headers', {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        companyId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'companies',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        refundNumber: {
          type: DataTypes.STRING(50),
          allowNull: false,
          unique: true,
        },
        vendorCreditId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'vendor_credit_headers',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        vendorId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'vendor_details',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        bankAccountId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'chart_of_accounts',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        refundDate: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
        },
        refundAmount: {
          type: DataTypes.DECIMAL(15, 4),
          allowNull: false,
          defaultValue: 0,
        },
        currency: {
          type: DataTypes.STRING(10),
          allowNull: false,
          defaultValue: 'INR',
        },
        paymentMode: {
          type: DataTypes.STRING(50),
          allowNull: true,
          defaultValue: 'Bank Transfer',
        },
        referenceNumber: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        remarks: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        status: {
          type: DataTypes.ENUM('DRAFT', 'POSTED', 'CANCELLED'),
          allowNull: false,
          defaultValue: 'POSTED',
        },
        user_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'Users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
        },
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();

    if (tables.includes('vendor_refund_headers')) {
      await queryInterface.dropTable('vendor_refund_headers');
      try {
        await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_vendor_refund_headers_status";');
      } catch (err) {
        // ignore if type doesn't exist
      }
    }

    if (tables.includes('vendor_credit_bill_applies')) {
      await queryInterface.dropTable('vendor_credit_bill_applies');
    }
  },
};
