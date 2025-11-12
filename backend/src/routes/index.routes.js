import { Router } from "express";
import authRoutes from "./auth.routes.js";
import bicicleteroRoutes from "./bicicletero.routes.js";
import bicicletaRoutes from "./bicicleta.routes.js";
import userRoutes from "./user.routes.js";
import guardiaRoutes from "./guardia.routes.js";

export function routerApi(app) {
  const router = Router();
  app.use("/api", router);

  router.use("/auth", authRoutes);
  router.use("/bicicleteros", bicicleteroRoutes);
  router.use("/bicicletas", bicicletaRoutes);
  router.use("/users", userRoutes);
  router.use("/guardia", guardiaRoutes);
}