import { findBicicleterosByGuardia } from "../services/guardia.service.js";
import { handleSuccess, handleErrorServer } from "../Handlers/responseHandlers.js";

/**
 * Obtiene los bicicleteros asignados al guardia actualmente logueado.
 */
export async function getMisBicicleteros(req, res) {
  try {
    // El RUT del guardia viene del payload del token (req.user.sub)
    // que fue añadido por el middleware 'verificarToken'
    const rutGuardia = req.user.sub;

    const bicicleteros = await findBicicleterosByGuardia(rutGuardia);
    handleSuccess(res, 200, "Bicicleteros asignados al guardia", bicicleteros);
  } catch (error) {
    handleErrorServer(res, 500, "Error al obtener bicicleteros", error.message);
  }
}