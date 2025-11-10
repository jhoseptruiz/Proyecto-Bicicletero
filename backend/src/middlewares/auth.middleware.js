import jwt from "jsonwebtoken";
import {JWT_SECRET} from "../config/configEnv.js";
import { handleErrorClient } from "../Handlers/responseHandlers.js";

//verificando si el token es valido
export const verificarToken = (req, res, next) =>{
    try{
        const authHeader = req.headers.authorization;
        if(!authHeader){
            return handleErrorClient(res, 401, "No se proporciono Token");
        }
        const token = authHeader.split(" ")[1];
        if(!token){
            return handleErrorClient(res, 401, "Token mal formateado");
        }
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = payload;
        next();
    }catch(error){
        return handleErrorClient(res, 401, "Token invalido o expirado");
    }
};

//verficar si el rol esta permitido
export const checkRol = (RolPermitido) =>{
    return (req, res, next) =>{
        if(!req.user || !req.user.role){
            return handleErrorClient(res, 403, "Acceso denegado (Sin Rol)");
        }
        if (RolPermitido.includes(req.user.role)){
            next(); //rol permitido, continua.
        }else{
            return handleErrorClient(res, 403, "Acceso denegado (Rol no autorizado)");
        }
    };
};