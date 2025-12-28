import { 
  findBicicleterosByGuardia, 
  obtenerSolicitudesPendientes, 
  aprobarIngreso, 
  rechazarIngreso,
  obtenerRegistrosActivos,
  finalizarEstadia,
  modificarCasillero,
  obtenerResumenGlobal
} from "../services/guardia.service.js";
import { handleSuccess, handleErrorServer, handleErrorClient } from "../Handlers/responseHandlers.js";

/**
 * Obtiene los bicicleteros asignados al guardia actualmente logueado.
 */
export async function getMisBicicleteros(req, res) {
  try {
    const rutGuardia = req.user.sub; // Viene del token
    const bicicleteros = await findBicicleterosByGuardia(rutGuardia);
    handleSuccess(res, 200, "Bicicleteros asignados al guardia", bicicleteros);
  } catch (error) {
    handleErrorServer(res, 500, "Error al obtener bicicleteros", error.message);
  }
}

/**
 * Obtiene las solicitudes pendientes de ingreso para un bicicletero.
 */
export async function getSolicitudes(req, res) {
  try {
    const { bicicleteroId } = req.params;
    const solicitudes = await obtenerSolicitudesPendientes(bicicleteroId);
    handleSuccess(res, 200, "Solicitudes pendientes obtenidas", solicitudes);
  } catch (error) {
    handleErrorServer(res, 500, "Error al obtener solicitudes", error.message);
  }
}

/**
 * Aprueba el ingreso asignando un casillero físico.
 */
export async function postAprobarIngreso(req, res) {
  try {
    const { id } = req.params; // ID del registro (solicitud)
    const { casillero } = req.body; // El numero que escribe el guardia
    const rutGuardia = req.user.sub;

    if (!casillero) return handleErrorClient(res, 400, "El número de casillero es obligatorio");

    const registro = await aprobarIngreso(id, casillero, rutGuardia);
    handleSuccess(res, 200, "Ingreso aprobado exitosamente", registro);
  } catch (error) {
    console.error("Detalle del error:", error); // Esto ayuda a verlo en la terminal
    handleErrorServer(res, 400, error.message, error.message);
  }
}

/**
 * Rechaza una solicitud de ingreso.
 */
export async function postRechazarIngreso(req, res) {
  try {
    const { id } = req.params;
    const { motivo } = req.body;
    const registro = await rechazarIngreso(id, motivo);
    handleSuccess(res, 200, "Solicitud rechazada", registro);
  } catch (error) {
    handleErrorServer(res, 500, "Error al rechazar solicitud", error.message);
  }
}

/**
 * Obtiene las bicicletas actualmente guardadas (activas).
 */
export async function getActivos(req, res) {
    try {
        const { bicicleteroId } = req.params;
        const activos = await obtenerRegistrosActivos(bicicleteroId);
        handleSuccess(res, 200, "Bicicletas activas obtenidas", activos);
    } catch (error) {
        handleErrorServer(res, 500, "Error al obtener activos", error.message);
    }
}

/**
 * Finaliza la estadía (El alumno retira la bicicleta).
 */
export async function postFinalizarSalida(req, res) {
    try {
        const { id } = req.params; // ID del registro
        const resultado = await finalizarEstadia(id);
        handleSuccess(res, 200, "Salida registrada exitosamente", resultado);
    } catch (error) {
        handleErrorServer(res, 500, "Error al finalizar salida", error.message);
    }
}

/**
 * Modifica la ubicación de una bicicleta ya guardada.
 */
export async function putModificarUbicacion(req, res) {
    try {
        const { id } = req.params; // ID del registro
        const { nuevoCasillero } = req.body;
        const resultado = await modificarCasillero(id, nuevoCasillero);
        handleSuccess(res, 200, "Ubicación modificada exitosamente", resultado);
    } catch (error) {
        handleErrorServer(res, 400, "Error al modificar ubicación", error.message);
    }
}

/**
 * Endpoint para polling global (contadores de todos los bicicleteros)
 */
export async function getResumenSolicitudes(req, res) {
  try {
    const rutGuardia = req.user.sub;
    const resumen = await obtenerResumenGlobal(rutGuardia);
    handleSuccess(res, 200, "Resumen global obtenido", resumen);
  } catch (error) {
    handleErrorServer(res, 500, "Error al obtener resumen", error.message);
  }
}