import apiClient from './api.js';

/**
 * Obtiene los bicicleteros asignados al guardia logueado.
 * El token se añade automáticamente por el interceptor de api.js
 */
export const getMisBicicleteros = async () => {
  try {
    const response = await apiClient.get('/guardia/mis-bicicleteros');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Error al obtener mis bicicleteros');
  }
};

// NOTA: A futuro, aquí pondrías las funciones para aprobar, rechazar, etc.
// export const aprobarIngreso = async (idSolicitud, casillero) => { ... }
// export const finalizarEgreso = async (idEstancia) => { ... }