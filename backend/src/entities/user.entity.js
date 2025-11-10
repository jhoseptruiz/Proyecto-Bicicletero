import { EntitySchema } from "typeorm";
import { Bicicletero } from "./bicicletero.entity.js";

export const User = new EntitySchema({
  name: "User",
  tableName: "users",
  columns: {
    id: {
      primary: true,
      type: "int",
      generated: "increment",
    },

    nombre:{
      type:"varchar",
      length:100,
      nullable: false,
    },

    apellido:{
      type:"varchar",
      length:100,
      nullable: false
    },

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
      default: "admin",
      nullable: false,
    },

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
  relations:{
    BicicleterosAsignados:{
      type: "one-to-many",
      target: "Bicicletero",
      inverseSide: "guardiaAsignado",
    },
  },
});