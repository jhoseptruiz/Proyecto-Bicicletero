import { AppDataSource } from "../config/configDb.js";
import { Bicicletero } from "../entities/bicicletero.entity.js";
import {User} from "../entities/user.entity.js";

const bicicleteroRepo = AppDataSource.getRepository(Bicicletero);
const userRepo = AppDataSource.getRepository(User);

export async function AllBicicleteros() {
    return await bicicleteroRepo.find({
        relations:["guardiaAsignado"],});
}

//crear bicicletero
export async function CrearBicicletero(data) {
    const {ubicacion, capacidad, estado, horaApertura, horaCierre, guardiaId}= data;
    let guardia = null;
    if(guardiaId){
        guardia = await userRepo.findOneBy({rut: guardiaId, role:"guardia"});
        if(!guardia){
            throw new Error("El guardia seleccionado no es valido");
        }
    }
    
    const newBicicletero = bicicleteroRepo.create({
        ubicacion,
        capacidad,
        estado,
        horaApertura: horaApertura,
        horaCierre: horaCierre,
        guardiaAsignado: guardia,
    });

    return await bicicleteroRepo.save(newBicicletero); 
}

//updateBicicletero
//deleteBicicletero  