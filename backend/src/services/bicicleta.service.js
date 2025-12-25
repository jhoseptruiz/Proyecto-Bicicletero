import { AppDataSource } from "../config/configDb.js";
import { Bicicleta } from "../entities/bicicleta.entity.js";
import { User } from "../entities/user.entity.js";
import fs from 'fs/promises';
import path from 'path';

const bicicletaRepo = AppDataSource.getRepository(Bicicleta);
const userRepo = AppDataSource.getRepository(User);

export async function crearBicicleta(data, usuarioRut) {
  const { marca, fotoUrl } = data;

  const propietario = await userRepo.findOneBy({ rut: usuarioRut });
  if (!propietario) {
    throw new Error("Usuario no encontrado");
  }

  const nuevaBicicleta = bicicletaRepo.create({
    marca,
    fotoUrl,
    propietario,
  });

  return await bicicletaRepo.save(nuevaBicicleta);
}

export async function findMisBicicletas(usuarioRut) {
  return await bicicletaRepo.find({
    where: {
      propietario: {
        rut: usuarioRut,
      },
    },
  });
}

export async function actualizarBicicleta(id, usuarioRut, updateData) {
  const bicicleta = await bicicletaRepo.findOne({ where: { id }, relations: ['propietario'] });
  
  if (!bicicleta) {
    throw new Error("Bicicleta no encontrada.");
  }
  
  if (bicicleta.propietario.rut !== usuarioRut) {
    throw new Error("No estás autorizado para modificar esta bicicleta.");
  }

  // Futuro: Cuando la entidad 'RegistroUso' exista, se debe añadir aquí la verificación.

  if (updateData.fotoUrl && bicicleta.fotoUrl) {
    const oldPhotoPath = path.resolve(bicicleta.fotoUrl);
    try {
      await fs.unlink(oldPhotoPath);
    } catch (err) {
      console.error("Error al eliminar la foto antigua:", err.message);
    }
  }

  bicicletaRepo.merge(bicicleta, updateData);
  return await bicicletaRepo.save(bicicleta);
}

export async function eliminarBicicleta(id, usuarioRut) {
  const bicicleta = await bicicletaRepo.findOne({ where: { id }, relations: ['propietario'] });
  
  if (!bicicleta) {
    throw new Error("Bicicleta no encontrada.");
  }

  if (bicicleta.propietario.rut !== usuarioRut) {
    throw new Error("No estás autorizado para eliminar esta bicicleta.");
  }

  // Futuro: Cuando la entidad 'RegistroUso' exista, se debe añadir aquí la verificación.

  if (bicicleta.fotoUrl) {
    const photoPath = path.resolve(bicicleta.fotoUrl);
    try {
      await fs.unlink(photoPath);
    } catch (err) {
      console.error("Error al eliminar el archivo de la foto:", err.message);
    }
  }
  
  return await bicicletaRepo.remove(bicicleta);
}