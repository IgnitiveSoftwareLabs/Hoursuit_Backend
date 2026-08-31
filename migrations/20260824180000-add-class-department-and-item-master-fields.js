"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Create 'classes' table if not exists
    const tables = await queryInterface.showAllTables();
    if (!tables.includes("classes")) {
      await queryInterface.createTable("classes", {
        id: {
          type: Sequelize.INTEGER.UNSIGNED,
          autoIncrement: true,
          primaryKey: true,
        },
        class_name: {
          type: Sequelize.STRING(200),
          allowNull: false,
        },
        subsidiary_id: {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: true,
          references: {
            model: "subsidiaries",
            key: "id",
          },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        },
        CompanyId: {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: false,
          references: {
            model: "companies",
            key: "id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        user_id: {
          type: Sequelize.BIGINT,
          allowNull: true,
          references: {
            model: "Users",
            key: "id",
          },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
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
      });
    }

    // 2. Create 'departments' table if not exists
    if (!tables.includes("departments")) {
      await queryInterface.createTable("departments", {
        id: {
          type: Sequelize.INTEGER.UNSIGNED,
          autoIncrement: true,
          primaryKey: true,
        },
        department_name: {
          type: Sequelize.STRING(200),
          allowNull: false,
        },
        subsidiary_id: {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: true,
          references: {
            model: "subsidiaries",
            key: "id",
          },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        },
        CompanyId: {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: false,
          references: {
            model: "companies",
            key: "id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        user_id: {
          type: Sequelize.BIGINT,
          allowNull: true,
          references: {
            model: "Users",
            key: "id",
          },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
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
      });
    }

    // 3. Add columns to 'item_masters'
    const tableDesc = await queryInterface.describeTable("item_masters");

    if (!tableDesc.class_id) {
      await queryInterface.addColumn("item_masters", "class_id", {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        defaultValue: null,
        references: {
          model: "classes",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      });
    }

    if (!tableDesc.department_id) {
      await queryInterface.addColumn("item_masters", "department_id", {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        defaultValue: null,
        references: {
          model: "departments",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      });
    }

    if (!tableDesc.location_id) {
      await queryInterface.addColumn("item_masters", "location_id", {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        defaultValue: null,
        references: {
          model: "warehouses",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      });
    }

    if (!tableDesc.safety_stock_level) {
      await queryInterface.addColumn("item_masters", "safety_stock_level", {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: null,
      });
    }

    if (!tableDesc.days) {
      await queryInterface.addColumn("item_masters", "days", {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: null,
      });
    }

    if (!tableDesc.manufacturer) {
      await queryInterface.addColumn("item_masters", "manufacturer", {
        type: Sequelize.STRING(200),
        allowNull: true,
        defaultValue: null,
      });
    }

    if (!tableDesc.purchase_price) {
      await queryInterface.addColumn("item_masters", "purchase_price", {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: null,
      });
    }

    if (!tableDesc.total_value) {
      await queryInterface.addColumn("item_masters", "total_value", {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: null,
      });
    }

    if (!tableDesc.purchase_desc) {
      await queryInterface.addColumn("item_masters", "purchase_desc", {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: null,
      });
    }

    if (!tableDesc.item_image) {
      await queryInterface.addColumn("item_masters", "item_image", {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: null,
      });
    }

    if (!tableDesc.sales_desc) {
      await queryInterface.addColumn("item_masters", "sales_desc", {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: null,
      });
    }

    if (!tableDesc.sales_price) {
      await queryInterface.addColumn("item_masters", "sales_price", {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: null,
      });
    }

    if (!tableDesc.shipping_cost) {
      await queryInterface.addColumn("item_masters", "shipping_cost", {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: null,
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableDesc = await queryInterface.describeTable("item_masters");

    const columnsToRemove = [
      "class_id",
      "department_id",
      "location_id",
      "safety_stock_level",
      "days",
      "manufacturer",
      "purchase_price",
      "total_value",
      "purchase_desc",
      "item_image",
      "sales_desc",
      "sales_price",
      "shipping_cost",
    ];

    for (const col of columnsToRemove) {
      if (tableDesc[col]) {
        await queryInterface.removeColumn("item_masters", col);
      }
    }

    await queryInterface.dropTable("departments");
    await queryInterface.dropTable("classes");
  },
};
