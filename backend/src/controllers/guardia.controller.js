import {
  findBicicleterosByGuardia,
  obtenerSolicitudesPendientes,
  aprobarIngreso,
  rechazarIngreso,
  obtenerActivos,
  finalizarEstadia,
  modificarUbicacion,
  obtenerResumenGlobal
} from "../services/guardia.service.js";
import { handleSuccess, handleErrorServer, handleErrorClient } from "../Handlers/responseHandlers.js";

export async function getMisBicicleteros(req, res) {
  try {
    const rutGuardia = req.user.sub;
    const bicicleteros = await findBicicleterosByGuardia(rutGuardia);
    handleSuccess(res, 200, "Bicicleteros obtenidos", bicicleteros);
  } catch (error) {
    handleErrorServer(res, 500, "Error al obtener bicicleteros", error.message);
  }
}

export async function getSolicitudes(req, res) {
  try {
    const id = req.params.id || req.params.bicicleteroId;

    const solicitudes = await obtenerSolicitudesPendientes(id);
    handleSuccess(res, 200, "Solicitudes obtenidas", solicitudes);
  } catch (error) {
    if (error.message.includes("no encontrado")) {
      return handleErrorClient(res, 404, error.message);
    }
    handleErrorServer(res, 500, "Error al obtener solicitudes", error.message);
  }
}

export async function postAprobarIngreso(req, res) {
  try {
    const { id } = req.params;
    const { casillero } = req.body;
    const rutGuardia = req.user.sub;

    if (!casillero) return handleErrorClient(res, 400, "Falta casillero");

    const registro = await aprobarIngreso(id, casillero, rutGuardia);
    handleSuccess(res, 200, "Ingreso aprobado", registro);
  } catch (error) {
    handleErrorClient(res, 400, error.message);
  }
}

export async function postRechazarIngreso(req, res) {
  try {
    const { id } = req.params;
    const { motivo } = req.body;
    const registro = await rechazarIngreso(id, motivo);
    handleSuccess(res, 200, "Rechazado", registro);
  } catch (error) {
    handleErrorServer(res, 500, "Error al rechazar", error.message);
  }
}

export async function getActivos(req, res) {
  try {
    const id = req.params.id || req.params.bicicleteroId;
    const activos = await obtenerActivos(id);
    handleSuccess(res, 200, "Activos obtenidos", activos);
  } catch (error) {
    handleErrorServer(res, 500, "Error al obtener activos", error.message);
  }
}

export async function postFinalizarSalida(req, res) {
  try {
    const { id } = req.params;
    const resultado = await finalizarEstadia(id);
    handleSuccess(res, 200, "Salida registrada", resultado);
  } catch (error) {
    handleErrorServer(res, 500, "Error al finalizar", error.message);
  }
}

export async function putModificarUbicacion(req, res) {
  try {
    const { id } = req.params;
    const { nuevoCasillero } = req.body;

    const resultado = await modificarUbicacion(id, nuevoCasillero);
    handleSuccess(res, 200, "Ubicación modificada", resultado);
  } catch (error) {
    handleErrorServer(res, 400, "Error al modificar", error.message);
  }
}

export async function getResumenSolicitudes(req, res) {
  try {
    const rutGuardia = req.user.sub;
    const resumen = await obtenerResumenGlobal(rutGuardia);
    handleSuccess(res, 200, "Resumen obtenido", resumen);
  } catch (error) {
    handleErrorServer(res, 500, "Error resumen", error.message);
  }
}