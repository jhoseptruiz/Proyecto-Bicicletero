import { EncontrarPersonal, createUser, updateUser, deleteUser} from "../services/user.service.js";
import { handleSuccess, handleErrorServer } from "../Handlers/responseHandlers.js";

export async function getPersonal(req, res) {
    try{
        const Personal = await EncontrarPersonal();
        handleSuccess(res, 200, "Usuarios Obtenidos", Personal);
    } catch (error){
        handleErrorServer(res, 500, "Error al obtener Usuarios", error.message);
    }
}

//Crear Personal
export async function createPersonal(req, res) {
    try{
        const roleInput = req.body.role;
        const role = (roleInput === 'admin' || roleInput === 'guardia') ? roleInput : 'guardia';
        const data = {...req.body, role };

        const newPersonal = await createUser(data);
        handleSuccess(res, 201, "Usuario creado", newPersonal);
    } catch (error){
        handleErrorServer(res, 500, "Error al crear Usuario", error.message);
    }
}

// Actualizar Personal
export async function updatePersonal(req, res) {
    try {
        const { rut } = req.params;

        const update = await updateUser(rut, req.body);
        if (!update) {
            return handleErrorServer(res, 404, "Usuario no encontrado");
        }
        //limpiar password en la respuesta
        delete update.password;
        handleSuccess(res, 200, "Usuario actualizado", update);
    } catch (error) {
        handleErrorServer(res, 500, "Error al actualizar Usuario", error.message);
    }
}   

// Eliminar Personal
export async function deletePersonal(req, res) {
    try {
        const { rut } = req.params;
        const deleted = await deleteUser(rut);
        if (deleted.affected === 0) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }
        handleSuccess(res, 200, "Usuario eliminado");
    } catch (error) {
        handleErrorServer(res, 500, "Error al eliminar Usuario", error.message);
    }
}