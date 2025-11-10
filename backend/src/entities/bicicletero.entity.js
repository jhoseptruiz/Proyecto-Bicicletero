import {EntitySchema} from "typeorm";
import {User} from "./user.entity.js";

export const Bicicletero = new EntitySchema({
  name: "Bicicletero",
  tableName: "bicicleteros",
  columns:{
    id:{
      primary: true,
      type: "int",
      generated:"increment",
    },
    ubicacion:{
      type:"varchar",
      length:255,
      nullable: false,
    },
    capacidad:{
      type:"int",
      nullable: false,
    },
    bicicletasGuardadas:{
      type:"int",
      default:0,
    },
    estado:{
      type: "enum",
      enum:["operativo","mantenimiento","fuera_de_Servicio"],
      default: "operativo",
    },
    horaApertura:{
      type:"time",
      nullable: true,
    },
    horaCierre:{
        type: "time",
        nullable: true,
    },
  },
  relations:{
    guardiaAsignado:{
      type:"many-to-one",
      target: "User",
      joinColumn: true,
      nullable: true, //bicicleteros sin guardia
      inverseSide: "BicicleterosAsignados"
    },
  },
})