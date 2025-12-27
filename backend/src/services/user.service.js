// Proyecto-Bicicletero/backend/src/services/user.service.js

import { AppDataSource } from "../config/configDb.js";
import { User } from "../entities/user.entity.js";
import bcrypt from "bcrypt";

const userRepository = AppDataSource.getRepository(User);

// Servicio para crear un nuevo usuario
export async function createUser(data) {
  const hashedPassword = await bcrypt.hash(data.password, 10);

  // Objeto de datos a insertar
  const userData = {
    rut: data.rut, 
    nombre: data.nombre,
    apellido: data.apellido,
    email: data.email,
    password: hashedPassword,
    role: data.role || 'alumno'
  };

  // CAMBIO: Usamos .insert() en lugar de .save()
  // .insert() solo hace INSERT. Si la PK (rut) ya existe,
  // fallará y lanzará el error '23505' que el controlador espera.
  await userRepository.insert(userData);

  // Devolvemos los datos (sin la password)
  delete userData.password;
  return userData;
}

// Servicio para buscar por Email (para Login)
export async function findUserByEmail(email) {
  return await userRepository.findOneBy({ email });
}

// Servicio para encontrar personal (guardias y admins)
export async function EncontrarPersonal(){
  return await userRepository.find({
    where: [{role: "guardia"}, {role: "admin"}],
    select: ["rut","nombre","apellido","email", "role"],
  });
}
// Servicio para encontrar por RUT
export async function findUserByRut(rut) {
  return await userRepository.findOneBy({ rut });
}

// Servicio para actualizar usuario
export async function updateUser(rut, data) {
  const user = await userRepository.findOneBy({ rut });
  if (!user) return null;
  //cambio de contraseña
  if(data.password && data.password.trim() !== ''){
    data.password = await bcrypt.hash(data.password, 10);
  } else {
    // No actualizar la contraseña si no se proporciona
    delete data.password;
  }
  //actualizar campos
  await userRepository.update({ rut: rut }, data);
  return await userRepository.findOneBy({ rut });
} 

// Servicio para eliminar usuario
export async function deleteUser(rut) {
  return await userRepository.delete({ rut });
}