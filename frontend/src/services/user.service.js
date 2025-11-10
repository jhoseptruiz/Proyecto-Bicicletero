import apiClient from './api.js';

export const getGuardias = async() =>{
    try{
        const response = await apiClient.get('/users/guards');
        return response.data;
    } catch(error){
        throw new Error(error.response?.data?.message || 'Error al obtener guardias');
    }
};