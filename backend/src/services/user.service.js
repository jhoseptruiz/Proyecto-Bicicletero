// Proyecto-Bicicletero/backend/src/services/user.service.js

import { AppDataSource } from "../config/configDb.js";
import { User } from "../entities/user.entity.js";
import bcrypt from "bcrypt";

const userRepository = AppDataSource.getRepository(User);

// --- Servicio para crear un nuevo usuario ---
export async function createUser(data) {
  const hashedPassword = await bcrypt.hash(data.password, 10);

  // Objeto de datos a insertar
  const userData = {
    rut: data.rut, 
    nombre: data.nombre,
    apellido: data.apellido,
    email: data.email,
    password: hashedPassword,
  };

  // CAMBIO: Usamos .insert() en lugar de .save()
  // .insert() solo hace INSERT. Si la PK (rut) ya existe,
  // fallará y lanzará el error '23505' que el controlador espera.
  await userRepository.insert(userData);

  // Devolvemos los datos (sin la password)
  delete userData.password;
  return userData;
}

// --- Servicio para buscar por Email (para Login) ---
export async function findUserByEmail(email) {
  return await userRepository.findOneBy({ email });
}

// --- Servicio para encontrar por RUT ---
export async function findUserByRut(rut) {
  return await userRepository.findOneBy({ rut });
}