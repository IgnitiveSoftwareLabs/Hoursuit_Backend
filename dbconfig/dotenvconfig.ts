import dotenv from "dotenv";
dotenv.config();

const dotenvconfig = {
    DB_HOST: process.env.DB_HOST || "localhost",
    DB_NAME: process.env.DB_NAME || "testdb",
    DB_PASSWORD: process.env.DB_PASSWORD || "",
    DB_USER: process.env.DB_USER || "root",
};

export default dotenvconfig;