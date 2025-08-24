import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 1011;
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;

export default { ...process.env, PORT, MONGO_URI, JWT_SECRET };
