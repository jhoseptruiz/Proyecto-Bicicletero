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
export async function ActualizarBicicletero(id,data){
    //buscar el bicicletero
    const bicicletero = await bicicleteroRepo.findOneBy({id: parseInt(id)});
    if(!bicicletero){
        throw new Error("Bicicletero no encontrado");
    } 

    //validar guardia (si cambia)
    let guardia = null;
    const {guardiaId, ...updateData} = data;

    if(guardiaId){
        guardia = await userRepo.findOneBy({rut: guardiaId, role:"guardia"});
        if(!guardia){
            throw new Error("El guardia seleccionado no es valido");
        }
        updateData.guardiaAsignado = guardia;
    }else if (guardiaId === null || guardiaId ==="") {
        updateData.guardiaAsignado= null;
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

