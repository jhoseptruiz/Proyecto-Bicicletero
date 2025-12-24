import { EntitySchema } from "typeorm";

export const UsoBicicletero = new EntitySchema({
    name: "UsoBicicletero",
    tableName: "uso_bicicleteros",
    columns: {
        id: {
            primary: true,
            type: "int",
            generated: "increment",
        },
        fechaIngreso: {
            type: "timestamp",
            createDate: true,
        },
        fechaSalida: {
            type: "timestamp",
            nullable: true,
        },
        estado: {
            type: "enum",
            enum: ["ESPERANDO_CONFIRMACION", "APROBADO", "RECHAZADO", "FINALIZADO", "SOLICITANDO_RETIRO"],
            default: "ESPERANDO_CONFIRMACION",
        },
        casilleroAsignado: {
            type: "varchar",
            length: 50,
            nullable: true,
        },
        horaLimite: {
            type: "timestamp",
            nullable: true,
        },
    },
    relations: {
        usuario: {
            type: "many-to-one",
            target: "User",
            joinColumn: { name: "usuarioRut" },
            inverseSide: "usos",
            nullable: false,
        },
        bicicleta: {
            type: "many-to-one",
            target: "Bicicleta",
            joinColumn: { name: "bicicletaId" },
            inverseSide: "usos",
            nullable: false,
        },
        bicicletero: {
            type: "many-to-one",
            target: "Bicicletero",
            joinColumn: { name: "bicicleteroId" },
            inverseSide: "usos",
            nullable: false,
        },
    },
});
