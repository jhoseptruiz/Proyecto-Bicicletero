import {Router} from "express";
import { getBicicleteros, postBicicleteros } from "../controllers/bicicletero.controller.js";
import { verificarToken, checkRol } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(verificarToken, checkRol(['admin']));

router.get("/", getBicicleteros);
router.post("/", postBicicleteros);

export default router;
