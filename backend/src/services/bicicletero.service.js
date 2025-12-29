import { AppDataSource } from "../config/configDb.js";
import { Bicicletero } from "../entities/bicicletero.entity.js";
import {User} from "../entities/user.entity.js";

const bicicleteroRepo = AppDataSource.getRepository(Bicicletero);
const userRepo = AppDataSource.getRepository(User);

export async function AllBicicleteros() {
    return await bicicleteroRepo.find({
        relations:["guardiaAM", "guardiaPM"],});
}

//crear bicicletero
export async function CrearBicicletero(data) {
    const {ubicacion, capacidad, estado, horaApertura, horaCierre, horaCambioTurno, guardiaAMId, guardiaPMId, latitud, longitud}= data;
    
    let gAM = null;
    let gPM = null;

    if(guardiaAMId){
        gAM = await userRepo.findOneBy({rut: guardiaAMId, role:"guardia"});
        if(!gAM){
            throw new Error("El guardia seleccionado no es valido");
        }
    }
    if(guardiaPMId){
        gPM = await userRepo.findOneBy({rut: guardiaPMId, role:"guardia"});
        if(!gPM){
            throw new Error("El guardia seleccionado no es valido");
        }
    }
    
    const newBicicletero = bicicleteroRepo.create({
        ubicacion,
        capacidad,
        estado,
        horaApertura: horaApertura,
        horaCierre: horaCierre,
        horaCambioTurno: horaCambioTurno || "14:00:00",
        latitud,
        longitud,
        guardiaAM: gAM,
        guardiaPM: gPM
    });

    return await bicicleteroRepo.save(newBicicletero); 
}

//updateBicicletero
export async function ActualizarBicicletero(id,data){
    //buscar el bicicletero
    const bicicletero = await bicicleteroRepo.findOneBy({id: parseInt(id)});
    if(!bicicletero){
        throw new Error("Bicicletero no encontrado");
    } 

    //validar guardia (si cambia)
    let guardia = null;
    const {guardiaAMId, guardiaPMId, horaCambioTurno, ...updateData} = data;

    //logica guardia mañana
    if (guardiaAMId) {
        const g = await userRepo.findOneBy({ rut: guardiaAMId, role: "guardia" });
        if (!g) throw new Error("Guardia Mañana inválido");
        bicicletero.guardiaAM = g;
    } else if (guardiaAMId === "") {
        bicicletero.guardiaAM = null;
    }

    //logica guardia tarde
    if (guardiaPMId) {
        const g = await userRepo.findOneBy({ rut: guardiaPMId, role: "guardia" });
        if (!g) throw new Error("Guardia Tarde inválido");
        bicicletero.guardiaPM = g;
    } else if (guardiaPMId === "") {
        bicicletero.guardiaPM = null;
    }

    //Actualizar hora de cambio
    if(horaCambioTurno){
        bicicletero.horaCambioTurno = horaCambioTurno;
    }

    //juntar datos
    bicicleteroRepo.merge(bicicletero, updateData);
    //guardar cambios
    return await bicicleteroRepo.save(bicicletero);

}

//deleteBicicletero  
export async function EliminarBicicletero(id){
    const bicicletero = await bicicleteroRepo.findOneBy({id: parseInt(id)});
    if(!bicicletero){
        throw new Error("Bicicletero no encontrado");
    }
    return await bicicleteroRepo.remove(bicicletero);
}

