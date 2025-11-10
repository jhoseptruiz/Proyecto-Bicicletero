// Proyecto-Bicicletero/backend/src/controllers/auth.controller.js

import { loginUser } from "../services/auth.service.js";
import { createUser } from "../services/user.service.js";
import { handleSuccess, handleErrorClient, handleErrorServer } from "../Handlers/responseHandlers.js";

// ------------------------------------
// --- Funciones Internas (Helpers) ---
// ------------------------------------

function normalizeRut(rut) {
  if (!rut || typeof rut !== 'string') {
    return null;
  }
  
  let cleanRut = rut.replace(/[\.\-]/g, ""); // Quita puntos y guiones
  
  if (cleanRut.length < 2) {
    return null; // RUT inválido
  }
  
  const body = cleanRut.slice(0, -1);
  const dv = cleanRut.slice(-1).toUpperCase(); // Dígito verificador
  
  return `${body}-${dv}`; // Formato: 12345678-K
}


// ----------------------------------------
// --- Controladores de Autenticación (Exportados) ---
// ----------------------------------------

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    
    // Validaciones
    if (!email || !password) {
      return handleErrorClient(res, 400, "Email y contraseña son requeridos");
    }
    
    // Lógica de login
    const data = await loginUser(email, password);
    handleSuccess(res, 200, "Login exitoso", data);

  } catch (error) {
    handleErrorClient(res, 401, error.message);
  }
}

export async function register(req, res) {
  
  // Se definen aquí para que sean visibles en el bloque catch
  const data = req.body;
  let normalizedRut;

  try {
    // 1. Validaciones básicas
    if (!data.rut || !data.email || !data.password || !data.nombre || !data.apellido) {
      return handleErrorClient(res, 400, "RUT, Nombre, apellido, Email y contraseña son requeridos");
    }

    // 2. Validación de dominio UBB
    const allowedDomains = ["@alumnos.ubiobio.cl","@ubiobio.cl"];
    const emailDomain = data.email.substring(data.email.lastIndexOf('@'));
    if(!allowedDomains.includes(emailDomain)){
      return handleErrorClient(res, 400, "El correo debe pertenecer al dominio de la Univerdad del Bio-Bio ");
    }

    // 3. Normalización de RUT
    normalizedRut = normalizeRut(data.rut); // Asignamos a la variable del scope superior
    if (!normalizedRut) {
      return handleErrorClient(res, 400, "El formato del RUT no es válido");
    }
    
    const userData = {
      ...data,
      rut: normalizedRut
    };
    
    // 4. Creación de usuario (usando .insert() del servicio)
    const newUser = await createUser(userData);
    
    delete newUser.password; 
    handleSuccess(res, 201, "Usuario registrado exitosamente", newUser);

  } catch (error) {
    
    // 5. Manejo de errores de duplicidad (¡MEJORADO!)
    if (error.code === '23505') { // '23505' = Unique Violation
      
      const errorDetail = error.detail || "";
      const errorConstraint = error.constraint || "";

      // Comprobamos si el detalle del error incluye el RUT normalizado
      // o si el nombre de la "constraint" violada es la del RUT.
      if (errorDetail.includes(normalizedRut) || errorConstraint.includes('users_rut_pk')) { 
        handleErrorClient(res, 409, "El RUT ya está registrado");
      
      // Hacemos lo mismo para el email
      } else if (errorDetail.includes(data.email) || errorConstraint.includes('users_email_key')) {
        handleErrorClient(res, 409, "El email ya está registrado");
      
      } else {
        // Fallback genérico si no podemos identificar la columna
        handleErrorClient(res, 409, "El RUT o Email ya están registrados");
      }

    } else {
      // Otros errores
      handleErrorServer(res, 500, "Error interno del servidor", error.message);
    }
  }
}