import api from './api';

export const getMisBicicleteros = async () => {
  try {
    const response = await api.get('/guardia/mis-bicicleteros');
    return response.data.data;
  } catch (error) {
    console.error("Error al obtener bicicleteros", error);
    throw error;
  }
};

export const getSolicitudes = async (bicicleteroId) => {
  const response = await api.get(`/guardia/bicicletero/${bicicleteroId}/solicitudes`);
  return response.data.data;
};

export const aprobarIngreso = async (registroId, casillero) => {
  const response = await api.post(`/guardia/ingreso/${registroId}/aprobar`, { casillero });
  return response.data.data;
};

export const rechazarIngreso = async (registroId) => {
  const response = await api.post(`/guardia/ingreso/${registroId}/rechazar`);
  return response.data.data;
};

export const getActivos = async (bicicleteroId) => {
  const response = await api.get(`/guardia/bicicletero/${bicicleteroId}/activos`);
  return response.data.data;
};

export const finalizarEstadia = async (registroId) => {
  const response = await api.post(`/guardia/egreso/${registroId}/finalizar`);
  return response.data.data;
};

export const modificarUbicacion = async (registroId, nuevoCasillero) => {
  const response = await api.put(`/guardia/registro/${registroId}/ubicacion`, { nuevoCasillero });
  return response.data.data;
};

export const getResumenGlobal = async () => {
  const response = await api.get('/guardia/resumen');
  return response.data.data;
};