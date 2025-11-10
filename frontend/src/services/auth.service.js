// Proyecto-Bicicletero/frontend/src/services/auth.service.js

import axios from 'axios';

// --- Configuración de Axios ---
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL,
});

// --- Petición de Login ---
export const login = async (email, password) => {
  try {
    const response = await apiClient.post('/auth/login', { email, password });
    
    return response.data;

  } catch (error) {
    throw new Error(error.response?.data?.message || 'Error en el login');
  }
};

// --- Petición de Registro ---
export const register = async (nombre, apellido, rut, email, password) => {
  try {
    const response = await apiClient.post('/auth/register', {nombre, apellido, rut, email, password });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Error en el registro');
  }
};