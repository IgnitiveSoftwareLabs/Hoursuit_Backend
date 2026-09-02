'use strict';

const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    const tableDescription = await queryInterface.describeTable('grn_lines');

    if (!tableDescription.location_id && !tableDescription.locationId) {
      await queryInterface.addColumn('grn_lines', 'location_id', {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'city_masters',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
    }
  },

  async down(queryInterface) {
    const tableDescription = await queryInterface.describeTable('grn_lines');

    if (tableDescription.location_id) {
      await queryInterface.removeColumn('grn_lines', 'location_id');
    }
    if (tableDescription.locationId) {
      await queryInterface.removeColumn('grn_lines', 'locationId');
    }
  },
};
