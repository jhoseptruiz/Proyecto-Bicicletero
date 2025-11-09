import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL,
});

export const login = async (email, password) => {
  try {
    const response = await apiClient.post('/auth/login', { email, password });
    
    return response.data;

  } catch (error) {
    throw new Error(error.response?.data?.message || 'Error en el login');
  }
};

export const register = async (nombre, apellido, email, password) => {
  try {
    const response = await apiClient.post('/auth/register', {nombre, apellido, email, password });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Error en el registro');
  }
};