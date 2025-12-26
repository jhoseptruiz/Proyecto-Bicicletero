import apiClient from './api.js';

export const getPersonal = async() =>{
    try{
        const response = await apiClient.get('/users/personal');
        return response.data;
    } catch(error){
        throw new Error(error.response?.data?.message || 'Error al obtener Personal');
    }
};


export const createPersonal = async(data) =>{
    try{
        const response = await apiClient.post('/users/personal', data);
        return response.data;
    } catch(error){
        throw new Error(error.response?.data?.message || 'Error al crear Personal');
    }   
};

export const updatePersonal = async(rut, data) =>{
    try{
        const response = await apiClient.put(`/users/personal/${rut}`, data);
        return response.data;
    } catch(error){
        throw new Error(error.response?.data?.message || 'Error al actualizar Personal');
    }
};

export const deletePersonal = async(rut) =>{
    try{
        const response = await apiClient.delete(`/users/personal/${rut}`);    
        return response.data;
    } catch(error){
        throw new Error(error.response?.data?.message || 'Error al eliminar Personal');
    }
};
