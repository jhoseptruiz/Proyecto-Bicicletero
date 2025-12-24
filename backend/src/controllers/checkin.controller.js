import {
    crearSolicitudIngreso,
    crearSolicitudSalida,
    obtenerEstadoSolicitud,
    obtenerEstadoBicicleteros,
    verificarBicicletaEnBicicletero,
} from "../services/checkin.service.js";
import { handleSuccess, handleErrorClient, handleErrorServer } from "../Handlers/responseHandlers.js";

/**
 * Maneja el escaneo del QR. Deriva a ingreso o salida según si ya tiene bici dentro.
 */
export async function scanBicicletero(req, res) {
    try {
        const { codigoQr, lat, lng, bicicletaId } = req.body;
        const rutAlumno = req.user.rut; // Viene del token

        // Validaciones básicas de entrada
        if (!codigoQr || !lat || !lng || !bicicletaId) {
            return handleErrorClient(res, 400, "Faltan datos obligatorios (QR, GPS, Bici)");
        }

        // Determinar flujo: Ingreso o Salida?
        const yaEstaAdentro = await verificarBicicletaEnBicicletero(rutAlumno, bicicletaId);

        let resultado;
        if (yaEstaAdentro) {
            // Flujo SALIDA
            resultado = await crearSolicitudSalida(rutAlumno, codigoQr, lat, lng, bicicletaId);
            handleSuccess(res, 201, "Solicitud de retiro creada. El guardia ha sido notificado.", resultado);
        } else {
            // Flujo INGRESO
            resultado = await crearSolicitudIngreso(rutAlumno, codigoQr, lat, lng, bicicletaId);
            handleSuccess(res, 201, "Solicitud de ingreso creada. Espere confirmación del guardia.", resultado);
        }

    } catch (error) {
        // Errores de negocio (Validaciones del servicio lanzan Error)
        // Asumimos que errores del servicio son Client Errors (400/409) si son validaciones
        // Para simplificar, si el mensaje es conocido, lo mandamos como 400
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
