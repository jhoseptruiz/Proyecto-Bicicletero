import { Router } from "express";
import { postBicicleta, getMisBicicletas, updateBicicleta, deleteBicicleta } from "../controllers/bicicleta.controller.js";
import { verificarToken, checkRol } from "../middlewares/auth.middleware.js";
import { upload } from "../config/multer.config.js";

const router = Router();

router.use(verificarToken, checkRol(['alumno', 'admin', 'guardia']));

router.get("/mis-bicicletas", getMisBicicletas);
router.post("/", upload.single('foto'), postBicicleta);
router.put("/:id", upload.single('foto'), updateBicicleta);
router.delete("/:id", deleteBicicleta);

export default router;