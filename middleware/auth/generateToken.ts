import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();
const generateToken = async (id: any, created_by: any) => {
    const token = await jwt.sign({ id: id, created_by: created_by }, process.env.JWT_SECRET as string, { expiresIn: "7d" });
    return token;
};
const refreshToken = async (id: any, created_by: any) => {
    const token = await jwt.sign({ id: id, created_by: created_by }, process.env.JWT_SECRET as string, { expiresIn: "15d" });
    return token;
}
export default generateToken;
export { refreshToken };