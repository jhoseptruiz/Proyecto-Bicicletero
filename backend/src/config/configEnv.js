import dotenv from "dotenv";

dotenv.config();

export const HOST = process.env.HOST || "localhost";
export const PORT = process.env.PORT || 3000;

export const DB_HOST = process.env.DB_HOST || "localhost";
export const DB_PORT = process.env.DB_PORT || 5432;
export const DB_USERNAME = process.env.DB_USERNAME;
export const DB_PASSWORD = process.env.DB_PASSWORD;
export const DATABASE = process.env.DATABASE;

export const JWT_SECRET = process.env.JWT_SECRET;