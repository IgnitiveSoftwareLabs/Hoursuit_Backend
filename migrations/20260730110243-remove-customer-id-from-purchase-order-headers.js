'use strict';

const { DataTypes } = require('sequelize');

module.exports = {
    async up(queryInterface) {
        try {
            await queryInterface.removeConstraint(
                'purchase_order_headers',
                'purchase_order_headers_ibfk_1'
            );
        } catch (err) {
            console.log('Foreign key constraint not found, skipping...');
        }

        await queryInterface.removeColumn(
            'purchase_order_headers',
            'customer_id'
        );
    },

    async down(queryInterface) {
        await queryInterface.addColumn(
            'purchase_order_headers',
            'customer_id',
            {
                type: DataTypes.INTEGER.UNSIGNED,
                allowNull: false,
            }
        );

        await queryInterface.addConstraint(
            'purchase_order_headers',
            {
                fields: ['customer_id'],
                type: 'foreign key',
                name: 'purchase_order_headers_ibfk_1',
                references: {
                    table: 'customer_details',
                    field: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'RESTRICT',
            }
        );
    },
};