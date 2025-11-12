import "reflect-metadata";
import { DataSource } from "typeorm";
import { DATABASE, DB_USERNAME, DB_HOST, DB_PASSWORD, DB_PORT } from "./configEnv.js";

import { User } from "../entities/user.entity.js";
import { Bicicletero } from "../entities/bicicletero.entity.js";
import { Bicicleta } from "../entities/bicicleta.entity.js";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: `${DB_HOST}`,
  port: DB_PORT,
  username: `${DB_USERNAME}`,
  password: `${DB_PASSWORD}`,
  database: `${DATABASE}`,
  
  synchronize: true, 
  logging: false,

  entities: [User, Bicicletero, Bicicleta], 

  migrations: [],
  subscribers: [],
});

export async function connectDB() {
  try {
    await AppDataSource.initialize();
    console.log("=> Conexión exitosa a la base de datos PostgreSQL!");
  } catch (error) {
    console.error("Error al conectar con la base de datos:", error);
    process.exit(1);
  }
}