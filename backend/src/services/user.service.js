// Proyecto-Bicicletero/backend/src/services/user.service.js

import { AppDataSource } from "../config/configDb.js";
import { User } from "../entities/user.entity.js";
import { Bicicletero } from "../entities/bicicletero.entity.js"; 
import bcrypt from "bcrypt";
import { Brackets } from "typeorm";

const userRepository = AppDataSource.getRepository(User);
const bicicleteroRepo = AppDataSource.getRepository(Bicicletero); 

// Servicio para crear un nuevo usuario
export async function createUser(data) {
  const hashedPassword = await bcrypt.hash(data.password, 10);

  const userData = {
    rut: data.rut, 
    nombre: data.nombre,
    apellido: data.apellido,
    email: data.email,
    password: hashedPassword,
    role: data.role || 'alumno'
  };

  await userRepository.insert(userData);
  delete userData.password;
  return userData;
}

export async function findUserByEmail(email) {
  return await userRepository.findOneBy({ email });
}

export async function EncontrarPersonal(){
  return await userRepository.find({
    where: [{role: "guardia"}, {role: "admin"}],
    relations: ["bicicleterosAM", "bicicleterosPM"], 
    select: {
        rut: true,
        nombre: true,
        apellido: true,
        email: true,
        role: true
    }
  });
}

export async function findUserByRut(rut) {
  return await userRepository.findOneBy({ rut });
}

// Servicio para actualizar usuario
export async function updateUser(rut, data) {
  // Validacion si guardia esta asignado a bicicletero
  const bicicleterosAsignados = await bicicleteroRepo.count({
    where:[
      { guardiaAM: { rut: rut } },
      { guardiaPM: { rut: rut } }
    ]
  });

  if (bicicleterosAsignados > 0) {
    throw new Error("No se puede modificar guardia asignado a bicicleteros.");
  }

  const user = await userRepository.findOneBy({ rut });
  if (!user) return null;

  if(data.password && data.password.trim() !== ''){
    data.password = await bcrypt.hash(data.password, 10);
  } else {
    delete data.password;
  }
  
  await userRepository.update({ rut: rut }, data);
  return await userRepository.findOneBy({ rut });
} 

// Servicio para eliminar usuario
export async function deleteUser(rut) {
   // Validacion si guardia esta asignado a bicicletero
  const bicicleterosAsignados = await bicicleteroRepo.count({
    where: { guardiaAsignado: { rut: rut } }
  });

  if (bicicleterosAsignados > 0) {
    throw new Error("No se puede eliminar guardia asignado a bicicleteros.");
  }

  return await userRepository.delete({ rut });
}