import apiClient from './api.js';

export const getGuardias = async() =>{
    try{
        const response = await apiClient.get('/users/guards');
        return response.data;
    } catch(error){
        throw new Error(error.response?.data?.message || 'Error al obtener guardias');
    }
};


export const createGuardia = async(data) =>{
    try{
        const response = await apiClient.post('/users/guards', data);
        return response.data;
    } catch(error){
        throw new Error(error.response?.data?.message || 'Error al crear guardia');
    }   
};

export const updateGuardia = async(rut, data) =>{
    try{
        const response = await apiClient.put(`/users/guards/${rut}`, data);
        return response.data;
    } catch(error){
        throw new Error(error.response?.data?.message || 'Error al actualizar guardia');
    }
};

export const deleteGuardia = async(rut) =>{
    try{
        const response = await apiClient.delete(`/users/guards/${rut}`);    
        return response.data;
    } catch(error){
        throw new Error(error.response?.data?.message || 'Error al eliminar guardia');
    }
};
