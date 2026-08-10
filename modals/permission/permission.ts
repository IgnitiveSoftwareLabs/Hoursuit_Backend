import { Model, DataTypes, Optional } from "sequelize";
import sequelize from "../../dbconfig/dbconfig";

interface PermissionAttributes {
    id: number;
    name: string;
    module: string;
    action: string;
    description?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

interface PermissionCreationAttributes
    extends Optional<
        PermissionAttributes,
        "id" | "description" | "createdAt" | "updatedAt"
    > { }

class Permission
    extends Model<PermissionAttributes, PermissionCreationAttributes>
    implements PermissionAttributes {
    public id!: number;
    public name!: string;
    public module!: string;
    public action!: string;
    public description!: string;
    public createdAt?: Date;
    public updatedAt?: Date;

    static async seedPermissions() {
        try {
            // Convert legacy ENUM columns to VARCHAR in PostgreSQL / MySQL if needed
            try {
                await sequelize.query(`
                    ALTER TABLE permissions 
                    MODIFY COLUMN module VARCHAR(255) NOT NULL,
                    MODIFY COLUMN action VARCHAR(50) NOT NULL;
                `).catch(() => {});
            } catch (alterError) {
                // Table might be fresh
            }

            const namespaces = [
                // Platform Masters
                "platform.accountType",
                "platform.itemType",
                // Company & Master Entities
                "company.customer",
                "company.vendor",
                "company.employee",
                // Inventory
                "inventory.item",
                "inventory.itemGroup",
                "inventory.warehouse",
                "inventory.godown",
                "inventory.stack",
                "inventory.commodity",
                "inventory.category",
                "inventory.uom",
                // Finance
                "finance.chartOfAccount",
                "finance.misType",
                "finance.voucherType",
                "finance.journalEntry",
                "finance.debitNote",
                "finance.creditNote",
                "finance.glBalance",
                "finance.journal",
                // Sales
                "sales.salesOrder",
                "sales.deliveryChallan",
                "sales.salesReturn",
                // Purchase
                "purchase.purchaseOrder",
                "purchase.purchaseInvoice",
                "purchase.grn",
                "purchase.purchaseReturn",
                "purchase.qualityReport",
                // Common Masters
                "master.workCategory",
                "master.serviceCategory",
                "master.serviceType",
                "master.currency",
                "master.subsidiary",
                "master.paymentMethod",
                "master.registrationType",
                "master.panAvailability",
                "master.hsnSac",
                // System
                "system.log",
                "system.user",
            ];

            const actions = ["create", "read", "update", "delete"];

            const permissions: Array<{
                name: string;
                module: string;
                action: string;
                description: string;
            }> = [];

            for (const namespace of namespaces) {
                for (const action of actions) {
                    permissions.push({
                        name: `${namespace}.${action}`,
                        module: namespace,
                        action: action,
                        description: `${action.toUpperCase()} permission for ${namespace}`,
                    });
                }
            }

            await Permission.bulkCreate(permissions, { ignoreDuplicates: true });
            console.log("Permissions seeded successfully");
        } catch (error) {
            console.error("Error seeding permissions:", error);
        }
    }
}

Permission.init(
    {
        id: {
            type: DataTypes.BIGINT.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: true,
        },
        module: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        action: {
            type: DataTypes.STRING(50),
            allowNull: false,
        },
        description: {
            type: DataTypes.STRING(500),
            allowNull: true,
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
    },
    {
        sequelize,
        modelName: "Permission",
        tableName: "permissions",
        timestamps: true,
    }
);

// Auto-seed permissions after table is synced
Permission.afterSync(async () => {
    await Permission.seedPermissions();
});

export default Permission;