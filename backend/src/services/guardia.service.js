import { AppDataSource } from "../config/configDb.js";
import { Bicicletero } from "../entities/bicicletero.entity.js";

const bicicleteroRepo = AppDataSource.getRepository(Bicicletero);

/**
 * Busca los bicicleteros asignados a un guardia específico por su RUT.
 * @param {string} guardiaRut El RUT del guardia (viene del token JWT)
 * @returns {Promise<Bicicletero[]>}
 */
export async function findBicicleterosByGuardia(guardiaRut) {
  return await bicicleteroRepo.find({
    where: {
      guardiaAsignado: {
        rut: guardiaRut,
      },
    },
    // Opcional: Cargar la relación para ver el nombre del guardia (aunque ya lo sabemos)
    relations: ["guardiaAsignado"], 
  });
}