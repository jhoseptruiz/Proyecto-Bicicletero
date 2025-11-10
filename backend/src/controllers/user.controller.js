import { EncontrarGuardias } from "../services/user.service.js";
import { handleSuccess, handleErrorServer } from "../Handlers/responseHandlers.js";

export async function getGuardias(req, res) {
    try{
        const guardia = await EncontrarGuardias();
        handleSuccess(res, 200, "Guardias Obtenudos", guardia);
    } catch (error){
        handleErrorServer(res, 500, "Error al obtener guardias", error.message);
    }
}