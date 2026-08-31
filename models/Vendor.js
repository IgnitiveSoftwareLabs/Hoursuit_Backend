'use strict';
const { Model, DataTypes, Op } = require('sequelize');

module.exports = (sequelize) => {
  class Vendor extends Model {
    static associate(models) {
      // Sublist associations
      if (models.VendorAddressBook) {
        Vendor.hasMany(models.VendorAddressBook, {
          foreignKey: 'vendor_id',
          as: 'addressBook',
          onDelete: 'CASCADE',
        });
      }
      if (models.VendorSubsidiary) {
        Vendor.hasMany(models.VendorSubsidiary, {
          foreignKey: 'vendor_id',
          as: 'subsidiaryAssignments',
          onDelete: 'CASCADE',
        });
      }

      // Foreign key relationships
      if (models.SubsidiaryMaster || models.Subsidiary) {
        const SubsidiaryModel = models.SubsidiaryMaster || models.Subsidiary;
        Vendor.belongsTo(SubsidiaryModel, {
          foreignKey: 'primary_subsidiary_id',
          as: 'primarySubsidiary',
          onDelete: 'RESTRICT',
        });

        if (models.VendorSubsidiary) {
          Vendor.belongsToMany(SubsidiaryModel, {
            through: models.VendorSubsidiary,
            foreignKey: 'vendor_id',
            otherKey: 'subsidiary_id',
            as: 'subsidiaries',
          });
        }
      }

      if (models.CurrencyMaster || models.Currency) {
        Vendor.belongsTo(models.CurrencyMaster || models.Currency, {
          foreignKey: 'currency_id',
          as: 'currency',
          onDelete: 'SET NULL',
        });
      }

      if (models.RegistrationType) {
        Vendor.belongsTo(models.RegistrationType, {
          foreignKey: 'registration_type_id',
          as: 'registrationType',
          onDelete: 'SET NULL',
        });
      }

      if (models.PanAvailability) {
        Vendor.belongsTo(models.PanAvailability, {
          foreignKey: 'pan_avl_id',
          as: 'panAvailability',
          onDelete: 'SET NULL',
        });
      }

      if (models.VendorCategory) {
        Vendor.belongsTo(models.VendorCategory, {
          foreignKey: 'category_id',
          as: 'category',
          onDelete: 'SET NULL',
        });
      }

      if (models.PaymentTerms) {
        Vendor.belongsTo(models.PaymentTerms, {
          foreignKey: 'terms_id',
          as: 'terms',
          onDelete: 'SET NULL',
        });
      }

      if (models.ChartOfAccountMaster || models.AccountMaster) {
        const AccountModel = models.ChartOfAccountMaster || models.AccountMaster;
        Vendor.belongsTo(AccountModel, {
          foreignKey: 'default_payables_account_id',
          as: 'defaultPayablesAccount',
          onDelete: 'SET NULL',
        });
        Vendor.belongsTo(AccountModel, {
          foreignKey: 'default_payment_account_id',
          as: 'defaultPaymentAccount',
          onDelete: 'SET NULL',
        });
        Vendor.belongsTo(AccountModel, {
          foreignKey: 'opening_balance_account_id',
          as: 'openingBalanceAccount',
          onDelete: 'SET NULL',
        });
      }

      if (models.Company) {
        Vendor.belongsTo(models.Company, {
          foreignKey: 'company_id',
          as: 'company',
          onDelete: 'CASCADE',
        });
      }

      if (models.User) {
        Vendor.belongsTo(models.User, {
          foreignKey: 'user_id',
          as: 'user',
          onDelete: 'RESTRICT',
        });
      }
    }
  }

  Vendor.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      entity_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
        unique: true,
        comment: 'Auto-generated or manual unique Vendor ID / Code',
      },
      vendor_type: {
        type: DataTypes.ENUM('COMPANY', 'INDIVIDUAL'),
        allowNull: false,
        defaultValue: 'COMPANY',
      },
      salutation: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: 'Salutation e.g. MR, MS, MRS, DR, PROF',
      },
      first_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      middle_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      last_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      company_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Display name / registered business name',
      },
      legal_name: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Formal legal entity name',
      },
      category_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
      },
      web_address: {
        type: DataTypes.STRING(255),
        allowNull: true,
        validate: {
          isUrl: true,
        },
      },
      comments: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      email: {
        type: DataTypes.STRING(100),
        allowNull: true,
        validate: {
          isEmail: true,
        },
      },
      phone: {
        type: DataTypes.STRING(30),
        allowNull: true,
      },
      alt_phone: {
        type: DataTypes.STRING(30),
        allowNull: true,
      },
      fax: {
        type: DataTypes.STRING(30),
        allowNull: true,
      },
      terms_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
      },
      credit_limit: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
        defaultValue: 0.00,
      },
      opening_balance: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
        defaultValue: 0.00,
        comment: 'Initial Accounts Payable opening balance amount',
      },
      opening_balance_account_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        comment: 'Accounts Payable chart of accounts master for opening balance',
      },
      default_payables_account_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
      },
      default_payment_account_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
      },
      primary_subsidiary_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
      },
      currency_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
      },
      gstin: {
        type: DataTypes.STRING(15),
        allowNull: true,
        validate: {
          len: [0, 15],
        },
      },
      aadhar_no: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: 'Aadhaar Number (Optional)',
      },
      tin_no: {
        type: DataTypes.STRING(30),
        allowNull: true,
        comment: 'TIN Tax Identification Number',
      },
      pan_avl_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
      },
      registration_type_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
      },
      company_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        comment: 'Multi-tenant isolation identifier',
      },
      user_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: 'Mandatory tracking user identifier',
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      tableName: 'vendor_details',
      sequelize,
      timestamps: true,
      indexes: [
        {
          unique: true,
          name: 'unique_entity_id',
          fields: ['entity_id'],
        },
        {
          unique: true,
          name: 'unique_gstin_non_null',
          fields: ['gstin'],
          where: {
            gstin: {
              [Op.ne]: null,
            },
          },
        },
        {
          name: 'idx_vendor_company',
          fields: ['company_id'],
        },
        {
          name: 'idx_vendor_primary_subsidiary',
          fields: ['primary_subsidiary_id'],
        },
      ],
    }
  );

  return Vendor;
};
