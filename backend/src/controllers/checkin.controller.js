import {
    crearSolicitudIngreso,
    crearSolicitudSalida,
    obtenerEstadoSolicitud,
    obtenerEstadoBicicleteros,
    validarQrBicicletero
} from "../services/checkin.service.js";
import { handleSuccess, handleErrorClient, handleErrorServer } from "../Handlers/responseHandlers.js";

/**
 * Valida un QR y devuelve su información (contexto)
 */
export async function validateQr(req, res) {
    try {
        const { codigoQr } = req.body;
        if (!codigoQr) throw new Error("Falta codigoQr");

        const data = await validarQrBicicletero(codigoQr);
        handleSuccess(res, 200, "Bicicletero encontrado", data);
    } catch (error) {
        handleErrorClient(res, 404, error.message);
    }
}

/**
 * Maneja el escaneo del QR. Deriva a ingreso o salida.
 */
export async function scanBicicletero(req, res) {
    try {
        const { codigoQr, lat, lng, bicicletaId, accion } = req.body; 
        
        // CORRECCIÓN 1: Asegurar lectura del RUT (puede venir en .rut o .sub)
        const rutAlumno = req.user.rut || req.user.sub;

        // CORRECCIÓN 2: Validación estricta
        if (!rutAlumno) {
            return handleErrorClient(res, 401, "Error de identidad: No se pudo obtener el RUT del token.");
        }

        if (!codigoQr || !lat || !lng || !bicicletaId || !accion) {
            return handleErrorClient(res, 400, "Faltan datos obligatorios (incluyendo acción)");
        }

        const bicicleteroId = codigoQr;
        let resultado;

        if (accion === 'salida') {
            resultado = await crearSolicitudSalida(rutAlumno, bicicleteroId, lat, lng, bicicletaId);
            handleSuccess(res, 201, "Solicitud de retiro creada exitosamente", resultado);
        
        } else if (accion === 'ingreso') {
            resultado = await crearSolicitudIngreso(rutAlumno, bicicleteroId, lat, lng, bicicletaId);
            handleSuccess(res, 201, "Solicitud de ingreso creada exitosamente", resultado);
        
        } else {
            return handleErrorClient(res, 400, "Acción no válida (use 'ingreso' o 'salida')");
        }

    } catch (error) {
        handleErrorClient(res, 400, error.message);
    }
}

/**
 * Obtiene el estado de la solicitud activa del alumno.
 */
export async function checkStatus(req, res) {
    try {
        const rutAlumno = req.user.rut || req.user.sub; // CORRECCIÓN AQUÍ TAMBIÉN
        const status = await obtenerEstadoSolicitud(rutAlumno);

        if (!status) {
            return handleSuccess(res, 200, "Sin solicitud activa", { estado: "SIN_SOLICITUD" });
        }

        handleSuccess(res, 200, "Estado de solicitud recuperado", status);
    } catch (error) {
        handleErrorServer(res, 500, "Error al verificar estado", error.message);
    }
}

/**
 * Endpoint para el Mapa.
 */
export async function getMapData(req, res) {
    try {
        const data = await obtenerEstadoBicicleteros();
        handleSuccess(res, 200, "Datos del mapa recuperados", data);
    } catch (error) {
        handleErrorServer(res, 500, "Error al cargar mapa", error.message);
    }
}