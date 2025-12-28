import { Router } from "express";
import { 
    getMisBicicleteros, 
    getSolicitudes, 
    postAprobarIngreso, 
    postRechazarIngreso,
    getActivos,
    postFinalizarSalida,
    putModificarUbicacion,
    getResumenSolicitudes
} from "../controllers/guardia.controller.js";
import { verificarToken, checkRol } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verificarToken, checkRol(['guardia']));

// 1. Ver mis bicicleteros (ya lo tenías)
router.get("/mis-bicicleteros", getMisBicicleteros);

// 2. Gestionar Ingresos (Solicitudes Pendientes)
router.get("/bicicletero/:bicicleteroId/solicitudes", getSolicitudes);
router.post("/ingreso/:id/aprobar", postAprobarIngreso); // Body: { casillero: "A1" }
router.post("/ingreso/:id/rechazar", postRechazarIngreso);

// 3. Gestionar Egresos y Activos
router.get("/bicicletero/:bicicleteroId/activos", getActivos);
router.post("/egreso/:id/finalizar", postFinalizarSalida);

// 4. Modificar (Reubicar)
router.put("/registro/:id/ubicacion", putModificarUbicacion); // Body: { nuevoCasillero: "B2" }

// Agrega esta línea antes de las rutas con :id para evitar conflictos
router.get("/resumen", verificarToken, checkRol(["guardia"]), getResumenSolicitudes);

export default router;