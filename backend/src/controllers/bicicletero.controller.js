import { ActualizarBicicletero, AllBicicleteros, CrearBicicletero, EliminarBicicletero } from "../services/bicicletero.service.js";
import {handleSuccess, handleErrorClient, handleErrorServer} from "../Handlers/responseHandlers.js";

export async function getBicicleteros(req, res) {
    try{
        const bicicleteros = await AllBicicleteros();
        handleSuccess(res, 200, "Bicicleteros actuales", bicicleteros);
    } catch(error){
        handleErrorServer(res, 500, "Error al obtener bicicleteros", error.message);
    }
}

export async function postBicicleteros(req,res) {
    try{
        const bicicletero = await CrearBicicletero(req.body);
        handleSuccess(res, 201, "Bicicletero creado exitosamente", bicicletero); 
    } catch(error){
        handleErrorClient(res, 400, error.message);
    }
}

export async function putBicicleteros(req, res){
    try{
        const {id} = req.params;
        const data = req.body;
        const bicicletero = await ActualizarBicicletero(id, data);
        handleSuccess(res, 200, "Bicicletero actualizado exitosamente", bicicletero);
    } catch(error){
        if(error.message.includes("No encontrado")){
            return handleErrorClient(res, 404, error.message);
        }
        handleErrorServer(res, 500, "Error al actualizar el bicicletero", error.message);
    }
} 

export async function deleteBicicleteros(req, res){
    try{
        const {id} = req.params;
        await EliminarBicicletero(id);
        handleSuccess(res, 200, "Bicicletero eliminado exitosamente");
    } catch(error){
        if(error.message.includes("No encontrado")){
            return handleErrorClient(res, 404, error.message);
        }
        handleErrorServer(res, 500, "Error al eliminar el bicicletero", error.message);
    }
}