import { AppDataSource } from "../config/configDb.js";
import { Bicicletero } from "../entities/bicicletero.entity.js";
import { RegistroUso } from "../entities/registroUso.entity.js"; // Asegúrate de importar esto
import { LessThan, MoreThan, IsNull, In } from "typeorm";
import { Brackets } from "typeorm";

const bicicleteroRepo = AppDataSource.getRepository(Bicicletero);
const registroRepo = AppDataSource.getRepository(RegistroUso);

// ... (Mantén tu función findBicicleterosByGuardia existente) ...
export async function findBicicleterosByGuardia(guardiaRut) {
  // 1. Buscamos TODOS los bicicleteros donde este usuario sea guardia (mañana O tarde)
  const asignados = await bicicleteroRepo.createQueryBuilder("b")
    .leftJoinAndSelect("b.guardiaAM", "gm")
    .leftJoinAndSelect("b.guardiaPM", "gt")
    .where("gm.rut = :rut", { rut: guardiaRut })
    .orWhere("gt.rut = :rut", { rut: guardiaRut })
    .getMany();

  // 2. Filtramos en memoria según la hora actual y la hora de cambio de CADA bicicletero
  const ahora = new Date();
  const horaActualStr = `${ahora.getHours().toString().padStart(2, '0')}:${ahora.getMinutes().toString().padStart(2, '0')}:00`;

  const bicicleterosActivos = asignados.filter(b => {
    // Si no hay hora configurada, usamos 14:00 por defecto
    const horaCorte = b.horaCambioTurno || "14:00:00";

    const esTurnoManana = horaActualStr < horaCorte;

    if (esTurnoManana) {
      // Si es temprano, lo muestro SOLO si soy el guardia de la mañana
      return b.guardiaAM?.rut === guardiaRut;
    } else {
      // Si es tarde, lo muestro SOLO si soy el guardia de la tarde
      return b.guardiaPM?.rut === guardiaRut;
    }
  });

  return bicicleterosActivos;
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
      where: { id: registroId },
      relations: ["bicicletero", "bicicletero.guardiaAM", "bicicletero.guardiaPM"]
    });

    if (!registro) throw new Error("Solicitud no encontrada");

    // Seguridad: Verificar guardia (AM o PM)
    const esGuardiaAsignado =
      registro.bicicletero.guardiaAM?.rut === guardiaRut ||
      registro.bicicletero.guardiaPM?.rut === guardiaRut;

    if (!esGuardiaAsignado) {
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
  registro.fechaSalida = new Date(); // Marcar como finalizado para que no aparezca en activos
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
  // Buscar bicicleteros donde el usuario sea guardia AM o PM
  const bicicleteros = await bicicleteroRepo.find({
    where: [
      { guardiaAM: { rut: rutGuardia } },
      { guardiaPM: { rut: rutGuardia } }
    ],
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