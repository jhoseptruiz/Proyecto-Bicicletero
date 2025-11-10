import { Router } from "express";
import authRoutes from "./auth.routes.js";
import bicicleteroRoutes from "./bicicletero.routes.js";
import userRoutes from "./user.routes.js";

export function routerApi(app) {
  const router = Router();
  app.use("/api", router);

  router.use("/auth", authRoutes);
  router.use("/bicicleteros", bicicleteroRoutes);
  router.use("/users", userRoutes);
}