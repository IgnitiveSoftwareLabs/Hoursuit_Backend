
import { Model, DataTypes, Optional } from "sequelize";
import Joi from "joi";
import sequelize from "../../../dbconfig/dbconfig";

interface StateCodeAttributes {
    id: number;
    state_name: string;
    state_code: string;
    createdAt?: Date;
    updatedAt?: Date;
}

interface StateCodeCreationAttributes extends Optional<StateCodeAttributes, "id"> { }

class StateCode extends Model<StateCodeAttributes, StateCodeCreationAttributes>
    implements StateCodeAttributes {
    public id!: number;
    public state_name!: string;
    public state_code!: string;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    static validateStateCode(stateCode: StateCodeAttributes) {
        const schema = Joi.object({
            state_name: Joi.string().min(2).max(100).required(),
            state_code: Joi.string().min(2).max(10).required(),
        });
        return schema.validate(stateCode);
    }

    static async seedStates() {
        try {
            const now = new Date();
            const states = [
                { state_name: 'Andhra Pradesh', state_code: 'AP' },
                { state_name: 'Arunachal Pradesh', state_code: 'AR' },
                { state_name: 'Assam', state_code: 'AS' },
                { state_name: 'Bihar', state_code: 'BR' },
                { state_name: 'Chhattisgarh', state_code: 'CG' },
                { state_name: 'Goa', state_code: 'GA' },
                { state_name: 'Gujarat', state_code: 'GJ' },
                { state_name: 'Haryana', state_code: 'HR' },
                { state_name: 'Himachal Pradesh', state_code: 'HP' },
                { state_name: 'Jharkhand', state_code: 'JH' },
                { state_name: 'Karnataka', state_code: 'KA' },
                { state_name: 'Kerala', state_code: 'KL' },
                { state_name: 'Madhya Pradesh', state_code: 'MP' },
                { state_name: 'Maharashtra', state_code: 'MH' },
                { state_name: 'Manipur', state_code: 'MN' },
                { state_name: 'Meghalaya', state_code: 'ML' },
                { state_name: 'Mizoram', state_code: 'MZ' },
                { state_name: 'Nagaland', state_code: 'NL' },
                { state_name: 'Odisha', state_code: 'OD' },
                { state_name: 'Punjab', state_code: 'PB' },
                { state_name: 'Rajasthan', state_code: 'RJ' },
                { state_name: 'Sikkim', state_code: 'SK' },
                { state_name: 'Tamil Nadu', state_code: 'TN' },
                { state_name: 'Telangana', state_code: 'TG' },
                { state_name: 'Tripura', state_code: 'TR' },
                { state_name: 'Uttar Pradesh', state_code: 'UP' },
                { state_name: 'Uttarakhand', state_code: 'UK' },
                { state_name: 'West Bengal', state_code: 'WB' },
                { state_name: 'Andaman and Nicobar Islands', state_code: 'AN' },
                { state_name: 'Chandigarh', state_code: 'CH' },
                { state_name: 'Dadra and Nagar Haveli and Daman and Diu', state_code: 'DN' },
                { state_name: 'Delhi', state_code: 'DL' },
                { state_name: 'Jammu and Kashmir', state_code: 'JK' },
                { state_name: 'Ladakh', state_code: 'LA' },
                { state_name: 'Lakshadweep', state_code: 'LD' },
                { state_name: 'Puducherry', state_code: 'PY' },
            ];
            const stateRows = states.map(s => ({
                ...s,
                createdAt: now,
                updatedAt: now,
            }));
            // @ts-ignore
            await StateCode.bulkCreate(stateRows, { ignoreDuplicates: true });
            console.log('States seeded successfully');
        } catch (error) {
            console.error('Error seeding states:', error);
        }
    }
}

StateCode.init(
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },
        state_name: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true,
        },
        state_code: {
            type: DataTypes.STRING(10),
            allowNull: false,
            unique: true,
        },
    },
    {
        tableName: "state_codes",
        sequelize,
        timestamps: true,
    }
);

// Auto-seed states after table is synced
StateCode.afterSync(async () => {
    await StateCode.seedStates();
});

// Static method to seed state codes
async function seedStates() {
    try {
        const now = new Date();
        const states = [
            { state_name: 'Andhra Pradesh', state_code: 'AP' },
            { state_name: 'Arunachal Pradesh', state_code: 'AR' },
            { state_name: 'Assam', state_code: 'AS' },
            { state_name: 'Bihar', state_code: 'BR' },
            { state_name: 'Chhattisgarh', state_code: 'CG' },
            { state_name: 'Goa', state_code: 'GA' },
            { state_name: 'Gujarat', state_code: 'GJ' },
            { state_name: 'Haryana', state_code: 'HR' },
            { state_name: 'Himachal Pradesh', state_code: 'HP' },
            { state_name: 'Jharkhand', state_code: 'JH' },
            { state_name: 'Karnataka', state_code: 'KA' },
            { state_name: 'Kerala', state_code: 'KL' },
            { state_name: 'Madhya Pradesh', state_code: 'MP' },
            { state_name: 'Maharashtra', state_code: 'MH' },
            { state_name: 'Manipur', state_code: 'MN' },
            { state_name: 'Meghalaya', state_code: 'ML' },
            { state_name: 'Mizoram', state_code: 'MZ' },
            { state_name: 'Nagaland', state_code: 'NL' },
            { state_name: 'Odisha', state_code: 'OD' },
            { state_name: 'Punjab', state_code: 'PB' },
            { state_name: 'Rajasthan', state_code: 'RJ' },
            { state_name: 'Sikkim', state_code: 'SK' },
            { state_name: 'Tamil Nadu', state_code: 'TN' },
            { state_name: 'Telangana', state_code: 'TG' },
            { state_name: 'Tripura', state_code: 'TR' },
            { state_name: 'Uttar Pradesh', state_code: 'UP' },
            { state_name: 'Uttarakhand', state_code: 'UK' },
            { state_name: 'West Bengal', state_code: 'WB' },
            { state_name: 'Andaman and Nicobar Islands', state_code: 'AN' },
            { state_name: 'Chandigarh', state_code: 'CH' },
            { state_name: 'Dadra and Nagar Haveli and Daman and Diu', state_code: 'DN' },
            { state_name: 'Delhi', state_code: 'DL' },
            { state_name: 'Jammu and Kashmir', state_code: 'JK' },
            { state_name: 'Ladakh', state_code: 'LA' },
            { state_name: 'Lakshadweep', state_code: 'LD' },
            { state_name: 'Puducherry', state_code: 'PY' },
        ];
        const stateRows = states.map(s => ({
            ...s,
            createdAt: now,
            updatedAt: now,
        }));

        await StateCode.bulkCreate(stateRows, { ignoreDuplicates: true });
        console.log('States seeded successfully');
    } catch (error) {
        console.error('Error seeding states:', error);
    }
}

// Auto-seed states after table is synced
StateCode.afterSync(async () => {
    await seedStates();
});

export default StateCode;