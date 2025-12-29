import { loginUser } from "../services/auth.service.js";
import { createUser } from "../services/user.service.js";
import { handleSuccess, handleErrorClient, handleErrorServer } from "../Handlers/responseHandlers.js";


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


export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return handleErrorClient(res, 400, "Email y contraseña son requeridos");
    }

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
    if (!data.rut || !data.email || !data.password || !data.nombre || !data.apellido) {
      return handleErrorClient(res, 400, "RUT, Nombre, apellido, Email y contraseña son requeridos");
    }

    const emailRegex = /^[a-zA-Z0-9._-]+@(alumnos\.ubiobio\.cl|ubiobio\.cl)$/;
    if (!emailRegex.test(data.email)) {
      return handleErrorClient(res, 400, "El correo no tiene un formato válido o no pertenece a la Universidad del Bio-Bio.");
    }

    const nameRegex = /^[a-zA-ZñÑáéíóúÁÉÍÓÚ\s]+$/;
    if (!nameRegex.test(data.nombre) || !nameRegex.test(data.apellido)) {
      return handleErrorClient(res, 400, "El nombre y apellido solo pueden contener letras.");
    }

    normalizedRut = normalizeRut(data.rut);
    if (!normalizedRut) {
      return handleErrorClient(res, 400, "El formato del RUT no es válido");
    }

    const userData = {
      ...data,
      rut: normalizedRut
    };

    const newUser = await createUser(userData);

    delete newUser.password;
    handleSuccess(res, 201, "Usuario registrado exitosamente", newUser);

  } catch (error) {
    if (error.code === '23505') {
      const errorDetail = error.detail || "";
      const errorConstraint = error.constraint || "";

      if (errorDetail.includes(normalizedRut) || errorConstraint.includes('users_rut_pk')) {
        handleErrorClient(res, 409, "El RUT ya está registrado");
      } else if (errorDetail.includes(data.email) || errorConstraint.includes('users_email_key')) {
        handleErrorClient(res, 409, "El email ya está registrado");

      } else {
        handleErrorClient(res, 409, "El RUT o Email ya están registrados");
      }
    } else {
      handleErrorServer(res, 500, "Error interno del servidor", error.message);
    }
  }
}