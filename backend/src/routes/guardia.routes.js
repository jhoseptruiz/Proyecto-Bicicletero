import { Router } from "express";
import { getMisBicicleteros } from "../controllers/guardia.controller.js";
import { verificarToken, checkRol } from "../middlewares/auth.middleware.js";

const router = Router();

// --- Protección de Ruta ---
// Solo usuarios con token válido y rol 'guardia' pueden pasar
router.use(verificarToken, checkRol(['guardia']));

// --- Definición de Endpoints ---

// GET /api/guardia/mis-bicicleteros
router.get("/mis-bicicleteros", getMisBicicleteros);

// Aquí irían los futuros endpoints de 'aprobar', 'rechazar', etc.
// router.post("/ingreso/:id/aprobar", ...)
// router.post("/egreso/:id/finalizar", ...)


export default router;