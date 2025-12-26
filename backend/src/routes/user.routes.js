import { Router } from "express";
import { getPersonal, createPersonal, updatePersonal, deletePersonal } from "../controllers/user.controller.js";
import { verificarToken, checkRol } from "../middlewares/auth.middleware.js";

const router = Router();

//solo administrados puede ver lista de Personal
router.get("/personal", verificarToken, checkRol(['admin']), getPersonal);
router.post("/personal", verificarToken, checkRol(['admin']), createPersonal);
router.put("/personal/:rut", verificarToken, checkRol(['admin']), updatePersonal);
router.delete("/personal/:rut", verificarToken, checkRol(['admin']), deletePersonal);

export default router;