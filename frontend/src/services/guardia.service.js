import api from './api'; // Asumo que tienes una instancia de axios llamada 'api' configurada

// 1. Obtener mis bicicleteros asignados
export const getMisBicicleteros = async () => {
  try {
    const response = await api.get('/guardia/mis-bicicleteros');
    return response.data.data; // Ajusta según tu estructura de respuesta { status, message, data }
  } catch (error) {
    console.error("Error al obtener bicicleteros", error);
    throw error;
  }
};

// 2. Obtener solicitudes de ingreso pendientes
export const getSolicitudes = async (bicicleteroId) => {
  const response = await api.get(`/guardia/bicicletero/${bicicleteroId}/solicitudes`);
  return response.data.data;
};

// 3. Aprobar ingreso (Asignar casillero)
export const aprobarIngreso = async (registroId, casillero) => {
  const response = await api.post(`/guardia/ingreso/${registroId}/aprobar`, { casillero });
  return response.data.data;
};

// 4. Rechazar ingreso
export const rechazarIngreso = async (registroId) => {
  const response = await api.post(`/guardia/ingreso/${registroId}/rechazar`);
  return response.data.data;
};

// 5. Obtener bicicletas activas (en custodia)
export const getActivos = async (bicicleteroId) => {
  const response = await api.get(`/guardia/bicicletero/${bicicleteroId}/activos`);
  return response.data.data;
};

// 6. Finalizar estadía (Devolver bicicleta)
export const finalizarEstadia = async (registroId) => {
  const response = await api.post(`/guardia/egreso/${registroId}/finalizar`);
  return response.data.data;
};

// 7. Modificar ubicación (Si el guardia se equivocó)
export const modificarUbicacion = async (registroId, nuevoCasillero) => {
  const response = await api.put(`/guardia/registro/${registroId}/ubicacion`, { nuevoCasillero });
  return response.data.data;
};