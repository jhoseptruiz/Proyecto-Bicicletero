import apiClient from './api.js';

export async function login(email, password) {
  try {
    const response = await apiClient.post('/auth/login', { email, password });
    if (response.data.data) {
      localStorage.setItem('token', response.data.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.data.user));
    }
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Error al iniciar sesión");
  }
}

export async function register(nombre, apellido, rut, email, password) {
  try {
    const response = await apiClient.post('/auth/register', { nombre, apellido, rut, email, password });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Error en el registro');
  }
};