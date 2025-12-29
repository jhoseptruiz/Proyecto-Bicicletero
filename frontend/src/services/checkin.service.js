import apiClient from './api';

// GET /api/checkin/status
export async function getCheckinStatus() {
    try {
        const response = await apiClient.get('/checkin/status');
        return response.data; // { estado, message, data: { ... } }
    } catch (error) {
        // Axios lanza error si status no es 2xx
        throw error.response?.data || { message: "Error de conexión" };
    }
}

// POST /api/checkin/scan
// Agregamos el parámetro 'accion' (puede ser 'ingreso' o 'salida')
export async function scanQr(codigoQr, lat, lng, bicicletaId, accion) {
    try {
        const payload = { codigoQr, lat, lng, bicicletaId, accion }; // <--- Enviamos accion
        const response = await apiClient.post('/checkin/scan', payload);
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: "Error al escanear" };
    }
}

// GET /api/checkin/map
export async function getMapData() {
    try {
        const response = await apiClient.get('/checkin/map');
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: "Error al cargar mapa" };
    }
}
// POST /api/checkin/validate
export async function validateQr(codigoQr) {
    try {
        const payload = { codigoQr };
        const response = await apiClient.post('/checkin/validate', payload);
        return response.data; // { message, data: { id, ubicacion, lat, lng } }
    } catch (error) {
        throw error.response?.data || { message: "QR Inválido o desconocido" };
    }
}
