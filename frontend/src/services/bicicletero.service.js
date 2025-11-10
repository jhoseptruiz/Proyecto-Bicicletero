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