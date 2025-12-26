import { EntitySchema } from "typeorm";
import { User } from "./user.entity.js";

export const Bicicletero = new EntitySchema({
  name: "Bicicletero",
  tableName: "bicicleteros",
  columns: {
    id: {
      primary: true,
      type: "int",
      generated: "increment",
    },
    ubicacion: {
      type: "varchar",
      length: 255,
      nullable: false,
    },
    latitud: {
      type: "decimal",
      precision: 10,
      scale: 8,
      nullable: true,
    },
    longitud: {
      type: "decimal",
      precision: 11,
      scale: 8,
      nullable: true,
    },
    capacidad: {
      type: "int",
      nullable: false,
    },
    // Nuevos campos para Georreferencia y QR (Requisito Alumno)
    codigoQr: {
      type: "varchar",
      length: 255,
      unique: true,
      nullable: true,
    },
    bicicletasGuardadas: {
      type: "int",
      default: 0,
    },
    estado: {
      type: "enum",
      enum: ["operativo", "mantenimiento", "fuera_de_Servicio"],
      default: "operativo",
    },
    horaApertura: {
      type: "time",
      nullable: true,
    },
    horaCierre: {
      type: "time",
      nullable: true,
    },
  },
  relations: {
    guardiaAsignado: {
      type: "many-to-one",
      target: "User",
      joinColumn: true,
      nullable: true, //bicicleteros sin guardia
      inverseSide: "BicicleterosAsignados"
    },
    usos: {
      type: "one-to-many",
      target: "UsoBicicletero",
      inverseSide: "bicicletero",
    },
  },
})