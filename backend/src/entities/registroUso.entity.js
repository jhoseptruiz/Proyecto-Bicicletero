import { EntitySchema } from "typeorm";

export const RegistroUso = new EntitySchema({
  name: "RegistroUso",
  tableName: "registros_uso",
  columns: {
    id: {
      primary: true,
      type: "int",
      generated: "increment",
    },
    fechaIngreso: {
      type: "timestamp",
      createDate: true, // Se crea automáticamente cuando el usuario hace la solicitud
    },
    fechaSalida: {
      type: "timestamp",
      nullable: true,
    },
    casillero: {
      type: "varchar", // Puede ser "A1", "10", etc.
      length: 50,
      nullable: true, // Es null hasta que el guardia lo asigna al Aprobar
    },
    estado: {
      type: "enum",
      enum: ["pendiente", "activo", "finalizado", "rechazado", "solicitando_retiro"],
      default: "pendiente",
    },
  },
  relations: {
    bicicleta: {
      type: "many-to-one",
      target: "Bicicleta",
      joinColumn: true,
      nullable: false,
    },
    usuario: {
      type: "many-to-one",
      target: "User",
      joinColumn: true,
      nullable: false,
    },
    bicicletero: {
      type: "many-to-one",
      target: "Bicicletero",
      joinColumn: true,
      nullable: false,
    },
  },
});