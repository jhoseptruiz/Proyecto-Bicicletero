import { AppDataSource } from "../config/configDb.js";
import { Bicicletero } from "../entities/bicicletero.entity.js";
import { RegistroUso } from "../entities/registroUso.entity.js"; // Asegúrate de importar esto
import { LessThan, MoreThan, IsNull, In } from "typeorm";
import { Brackets } from "typeorm";

const bicicleteroRepo = AppDataSource.getRepository(Bicicletero);
const registroRepo = AppDataSource.getRepository(RegistroUso);

export async function findBicicleterosByGuardia(guardiaRut) {
  const asignados = await bicicleteroRepo.createQueryBuilder("b")
    .leftJoinAndSelect("b.guardiaAM", "gm")
    .leftJoinAndSelect("b.guardiaPM", "gt")
    .where("gm.rut = :rut", { rut: guardiaRut })
    .orWhere("gt.rut = :rut", { rut: guardiaRut })
    .getMany();

  const ahora = new Date();
  const horaActualStr = `${ahora.getHours().toString().padStart(2, '0')}:${ahora.getMinutes().toString().padStart(2, '0')}:00`;

  const bicicleterosActivos = asignados.filter(b => {
    const horaCorte = b.horaCambioTurno || "14:00:00";

    const esTurnoManana = horaActualStr < horaCorte;

    if (esTurnoManana) {
      return b.guardiaAM?.rut === guardiaRut;
    } else {
      return b.guardiaPM?.rut === guardiaRut;
    }
  });

  return bicicleterosActivos;
}

// 2. Obtener solicitudes pendientes
export async function obtenerSolicitudesPendientes(bicicleteroId) {
  const bicicletero = await bicicleteroRepo.findOneBy({ id: bicicleteroId });
  if (!bicicletero) {
    throw new Error("Bicicletero no encontrado");
  }

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
      const [horaActual, minActual] = [ahora.getHours(), ahora.getMinutes()];

      const [hApertura, mApertura] = bicicletero.horaApertura.split(':').map(Number);
      const [hCierre, mCierre] = bicicletero.horaCierre.split(':').map(Number);

      const minutosActuales = horaActual * 60 + minActual;
      const minutosApertura = hApertura * 60 + mApertura;
      const minutosCierre = hCierre * 60 + mCierre;

      if (minutosApertura <= minutosCierre) {
        // Horario normal (ej. 08:00 - 20:00)
        if (minutosActuales < minutosApertura || minutosActuales > minutosCierre) {
          throw new Error(`El bicicletero está cerrado. Horario: ${bicicletero.horaApertura} - ${bicicletero.horaCierre}`);
        }
      } else {
        // Horario que cruza medianoche (ej. 07:00 - 06:00)
        if (minutosActuales < minutosApertura && minutosActuales > minutosCierre) {
          throw new Error(`El bicicletero está cerrado actualmente. Horario: ${bicicletero.horaApertura} - ${bicicletero.horaCierre}`);
        }
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