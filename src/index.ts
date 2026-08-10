import dotenv from "dotenv";

import syncdatabase from "../middleware/syncdatabase";
import createApp from "./subserver/subserver";
import sequelize from "../dbconfig/dbconfig";

dotenv.config();
const port = parseInt(process.env.PORT || "4000", 10);
const app = createApp();

const db = async () => {
    try {
        await sequelize.authenticate();
        await syncdatabase();
        console.log("connection established");
    } catch (error: any) {
        console.error(error.message);
    }
};

db().then(() => {
    app.listen(port, "0.0.0.0", () => {
        console.log(`Server is running on http://0.0.0.0:${port}`);
    });
});