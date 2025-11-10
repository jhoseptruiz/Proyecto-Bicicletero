import { Router } from "express";
import { getGuardias } from "../controllers/user.controller.js";
import { verificarToken, checkRol } from "../middlewares/auth.middleware.js";

const router = Router();

//solo administrados puede ver lista de guardias
router.get("/guards", verificarToken, checkRol(['admin']), getGuardias);

export default router;