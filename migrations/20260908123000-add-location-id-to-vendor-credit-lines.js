'use strict';

const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    try {
      const tableDescription = await queryInterface.describeTable('vendor_credit_lines');

      if (!tableDescription.location_id && !tableDescription.locationId) {
        await queryInterface.addColumn('vendor_credit_lines', 'location_id', {
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
    } catch (error) {
      console.warn('Could not update vendor_credit_lines table:', error.message);
    }
  },

  async down(queryInterface) {
    try {
      const tableDescription = await queryInterface.describeTable('vendor_credit_lines');

      if (tableDescription.location_id) {
        await queryInterface.removeColumn('vendor_credit_lines', 'location_id');
      }
      if (tableDescription.locationId) {
        await queryInterface.removeColumn('vendor_credit_lines', 'locationId');
      }
    } catch (error) {
      console.warn('Could not revert vendor_credit_lines table:', error.message);
    }
  },
};
