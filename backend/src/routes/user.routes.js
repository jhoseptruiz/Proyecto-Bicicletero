import { Router } from "express";
import { getGuardias, createGuardia, updateGuardia, deleteGuardia } from "../controllers/user.controller.js";
import { verificarToken, checkRol } from "../middlewares/auth.middleware.js";

const router = Router();

//solo administrados puede ver lista de guardias
router.get("/guards", verificarToken, checkRol(['admin']), getGuardias);
router.post("/guards", verificarToken, checkRol(['admin']), createGuardia);
router.put("/guards/:rut", verificarToken, checkRol(['admin']), updateGuardia);
router.delete("/guards/:rut", verificarToken, checkRol(['admin']), deleteGuardia);

export default router;