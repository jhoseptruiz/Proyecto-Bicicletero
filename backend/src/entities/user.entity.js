// Proyecto-Bicicletero/backend/src/entities/user.entity.js

import { EntitySchema } from "typeorm";
import { Bicicletero } from "./bicicletero.entity.js";

export const User = new EntitySchema({
  name: "User",
  tableName: "users",
  columns: {

    // --- Clave Primaria ---
    rut: {
      primary: true,
      type: "varchar",
      length: 12,
      nullable: false,
    },

    // --- Datos Personales ---
    nombre: {
      type: "varchar",
      length: 100,
      nullable: false,
    },
    apellido: {
      type: "varchar",
      length: 100,
      nullable: false
    },

    // --- Credenciales y Rol ---
    email: {
      type: "varchar",
      length: 255,
      unique: true,
      nullable: false,
    },
    password: {
      type: "varchar",
      length: 255,
      nullable: false,
    },
    role: {
      type: "varchar",
      enum: ["alumno", "guardia", "admin"],
      default: "alumno",
      nullable: false,
    },
    // --- Timestamps ---
    created_at: {
      type: "timestamp",
      createDate: true,
      default: () => "CURRENT_TIMESTAMP",
    },
    updated_at: {
      type: "timestamp",
      updateDate: true,
      default: () => "CURRENT_TIMESTAMP",
    },
  },
  //guardia puede tener varios bicicleteros asignados
  relations: {
   bicicleterosAM: {
      type: "one-to-many",
      target: "Bicicletero",
      inverseSide: "guardiaAM", // Debe coincidir con bicicletero.entity.js
    },
    bicicleterosPM: {
      type: "one-to-many",
      target: "Bicicletero",
      inverseSide: "guardiaPM", // Debe coincidir con bicicletero.entity.js
    },
    usos: {
      type: "one-to-many",
      target: "RegistroUso",
      inverseSide: "usuario",
    },
  },
});