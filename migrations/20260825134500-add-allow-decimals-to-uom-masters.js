'use strict';

const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    const tableDescription = await queryInterface.describeTable('uom_masters');

    if (!tableDescription.allow_decimals) {
      await queryInterface.addColumn('uom_masters', 'allow_decimals', {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      });

      // Automatically set allow_decimals = false for discrete UOM names
      const discreteUoms = [
        'EACH', 'EA', 'PCS', 'PIECE', 'PIECES', 'BOX', 'BOXES', 'UNIT', 'UNITS', 
        'PAIR', 'PAIRS', 'SET', 'SETS', 'NOS', 'NUMBER', 'NUMBERS', 'BAG', 'BAGS', 
        'PACK', 'PACKS', 'CARTON', 'CARTONS', 'DRUM', 'DRUMS', 'BOTTLE', 'BOTTLES', 
        'CAN', 'CANS', 'ROLL', 'ROLLS', 'BARREL', 'BARRELS'
      ];

      for (const name of discreteUoms) {
        await queryInterface.sequelize.query(
          `UPDATE uom_masters SET allow_decimals = false WHERE UPPER(uom_name) = '${name}'`
        );
      }
    }
  },

  async down(queryInterface) {
    const tableDescription = await queryInterface.describeTable('uom_masters');

    if (tableDescription.allow_decimals) {
      await queryInterface.removeColumn('uom_masters', 'allow_decimals');
    }
  },
};
