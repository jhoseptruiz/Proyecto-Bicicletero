import { EntitySchema } from "typeorm";
import { User } from "./user.entity.js";

export const Bicicleta = new EntitySchema({
  name: "Bicicleta",
  tableName: "bicicletas",
  columns: {
    id: {
      primary: true,
      type: "int",
      generated: "increment",
    },
    marca: {
      type: "varchar",
      length: 100,
      nullable: false,
    },
    fotoUrl: {
      type: "varchar",
      length: 500,
      nullable: true,
    },
  },
  relations: {
    propietario: {
      type: "many-to-one",
      target: "User",
      joinColumn: { name: "propietarioRut" },
      inverseSide: "bicicletas",
    },
    usos: {
      type: "one-to-many",
      target: "UsoBicicletero",
      inverseSide: "bicicleta",
    },
  },
});