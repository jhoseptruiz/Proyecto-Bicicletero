import apiClient from './api.js';

export const getMisBicicletas = async () => {
    try {
        const response = await apiClient.get('/bicicletas/mis-bicicletas');
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Error al obtener bicicletas');
    }
};

export const crearBicicleta = async (formData) => {
    try {
        const response = await apiClient.post('/bicicletas', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Error al crear bicicleta');
    }
};


export const updateBicicleta = async (id, formData) => {
    try {
        const response = await apiClient.put(`/bicicletas/${id}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Error al actualizar bicicleta');
    }
};

export const deleteBicicleta = async (id) => {
    try {
        const response = await apiClient.delete(`/bicicletas/${id}`);
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Error al eliminar bicicleta');
    }
};