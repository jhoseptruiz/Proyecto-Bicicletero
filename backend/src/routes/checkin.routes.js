import { Router } from "express";
import { scanBicicletero, checkStatus, getMapData } from "../controllers/checkin.controller.js";
import { verificarToken, checkRol } from "../middlewares/auth.middleware.js";

const router = Router();

// Middleware: Todos los roles pueden usar estos endpoints
router.use(verificarToken);
router.use(checkRol(["alumno", "guardia", "admin"]));

// Endpoints
router.post("/scan", scanBicicletero); // POST /api/checkin/scan
router.get("/status", checkStatus);    // GET /api/checkin/status
router.get("/map", getMapData);        // GET /api/checkin/map

export default router;
