import { Sequelize } from "sequelize";
import dotenvconfig from "./dotenvconfig";

// Initialize Sequelize connection
const sequelize = new Sequelize(
    dotenvconfig.DB_NAME,
    dotenvconfig.DB_USER,
    dotenvconfig.DB_PASSWORD,
    {
        host: dotenvconfig.DB_HOST,
        port: 5432,
        dialect: "postgres",
        logging: false, // Disable logging for cleaner output
        dialectOptions: {
            // PostgreSQL-specific options
        }
    }
);

export default sequelize;