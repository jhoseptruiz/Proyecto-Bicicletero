import apiClient from './api.js';

export const getBicicleteros = async() =>{
    try{
        const response = await apiClient.get('/bicicleteros');
        return response.data; 
    } catch (error){
        throw new Error(error.response?.data?.message || 'Error al obtener bicicleteros');
    }
};

export const CrearBicicletero = async(data) =>{
    try{
        const response = await apiClient.post('/bicicleteros', data);
        return response.data;
    } catch (error){
        throw new Error(error.response?.data?.message || 'Error al crear bicicletero');
    }
};

export const ActualizarBicicletero = async(id, data) =>{
    try{
        const response = await apiClient.put(`/bicicleteros/${id}`, data);
        return response.data;
    } catch (error){
        throw new Error(error.response?.data?.message || 'Error al actualizar bicicletero');
    }
};

export const deleteBicicletero = async(id) =>{
    try{
        const response = await apiClient.delete(`/bicicleteros/${id}`);
        return response.data;
    } catch (error){
        throw new Error(error.response?.data?.message || 'Error al eliminar bicicletero');
    }   
};