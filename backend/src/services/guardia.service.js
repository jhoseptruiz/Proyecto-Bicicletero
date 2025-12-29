import { AppDataSource } from "../config/configDb.js";
import { Bicicletero } from "../entities/bicicletero.entity.js";
import { RegistroUso } from "../entities/registroUso.entity.js";
import { In, IsNull } from "typeorm";

const bicicleteroRepo = AppDataSource.getRepository(Bicicletero);
const registroRepo = AppDataSource.getRepository(RegistroUso);

// 1. Obtener los bicicleteros del guardia
export async function obtenerMisBicicleteros(rutGuardia) {
  return await bicicleteroRepo.find({
    where: { guardiaAsignado: { rut: rutGuardia } },
    relations: ["guardiaAsignado"], 
  });
}

// 2. Obtener solicitudes pendientes
export async function obtenerSolicitudesPendientes(bicicleteroId) {
  return await registroRepo.find({
    where: {
      bicicletero: { id: bicicleteroId },
      estado: In(["pendiente", "solicitando_retiro"]),
    },
    relations: ["bicicleta", "usuario"],
    order: { fechaIngreso: "ASC" }
  });
}

// 3. Aprobar Ingreso (Transacción completa)
export async function aprobarIngreso(registroId, casilleroAsignado, guardiaRut) {
  return await AppDataSource.transaction(async (manager) => {
    // A. Buscar la solicitud
    const registro = await manager.findOne(RegistroUso, {
      where: { id: registroId },
      relations: ["bicicletero", "bicicletero.guardiaAsignado"]
    });

    if (!registro) throw new Error("Solicitud no encontrada");

    // Seguridad: Verificar guardia
    if (registro.bicicletero.guardiaAsignado?.rut !== guardiaRut) {
      throw new Error("No tienes permiso para gestionar este bicicletero.");
    }

    const bicicletero = registro.bicicletero;

    // B. Validar Horario
    if (bicicletero.horaApertura && bicicletero.horaCierre) {
      const ahora = new Date();
      const horaActual = `${ahora.getHours()}:${ahora.getMinutes()}:00`;
      if (horaActual < bicicletero.horaApertura || horaActual > bicicletero.horaCierre) {
        throw new Error("El bicicletero está fuera de horario operativo.");
      }
    }

    // C. Validar Capacidad
    if (bicicletero.bicicletasGuardadas >= bicicletero.capacidad) {
      throw new Error("El bicicletero está lleno.");
    }

    // D. Validar Casillero Ocupado
    const ocupado = await manager.findOne(RegistroUso, {
      where: {
        bicicletero: { id: bicicletero.id },
        casillero: casilleroAsignado,
        estado: "activo"
      }
    });

    if (ocupado) throw new Error(`El casillero ${casilleroAsignado} ya está ocupado.`);

    // E. Actualizar
    registro.estado = "activo";
    registro.casillero = casilleroAsignado;
    registro.fechaIngreso = new Date();
    
    bicicletero.bicicletasGuardadas += 1;

    // --- CORRECCIÓN CLAVE AQUÍ ---
    // Pasamos la Entidad explícita porque 'bicicletero' es un objeto plano
    await manager.save(Bicicletero, bicicletero);
    return await manager.save(RegistroUso, registro);
  });
}

// 4. Rechazar Ingreso
export async function rechazarIngreso(registroId, motivo) {
  const registro = await registroRepo.findOneBy({ id: registroId });
  if (!registro) throw new Error("Solicitud no encontrada");
  registro.estado = "rechazado";
  return await registroRepo.save(registro);
}

// 5. Obtener Activos (En custodia)
export async function obtenerActivos(bicicleteroId) {
  return await registroRepo.find({
    where: {
      bicicletero: { id: bicicleteroId },
      fechaSalida: IsNull(),
      estado: In(["activo", "solicitando_retiro"])
    },
    relations: ["bicicleta", "usuario"]
  });
}

// 6. Finalizar Estadía (Salida)
export async function finalizarEstadia(registroId) {
  return await AppDataSource.transaction(async (manager) => {
    const registro = await manager.findOne(RegistroUso, {
      where: { id: registroId },
      relations: ["bicicletero"]
    });

    if (!registro) throw new Error("Registro no encontrado");
    if (registro.fechaSalida) throw new Error("Esta bicicleta ya salió.");

    const bicicletero = registro.bicicletero;

    registro.estado = "finalizado";
    registro.fechaSalida = new Date();

    if (bicicletero.bicicletasGuardadas > 0) {
      bicicletero.bicicletasGuardadas -= 1;
    }

    // --- CORRECCIÓN CLAVE AQUÍ TAMBIÉN ---
    // Usamos manager.save(Entidad, Objeto)
    await manager.save(Bicicletero, bicicletero);
    return await manager.save(RegistroUso, registro);
  });
}

// 7. Modificar Ubicación
export async function modificarUbicacion(registroId, nuevoCasillero) {
  const registro = await registroRepo.findOne({
    where: { id: registroId },
    relations: ["bicicletero"]
  });
  if (!registro) throw new Error("Registro no encontrado");

  // Validar si el nuevo casillero está ocupado
  const ocupado = await registroRepo.findOne({
    where: {
      bicicletero: { id: registro.bicicletero.id },
      casillero: nuevoCasillero,
      estado: "activo"
    }
  });

  if (ocupado) throw new Error(`El casillero ${nuevoCasillero} ya está ocupado.`);

  registro.casillero = nuevoCasillero;
  return await registroRepo.save(registro);
}

// 8. Resumen Global
export async function obtenerResumenGlobal(rutGuardia) {
  const bicicleteros = await bicicleteroRepo.find({
    where: { guardiaAsignado: { rut: rutGuardia } },
    select: ["id", "ubicacion"]
  });

  const resumen = await Promise.all(bicicleteros.map(async (bici) => {
    const count = await registroRepo.count({
      where: {
        bicicletero: { id: bici.id },
        estado: In(["pendiente", "solicitando_retiro"])
      }
    });
    return { id: bici.id, ubicacion: bici.ubicacion, cantidad: count };
  }));

  return resumen;
}