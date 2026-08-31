"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // 1. Create vendor_address_books table if it does not exist
      const addressBooksTableExists = await queryInterface.showAllTables({ transaction })
        .then(tables => tables.includes("vendor_address_books"));

      if (!addressBooksTableExists) {
        await queryInterface.createTable(
          "vendor_address_books",
          {
            id: {
              type: Sequelize.INTEGER.UNSIGNED,
              autoIncrement: true,
              primaryKey: true,
            },
            vendor_id: {
              type: Sequelize.INTEGER.UNSIGNED,
              allowNull: false,
              references: {
                model: "vendor_details",
                key: "id",
              },
              onUpdate: "CASCADE",
              onDelete: "CASCADE",
            },
            label: {
              type: Sequelize.STRING(100),
              allowNull: true,
            },
            attention: {
              type: Sequelize.STRING(150),
              allowNull: true,
            },
            addressee: {
              type: Sequelize.STRING(200),
              allowNull: true,
            },
            addr1: {
              type: Sequelize.STRING(255),
              allowNull: false,
            },
            addr2: {
              type: Sequelize.STRING(255),
              allowNull: true,
            },
            city_id: {
              type: Sequelize.INTEGER.UNSIGNED,
              allowNull: true,
            },
            state_code_id: {
              type: Sequelize.INTEGER.UNSIGNED,
              allowNull: true,
            },
            zip: {
              type: Sequelize.STRING(20),
              allowNull: true,
            },
            country_id: {
              type: Sequelize.INTEGER.UNSIGNED,
              allowNull: true,
            },
            default_billing: {
              type: Sequelize.BOOLEAN,
              allowNull: false,
              defaultValue: false,
            },
            default_shipping: {
              type: Sequelize.BOOLEAN,
              allowNull: false,
              defaultValue: false,
            },
            createdAt: {
              type: Sequelize.DATE,
              allowNull: false,
              defaultValue: Sequelize.fn("NOW"),
            },
            updatedAt: {
              type: Sequelize.DATE,
              allowNull: false,
              defaultValue: Sequelize.fn("NOW"),
            },
          },
          { transaction }
        );
      }

      // 2. Create vendor_subsidiaries table if it does not exist
      const subsidiariesTableExists = await queryInterface.showAllTables({ transaction })
        .then(tables => tables.includes("vendor_subsidiaries"));

      if (!subsidiariesTableExists) {
        await queryInterface.createTable(
          "vendor_subsidiaries",
          {
            id: {
              type: Sequelize.INTEGER.UNSIGNED,
              autoIncrement: true,
              primaryKey: true,
            },
            vendor_id: {
              type: Sequelize.INTEGER.UNSIGNED,
              allowNull: false,
              references: {
                model: "vendor_details",
                key: "id",
              },
              onUpdate: "CASCADE",
              onDelete: "CASCADE",
            },
            subsidiary_id: {
              type: Sequelize.INTEGER.UNSIGNED,
              allowNull: false,
              references: {
                model: "subsidiaries",
                key: "id",
              },
              onUpdate: "CASCADE",
              onDelete: "CASCADE",
            },
            credit_limit: {
              type: Sequelize.DECIMAL(15, 2),
              allowNull: true,
              defaultValue: null,
            },
            tax_code_id: {
              type: Sequelize.INTEGER.UNSIGNED,
              allowNull: true,
            },
            is_primary: {
              type: Sequelize.BOOLEAN,
              allowNull: false,
              defaultValue: false,
            },
            createdAt: {
              type: Sequelize.DATE,
              allowNull: false,
              defaultValue: Sequelize.fn("NOW"),
            },
            updatedAt: {
              type: Sequelize.DATE,
              allowNull: false,
              defaultValue: Sequelize.fn("NOW"),
            },
          },
          { transaction }
        );

        await queryInterface.addIndex(
          "vendor_subsidiaries",
          ["vendor_id", "subsidiary_id"],
          {
            unique: true,
            name: "unique_vendor_subsidiary_junction",
            transaction,
          }
        );
      }

      const tableDescription = await queryInterface.describeTable("vendor_details", { transaction });

      // 3. Migrate existing address data to vendor_address_books if address column exists
      if (tableDescription.address) {
        await queryInterface.sequelize.query(
          `INSERT INTO vendor_address_books (vendor_id, label, addr1, city_id, state_code_id, default_billing, default_shipping, "createdAt", "updatedAt")
           SELECT id, 'Primary Address', address, city_id, state_code_id, true, true, NOW(), NOW()
           FROM vendor_details
           WHERE address IS NOT NULL AND address != '';`,
          { transaction }
        );
      }

      // 4. Migrate existing subsidiary_id data to vendor_subsidiaries if subsidiary_id column exists
      if (tableDescription.subsidiary_id) {
        await queryInterface.sequelize.query(
          `INSERT INTO vendor_subsidiaries (vendor_id, subsidiary_id, is_primary, "createdAt", "updatedAt")
           SELECT id, subsidiary_id, true, NOW(), NOW()
           FROM vendor_details
           WHERE subsidiary_id IS NOT NULL;`,
          { transaction }
        );
      }

      // 5. Update vendor_details table columns

      // company_name
      if (!tableDescription.company_name) {
        await queryInterface.addColumn(
          "vendor_details",
          "company_name",
          {
            type: Sequelize.STRING(255),
            allowNull: true,
          },
          { transaction }
        );

        if (tableDescription.vendor_name) {
          await queryInterface.sequelize.query(
            `UPDATE vendor_details SET company_name = vendor_name WHERE company_name IS NULL;`,
            { transaction }
          );
        }

        await queryInterface.changeColumn(
          "vendor_details",
          "company_name",
          {
            type: Sequelize.STRING(255),
            allowNull: false,
          },
          { transaction }
        );
      }

      if (tableDescription.vendor_name) {
        await queryInterface.removeColumn("vendor_details", "vendor_name", { transaction });
      }

      // primary_subsidiary_id
      if (!tableDescription.primary_subsidiary_id) {
        await queryInterface.addColumn(
          "vendor_details",
          "primary_subsidiary_id",
          {
            type: Sequelize.INTEGER.UNSIGNED,
            allowNull: true,
            references: {
              model: "subsidiaries",
              key: "id",
            },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
          },
          { transaction }
        );

        if (tableDescription.subsidiary_id) {
          await queryInterface.sequelize.query(
            `UPDATE vendor_details SET primary_subsidiary_id = subsidiary_id WHERE primary_subsidiary_id IS NULL;`,
            { transaction }
          );
        }
      }

      // entity_id
      if (!tableDescription.entity_id) {
        await queryInterface.addColumn(
          "vendor_details",
          "entity_id",
          {
            type: Sequelize.STRING(50),
            allowNull: true,
          },
          { transaction }
        );
      }

      // vendor_type
      if (!tableDescription.vendor_type) {
        await queryInterface.addColumn(
          "vendor_details",
          "vendor_type",
          {
            type: Sequelize.ENUM("COMPANY", "INDIVIDUAL"),
            allowNull: false,
            defaultValue: "COMPANY",
          },
          { transaction }
        );
      }

      // salutation
      if (!tableDescription.salutation) {
        await queryInterface.addColumn(
          "vendor_details",
          "salutation",
          {
            type: Sequelize.STRING(20),
            allowNull: true,
          },
          { transaction }
        );
      }

      // first_name
      if (!tableDescription.first_name) {
        await queryInterface.addColumn(
          "vendor_details",
          "first_name",
          {
            type: Sequelize.STRING(100),
            allowNull: true,
          },
          { transaction }
        );
      }

      // middle_name
      if (!tableDescription.middle_name) {
        await queryInterface.addColumn(
          "vendor_details",
          "middle_name",
          {
            type: Sequelize.STRING(100),
            allowNull: true,
          },
          { transaction }
        );
      }

      // last_name
      if (!tableDescription.last_name) {
        await queryInterface.addColumn(
          "vendor_details",
          "last_name",
          {
            type: Sequelize.STRING(100),
            allowNull: true,
          },
          { transaction }
        );
      }

      // legal_name
      if (!tableDescription.legal_name) {
        await queryInterface.addColumn(
          "vendor_details",
          "legal_name",
          {
            type: Sequelize.STRING(255),
            allowNull: true,
          },
          { transaction }
        );
      }

      // category_id
      if (!tableDescription.category_id) {
        await queryInterface.addColumn(
          "vendor_details",
          "category_id",
          {
            type: Sequelize.INTEGER.UNSIGNED,
            allowNull: true,
          },
          { transaction }
        );
      }

      // web_address
      if (!tableDescription.web_address) {
        await queryInterface.addColumn(
          "vendor_details",
          "web_address",
          {
            type: Sequelize.STRING(255),
            allowNull: true,
          },
          { transaction }
        );
      }

      // comments
      if (!tableDescription.comments) {
        await queryInterface.addColumn(
          "vendor_details",
          "comments",
          {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          { transaction }
        );
      }

      // email
      if (!tableDescription.email) {
        await queryInterface.addColumn(
          "vendor_details",
          "email",
          {
            type: Sequelize.STRING(100),
            allowNull: true,
          },
          { transaction }
        );
      }

      // phone
      if (!tableDescription.phone) {
        await queryInterface.addColumn(
          "vendor_details",
          "phone",
          {
            type: Sequelize.STRING(30),
            allowNull: true,
          },
          { transaction }
        );
      }

      // alt_phone
      if (!tableDescription.alt_phone) {
        await queryInterface.addColumn(
          "vendor_details",
          "alt_phone",
          {
            type: Sequelize.STRING(30),
            allowNull: true,
          },
          { transaction }
        );
      }

      // fax
      if (!tableDescription.fax) {
        await queryInterface.addColumn(
          "vendor_details",
          "fax",
          {
            type: Sequelize.STRING(30),
            allowNull: true,
          },
          { transaction }
        );
      }

      // terms_id
      if (!tableDescription.terms_id) {
        await queryInterface.addColumn(
          "vendor_details",
          "terms_id",
          {
            type: Sequelize.INTEGER.UNSIGNED,
            allowNull: true,
          },
          { transaction }
        );
      }

      // credit_limit
      if (!tableDescription.credit_limit) {
        await queryInterface.addColumn(
          "vendor_details",
          "credit_limit",
          {
            type: Sequelize.DECIMAL(15, 2),
            allowNull: true,
            defaultValue: 0.00,
          },
          { transaction }
        );
      }

      // opening_balance
      if (!tableDescription.opening_balance) {
        await queryInterface.addColumn(
          "vendor_details",
          "opening_balance",
          {
            type: Sequelize.DECIMAL(15, 2),
            allowNull: true,
            defaultValue: 0.00,
          },
          { transaction }
        );
      }

      // opening_balance_account_id
      if (!tableDescription.opening_balance_account_id) {
        await queryInterface.addColumn(
          "vendor_details",
          "opening_balance_account_id",
          {
            type: Sequelize.INTEGER.UNSIGNED,
            allowNull: true,
            references: {
              model: "chart_of_accounts",
              key: "id",
            },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
          },
          { transaction }
        );
      }

      // default_payables_account_id
      if (!tableDescription.default_payables_account_id) {
        await queryInterface.addColumn(
          "vendor_details",
          "default_payables_account_id",
          {
            type: Sequelize.INTEGER.UNSIGNED,
            allowNull: true,
            references: {
              model: "chart_of_accounts",
              key: "id",
            },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
          },
          { transaction }
        );
      }

      // default_payment_account_id
      if (!tableDescription.default_payment_account_id) {
        await queryInterface.addColumn(
          "vendor_details",
          "default_payment_account_id",
          {
            type: Sequelize.INTEGER.UNSIGNED,
            allowNull: true,
            references: {
              model: "chart_of_accounts",
              key: "id",
            },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
          },
          { transaction }
        );
      }

      // aadhar_no
      if (!tableDescription.aadhar_no) {
        await queryInterface.addColumn(
          "vendor_details",
          "aadhar_no",
          {
            type: Sequelize.STRING(20),
            allowNull: true,
          },
          { transaction }
        );
      }

      // tin_no
      if (!tableDescription.tin_no) {
        await queryInterface.addColumn(
          "vendor_details",
          "tin_no",
          {
            type: Sequelize.STRING(30),
            allowNull: true,
          },
          { transaction }
        );
      }

      // 6. Remove legacy columns safely
      if (tableDescription.address) {
        await queryInterface.removeColumn("vendor_details", "address", { transaction });
      }
      if (tableDescription.city_id) {
        await queryInterface.removeColumn("vendor_details", "city_id", { transaction });
      }
      if (tableDescription.state_code_id) {
        await queryInterface.removeColumn("vendor_details", "state_code_id", { transaction });
      }
      if (tableDescription.subsidiary_id) {
        await queryInterface.removeColumn("vendor_details", "subsidiary_id", { transaction });
      }

      // Add unique index on entity_id
      try {
        await queryInterface.addIndex(
          "vendor_details",
          ["entity_id"],
          {
            unique: true,
            name: "unique_entity_id",
            transaction,
          }
        );
      } catch (e) {
        console.log("Index unique_entity_id already exists or skipped:", e.message);
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const tableDescription = await queryInterface.describeTable("vendor_details", { transaction });

      // Re-add legacy columns
      if (!tableDescription.address) {
        await queryInterface.addColumn(
          "vendor_details",
          "address",
          {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          { transaction }
        );
      }

      if (!tableDescription.city_id) {
        await queryInterface.addColumn(
          "vendor_details",
          "city_id",
          {
            type: Sequelize.INTEGER.UNSIGNED,
            allowNull: true,
          },
          { transaction }
        );
      }

      if (!tableDescription.state_code_id) {
        await queryInterface.addColumn(
          "vendor_details",
          "state_code_id",
          {
            type: Sequelize.INTEGER.UNSIGNED,
            allowNull: true,
          },
          { transaction }
        );
      }

      if (!tableDescription.subsidiary_id) {
        await queryInterface.addColumn(
          "vendor_details",
          "subsidiary_id",
          {
            type: Sequelize.INTEGER.UNSIGNED,
            allowNull: true,
          },
          { transaction }
        );
      }

      // Restore data from sublists
      const dialect = queryInterface.sequelize.getDialect();
      if (dialect === "postgres") {
        await queryInterface.sequelize.query(
          `UPDATE vendor_details v
           SET address = a.addr1, city_id = a.city_id, state_code_id = a.state_code_id
           FROM vendor_address_books a
           WHERE v.id = a.vendor_id AND a.default_billing = true;`,
          { transaction }
        );
      } else {
        await queryInterface.sequelize.query(
          `UPDATE vendor_details v
           INNER JOIN vendor_address_books a ON v.id = a.vendor_id AND a.default_billing = true
           SET v.address = a.addr1, v.city_id = a.city_id, v.state_code_id = a.state_code_id;`,
          { transaction }
        );
      }

      await queryInterface.sequelize.query(
        `UPDATE vendor_details SET subsidiary_id = primary_subsidiary_id WHERE subsidiary_id IS NULL;`,
        { transaction }
      );

      // Drop NetSuite added columns
      const addedCols = [
        "entity_id", "vendor_type", "salutation", "first_name", "middle_name", "last_name",
        "legal_name", "category_id", "web_address", "comments", "email", "phone", "alt_phone",
        "fax", "terms_id", "credit_limit", "opening_balance", "opening_balance_account_id",
        "default_payables_account_id", "default_payment_account_id", "primary_subsidiary_id",
        "aadhar_no", "tin_no"
      ];

      for (const col of addedCols) {
        if (tableDescription[col]) {
          await queryInterface.removeColumn("vendor_details", col, { transaction });
        }
      }

      // Drop sublist tables
      await queryInterface.dropTable("vendor_subsidiaries", { transaction });
      await queryInterface.dropTable("vendor_address_books", { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
