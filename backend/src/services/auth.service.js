// Proyecto-Bicicletero/backend/src/services/auth.service.js

import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { findUserByEmail } from "./user.service.js"; 
import { JWT_SECRET } from "../config/configEnv.js";

// --- Servicio de Login (Core) ---
export async function loginUser(email, password) {
  
  // 1. Buscar usuario
  const user = await findUserByEmail(email);
  if (!user) {
    throw new Error("Credenciales incorrectas");
  }

  // 2. Verificar contraseña
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error("Credenciales incorrectas");
  }

  // 3. Crear Payload para JWT
  const payload = { 
    sub: user.rut, 
    email: user.email,
    role: user.role
  };

  // 4. Generar y retornar token
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });

  delete user.password;
  
  return { user, token };
}