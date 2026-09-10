"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if table already exists
    const tables = await queryInterface.showAllTables();
    if (!tables.includes("employee_masters")) {
      await queryInterface.createTable("employee_masters", {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        designation: {
          type: Sequelize.STRING(100),
          allowNull: false,
        },
        city_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: "city_masters",
            key: "id",
          },
          onUpdate: "CASCADE",
          onDelete: "RESTRICT",
        },
        subsidiary_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: "subsidiaries",
            key: "id",
          },
          onUpdate: "CASCADE",
          onDelete: "RESTRICT",
        },
        company_id: {
          type: Sequelize.INTEGER,
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
          allowNull: false,
          references: {
            model: "Users",
            key: "id",
          },
          onUpdate: "CASCADE",
          onDelete: "RESTRICT",
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

      await queryInterface.addIndex("employee_masters", ["user_id", "company_id"], {
        unique: true,
        name: "employee_masters_user_id_company_id_unique",
      });
    }
  },

  down: async (queryInterface) => {
    const tables = await queryInterface.showAllTables();
    if (tables.includes("employee_masters")) {
      await queryInterface.dropTable("employee_masters");
    }
  },
};
