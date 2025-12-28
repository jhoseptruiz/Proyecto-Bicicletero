import { AppDataSource } from "../config/configDb.js";
import { Bicicletero } from "../entities/bicicletero.entity.js";
import { RegistroUso } from "../entities/registroUso.entity.js"; // Asegúrate de importar esto
import { LessThan, MoreThan, IsNull, In } from "typeorm";

const bicicleteroRepo = AppDataSource.getRepository(Bicicletero);
const registroRepo = AppDataSource.getRepository(RegistroUso);

// ... (Mantén tu función findBicicleterosByGuardia existente) ...
export async function findBicicleterosByGuardia(guardiaRut) {
  return await bicicleteroRepo.find({
    where: { guardiaAsignado: { rut: guardiaRut } },
    relations: ["guardiaAsignado"], 
  });
}

/**
 * 1. Obtener solicitudes pendientes para un bicicletero específico
 * Requisito: "consultar en su panel la solicitud pendiente"
 */
export async function obtenerSolicitudesPendientes(bicicleteroId) {
  return await registroRepo.find({
    where: {
      bicicletero: { id: bicicleteroId },
      estado: In(["pendiente", "solicitando_retiro"]),
    },
    relations: ["bicicleta", "usuario"], // Para ver foto, marca y RUT
    order: { fechaIngreso: "ASC" }
  });
}

/**
 * 2. Aprobar Ingreso
 * Requisitos:
 * - Validar horario de funcionamiento.
 * - Validar capacidad disponible.
 * - Validar que el casillero no esté ocupado.
 * - Post-condición: Actualizar capacidad y marcar casillero ocupado (estado 'activo').
 */
export async function aprobarIngreso(registroId, casilleroAsignado, guardiaRut) {
  // A. Obtener el registro
  const registro = await registroRepo.findOne({
    where: { id: registroId },
    relations: ["bicicletero", "bicicletero.guardiaAsignado"]
  });

  if (!registro) throw new Error("Solicitud no encontrada");
  
  // Seguridad: Verificar que el guardia logueado es el encargado de este bicicletero
  if (registro.bicicletero.guardiaAsignado?.rut !== guardiaRut) {
    throw new Error("No tienes permiso para gestionar este bicicletero.");
  }

  const bicicletero = registro.bicicletero;

  // B. Validar Horario (Si hay hora definida)
  if (bicicletero.horaApertura && bicicletero.horaCierre) {
    const ahora = new Date();
    const horaActual = `${ahora.getHours()}:${ahora.getMinutes()}:00`;
    // Nota: Esta comparación de strings de hora es básica. Para producción robusta, usar librerías de fecha.
    if (horaActual < bicicletero.horaApertura || horaActual > bicicletero.horaCierre) {
      throw new Error("El bicicletero está fuera de horario operativo.");
    }
  }

  // C. Validar Capacidad
  if (bicicletero.bicicletasGuardadas >= bicicletero.capacidad) {
    throw new Error("El bicicletero está lleno. No se puede aprobar el ingreso.");
  }

  // D. Validar Casillero "Ocupado"
  // Buscamos si existe algun registro ACTIVO en ese bicicletero con ESE casillero
  const casilleroOcupado = await registroRepo.findOne({
    where: {
      bicicletero: { id: bicicletero.id },
      casillero: casilleroAsignado,
      estado: "activo"
    }
  });

  if (casilleroOcupado) {
    throw new Error(`El casillero ${casilleroAsignado} ya está ocupado.`);
  }

  // E. Ejecutar Transacción (Actualizar registro y contador del bicicletero)
  registro.estado = "activo";
  registro.casillero = casilleroAsignado;
  registro.fechaIngreso = new Date(); // Actualizamos la hora real de entrada física

  bicicletero.bicicletasGuardadas += 1;

  await bicicleteroRepo.save(bicicletero);
  return await registroRepo.save(registro);
}

/**
 * 3. Rechazar Ingreso
 * Requisito: "Rechazar un ingreso si la bicicleta o usuario no coinciden"
 */
export async function rechazarIngreso(registroId) {
  const registro = await registroRepo.findOneBy({ id: registroId });
  if (!registro) throw new Error("Solicitud no encontrada");
  
  // Aquí podrías guardar el motivo en un campo nuevo si quisieras
  registro.estado = "rechazado";
  return await registroRepo.save(registro);
}

/**
 * 4. Obtener Registros Activos (Para el proceso de Egreso)
 * Requisito: "buscar el registro activo del usuario"
 */
export async function obtenerRegistrosActivos(bicicleteroId) {
  return await registroRepo.find({
    where: {
      bicicletero: { id: bicicleteroId },
      estado: "activo"
    },
    relations: ["bicicleta", "usuario"]
  });
}

/**
 * 5. Finalizar Estadía (Egreso)
 * Requisito: "recuperar bicicleta, 'Finalizar', liberar casillero y actualizar capacidad"
 */
export async function finalizarEstadia(registroId) {
  const registro = await registroRepo.findOne({
    where: { id: registroId },
    relations: ["bicicletero"]
  });

  if (!registro) throw new Error("Registro no encontrado");
  if (registro.estado !== "activo") throw new Error("El registro no está activo.");

  const bicicletero = registro.bicicletero;

  registro.estado = "finalizado";
  registro.fechaSalida = new Date();

  // Actualizar capacidad del bicicletero
  if (bicicletero.bicicletasGuardadas > 0) {
    bicicletero.bicicletasGuardadas -= 1;
  }

  await bicicleteroRepo.save(bicicletero);
  return await registroRepo.save(registro);
}

/**
 * 6. Modificar Ubicación
 * Requisito: "reubicar si comete error... no asignar casillero ocupado"
 */
export async function modificarCasillero(registroId, nuevoCasillero) {
  const registro = await registroRepo.findOne({
    where: { id: registroId },
    relations: ["bicicletero"]
  });

  if (!registro || registro.estado !== "activo") {
    throw new Error("Solo se pueden modificar registros activos.");
  }

  // Verificar que el nuevo casillero no esté ocupado
  const ocupado = await registroRepo.findOne({
    where: {
      bicicletero: { id: registro.bicicletero.id },
      casillero: nuevoCasillero,
      estado: "activo"
    }
  });

  if (ocupado) {
    throw new Error(`El casillero ${nuevoCasillero} ya está ocupado.`);
  }

  registro.casillero = nuevoCasillero;
  return await registroRepo.save(registro);
}