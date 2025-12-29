import {
    crearSolicitudIngreso,
    crearSolicitudSalida,
    obtenerEstadoSolicitud,
    obtenerEstadoBicicleteros,
    verificarBicicletaEnBicicletero,

    validarQrBicicletero,
    obtenerDetalleBicicletero,
    cancelarSolicitud
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
 * Maneja el escaneo del QR. Deriva a ingreso o salida según si ya tiene bici dentro.
 */
export async function scanBicicletero(req, res) {
    try {
        const { codigoQr, lat, lng, bicicletaId } = req.body;
        const rutAlumno = req.user.rut;

        // Validamos
        if (!codigoQr || !lat || !lng || !bicicletaId) {
            return handleErrorClient(res, 400, "Faltan datos obligatorios");
        }

        // Tratamos el codigoQr como un ID de bicicletero
        const bicicleteroId = codigoQr;

        const yaEstaAdentro = await verificarBicicletaEnBicicletero(rutAlumno, bicicletaId);

        let resultado;
        if (yaEstaAdentro) {
            // Pasamos el bicicleteroId en lugar del string QR
            resultado = await crearSolicitudSalida(rutAlumno, bicicleteroId, lat, lng, bicicletaId);
            handleSuccess(res, 201, "Solicitud de retiro creada...", resultado);
        } else {
            // Pasamos el bicicleteroId en lugar del string QR
            resultado = await crearSolicitudIngreso(rutAlumno, bicicleteroId, lat, lng, bicicletaId);
            handleSuccess(res, 201, "Solicitud de ingreso creada...", resultado);
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
        const rutAlumno = req.user.rut;
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
 * Endpoint para el Mapa: Devuelve capacidad y ubicaciones.
 */
export async function getMapData(req, res) {
    try {
        const data = await obtenerEstadoBicicleteros();
        handleSuccess(res, 200, "Datos del mapa recuperados", data);
    } catch (error) {
        handleErrorServer(res, 500, "Error al cargar mapa", error.message);
    }
}


/**
 * Obtiene detalle de un bicicletero específico para validación (scan).
 */
export async function getBicicleteroDetail(req, res) {
    try {
        const { id } = req.params;
        const data = await obtenerDetalleBicicletero(id);
        handleSuccess(res, 200, "Detalle obtenido", data);
    } catch (error) {
        handleErrorClient(res, 404, error.message);
    }
}

/**
 * Cancela solicitud (ingreso/retiro).
 */
export async function cancelRequest(req, res) {
    try {
        const rutAlumno = req.user.rut;
        const resultado = await cancelarSolicitud(rutAlumno);
        handleSuccess(res, 200, resultado.message, resultado);
    } catch (error) {
        handleErrorClient(res, 400, error.message);
    }
}
