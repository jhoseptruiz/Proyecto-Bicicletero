import { EncontrarGuardias, createUser, updateUser, deleteUser} from "../services/user.service.js";
import { handleSuccess, handleErrorServer } from "../Handlers/responseHandlers.js";

export async function getGuardias(req, res) {
    try{
        const guardia = await EncontrarGuardias();
        handleSuccess(res, 200, "Guardias Obtenudos", guardia);
    } catch (error){
        handleErrorServer(res, 500, "Error al obtener guardias", error.message);
    }
}

//Crear guardia
export async function createGuardia(req, res) {
    try{
        const data = {...req.body, role: 'guardia' };
        const newGuardia = await createUser(data);
        handleSuccess(res, 201, "Guardia creado", newGuardia);
    } catch (error){
        handleErrorServer(res, 500, "Error al crear guardias", error.message);
    }
}

// Actualizar guardia
export async function updateGuardia(req, res) {
    try {
        const { rut } = req.params;

        const update = await updateUser(rut, req.body);
        if (!update) {
            return handleErrorServer(res, 404, "Guardia no encontrado");
        }
        //limpiar password en la respuesta
        delete update.password;
        handleSuccess(res, 200, "Guardia actualizado", update);
    } catch (error) {
        handleErrorServer(res, 500, "Error al actualizar guardia", error.message);
    }
}   

// Eliminar guardia
export async function deleteGuardia(req, res) {
    try {
        const { rut } = req.params;
        const deleted = await deleteUser(rut);
        if (deleted.affected === 0) {
            return res.status(404).json({ message: "Guardia no encontrado" });
        }
        handleSuccess(res, 200, "Guardia eliminado");
    } catch (error) {
        handleErrorServer(res, 500, "Error al eliminar guardia", error.message);
    }
}