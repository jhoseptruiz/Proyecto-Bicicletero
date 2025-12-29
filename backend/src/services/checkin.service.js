import { AppDataSource } from "../config/configDb.js";
import { Bicicletero } from "../entities/bicicletero.entity.js";
import { RegistroUso } from "../entities/registroUso.entity.js";
import { User } from "../entities/user.entity.js";
import { Bicicleta } from "../entities/bicicleta.entity.js";
import { calcularDistancia } from "../utils/geoUtils.js";

// Repositorios
const usoRepo = AppDataSource.getRepository(RegistroUso);
const bicicleteroRepo = AppDataSource.getRepository(Bicicletero);
const userRepo = AppDataSource.getRepository(User);
const bicicletaRepo = AppDataSource.getRepository(Bicicleta);

// Helpers de Validación
const MAX_DISTANCIA_METROS = 50;

/**
 * Valida y crea una solicitud de ingreso (Estado: pendiente).
 * Revisa: Existencia user/bici, ubicación GPS, ID válido, horario y capacidad.
 */
export async function crearSolicitudIngreso(rutAlumno, bicicleteroId, lat, lng, bicicletaId) {
    // 0. Validar si el usuario ya tiene CUALQUIER solicitud activa
    const solicitudExistente = await usoRepo.findOne({
        where: { usuario: { rut: rutAlumno }, fechaSalida: null }
    });
    if (solicitudExistente) {
        if (solicitudExistente.estado === 'pendiente') throw new Error("Ya tienes una solicitud de ingreso pendiente.");
        if (solicitudExistente.estado === 'solicitando_retiro') throw new Error("Ya has solicitado el retiro de tu bicicleta.");
        throw new Error("Ya tienes una bicicleta registrada en un bicicletero.");
    }

    // 1. Validar Usuario y Bicicleta
    const usuario = await userRepo.findOne({ where: { rut: rutAlumno } });
    if (!usuario) throw new Error("Usuario no encontrado.");

    const bicicleta = await bicicletaRepo.findOne({ where: { id: bicicletaId, propietario: { rut: rutAlumno } } });
    if (!bicicleta) throw new Error("Bicicleta no encontrada o no pertenece al usuario.");

    const usoActivo = await usoRepo.findOne({
        where: { bicicleta: { id: bicicletaId }, fechaSalida: null },
    });
    if (usoActivo) throw new Error("Esta bicicleta ya figura ingresada en un bicicletero.");

    // 2. Validar Bicicletero por ID
    const bicicletero = await bicicleteroRepo.findOne({ where: { id: bicicleteroId } });

    if (!bicicletero) throw new Error("Bicicletero no encontrado (ID inválido).");

    // VALIDACION: Bicicletero debe estar Activo/Operativo
    if (bicicletero.estado !== 'operativo') {
        throw new Error("Este bicicletero no está operativo actualmente.");
    }

    // 3. Validar Ubicación Física (Geolocalización)
    if (bicicletero.latitud && bicicletero.longitud) {
        const distancia = calcularDistancia(lat, lng, bicicletero.latitud, bicicletero.longitud);
        if (distancia > MAX_DISTANCIA_METROS) {
            throw new Error(`Estás muy lejos del bicicletero (${distancia}m). Acércate a menos de ${MAX_DISTANCIA_METROS}m.`);
        }
    } else {
        throw new Error("El bicicletero no tiene ubicación configurada para validación.");
    }

    // 4. Validar Horario de Funcionamiento
    if (bicicletero.horaApertura && bicicletero.horaCierre) {
        const ahora = new Date();
        const [horaActual, minActual] = [ahora.getHours(), ahora.getMinutes()];

        const [hApertura, mApertura] = bicicletero.horaApertura.split(':').map(Number);
        const [hCierre, mCierre] = bicicletero.horaCierre.split(':').map(Number);

        const minutosActuales = horaActual * 60 + minActual;
        const minutosApertura = hApertura * 60 + mApertura;
        const minutosCierre = hCierre * 60 + mCierre;

        if (minutosActuales < minutosApertura || minutosActuales > minutosCierre) {
            throw new Error(`El bicicletero está cerrado. Horario: ${bicicletero.horaApertura} - ${bicicletero.horaCierre}`);
        }
    }

    // 5. Validar Capacidad
    const ocupados = await usoRepo.count({
        where: { bicicletero: { id: bicicletero.id }, fechaSalida: null }
    });

    if (ocupados >= bicicletero.capacidad) {
        throw new Error("El bicicletero está lleno. No hay cupos disponibles.");
    }

    // 6. Crear Solicitud
    const nuevaSolicitud = usoRepo.create({
        usuario: usuario,
        bicicleta: bicicleta,
        bicicletero: bicicletero,
        fechaIngreso: new Date(),
        estado: "pendiente",
    });

    return await usoRepo.save(nuevaSolicitud);
}

/**
 * Genera la solicitud de salida. 
 * Cambia el estado a solicitando_retiro para alertar al guardia.
 */
export async function crearSolicitudSalida(rutAlumno, bicicleteroId, lat, lng, bicicletaId) {
    // 1. Validar Usuario y que tenga la bici adentro
    const usoActivo = await usoRepo.findOne({
        where: {
            usuario: { rut: rutAlumno },
            bicicleta: { id: bicicletaId },
            fechaSalida: null
        },
        relations: ["bicicletero"]
    });

    if (!usoActivo) throw new Error("No tienes esta bicicleta estacionada actualmente.");

    // VALIDACION: No permitir retiro si aun esta pendiente de ingreso
    if (usoActivo.estado === 'pendiente') {
        throw new Error("Tu solicitud de ingreso aún está pendiente. Espera a que el guardia te apruebe.");
    }

    // 2. Validar que sea el mismo bicicletero donde está guardada
    if (usoActivo.bicicletero.id != bicicleteroId) {
        throw new Error("Estás escaneando un bicicletero distinto al donde dejaste tu bicicleta.");
    }

    // 3. Geolocalización (Debe estar ahí para sacarla)
    if (usoActivo.bicicletero.latitud && usoActivo.bicicletero.longitud) {
        const distancia = calcularDistancia(lat, lng, usoActivo.bicicletero.latitud, usoActivo.bicicletero.longitud);
        if (distancia > MAX_DISTANCIA_METROS) {
            throw new Error(`Estás muy lejos para retirar la bicicleta (${distancia}m).`);
        }
    }

    // 4. Actualizar Estado
    usoActivo.estado = "solicitando_retiro";
    return await usoRepo.save(usoActivo);
}

/**
 * Cancela una solicitud activa.
 * - Si es 'pendiente' (ingreso): Se elimina el registro.
 * - Si es 'solicitando_retiro' (salida): Se revierte a estado 'ingresado'.
 */
export async function cancelarSolicitud(rutAlumno) {
    const uso = await usoRepo.findOne({
        where: { usuario: { rut: rutAlumno }, fechaSalida: null }
    });

    if (!uso) throw new Error("No tienes ninguna solicitud activa para cancelar.");

    if (uso.estado === 'pendiente') {
        // Cancelar Ingreso -> Eliminar registro
        await usoRepo.remove(uso);
        return { message: "Solicitud de ingreso cancelada." };
    }

    if (uso.estado === 'solicitando_retiro') {
        // Cancelar Salida -> Volver a estado 'activo' (el correcto en enum)
        // (El usuario se arrepintió de sacar la bici)
        uso.estado = 'activo';
        await usoRepo.save(uso);
        return { message: "Solicitud de retiro cancelada. Tu bicicleta sigue segura." };
    }

    throw new Error("No puedes cancelar una bicicleta ya ingresada. Debes solicitar retiro.");
}

/**
 * Obtiene el estado de la solicitud activa de un usuario (si tiene alguna).
 */
export async function obtenerEstadoSolicitud(rutAlumno) {
    const uso = await usoRepo.findOne({
        where: { usuario: { rut: rutAlumno }, fechaSalida: null },
        relations: ["bicicletero", "bicicleta"],
        order: { fechaIngreso: "DESC" }
    });

    if (!uso) return null;

    return {
        id: uso.id,
        estado: uso.estado,
        bicicletero: uso.bicicletero.ubicacion,
        casillero: uso.casillero,
        horaIngreso: uso.fechaIngreso,
        bicicleta: {
            id: uso.bicicleta.id,
            marca: uso.bicicleta.marca,
            color: uso.bicicleta.color,
            foto: uso.bicicleta.foto, // Asumiendo que existe campo 'foto' o url
            modelo: uso.bicicleta.modelo
        }
    };
}

// Valida buscando por ID
export async function validarQrBicicletero(bicicleteroId) {
    const bicicletero = await bicicleteroRepo.findOne({ where: { id: bicicleteroId } });

    if (!bicicletero) {
        throw new Error("Bicicletero no encontrado.");
    }

    return {
        id: bicicletero.id,
        ubicacion: bicicletero.ubicacion,
        latitud: bicicletero.latitud,
        longitud: bicicletero.longitud,
        capacidad: bicicletero.capacidad,
        bicicletasGuardadas: bicicletero.bicicletasGuardadas
    };
}

/**
 * Verifica si el usuario ya tiene esta bici adentro para guiar el flujo en el Frontend.
 */
export async function verificarBicicletaEnBicicletero(rutAlumno, bicicletaId) {
    const uso = await usoRepo.findOne({
        where: {
            usuario: { rut: rutAlumno },
            bicicleta: { id: bicicletaId },
            fechaSalida: null
        }
    });
    return !!uso;
}

/**
 * Obtiene el estado actual de los bicicleteros para el mapa.
 */
export async function obtenerEstadoBicicleteros() {
    const bicicleteros = await bicicleteroRepo.find();

    const estados = await Promise.all(bicicleteros.map(async (bici) => {
        const ocupados = await usoRepo.count({
            where: { bicicletero: { id: bici.id }, fechaSalida: null }
        });

        let estadoMapa = "DISPONIBLE";
        if (ocupados >= bici.capacidad) estadoMapa = "LLENO";
        if (bici.estado !== "operativo") estadoMapa = "MANTENIMIENTO";

        return {
            id: bici.id,
            ubicacion: bici.ubicacion,
            latitud: bici.latitud,
            longitud: bici.longitud,
            capacidad: bici.capacidad,
            ocupados: ocupados,
            disponibles: bici.capacidad - ocupados,
            estado: estadoMapa,
            horario: `${bici.horaApertura} - ${bici.horaCierre}`,
            codigoQr: bici.codigoQr
        };
    }));

    return estados;
}

/**
 * Obtiene detalle único para validación rápida en escáner.
 */
export async function obtenerDetalleBicicletero(id) {
    const bici = await bicicleteroRepo.findOne({ where: { id: parseInt(id) } });
    if (!bici) throw new Error("Bicicletero no encontrado");

    const ocupados = await usoRepo.count({
        where: { bicicletero: { id: bici.id }, fechaSalida: null }
    });

    return {
        id: bici.id,
        ubicacion: bici.ubicacion,
        latitud: bici.latitud,
        longitud: bici.longitud,
        capacidad: bici.capacidad,
        ocupados: ocupados,
        disponibles: bici.capacidad - ocupados,
        estado: bici.estado, // operativo, mantencion, etc
        horaApertura: bici.horaApertura,
        horaCierre: bici.horaCierre
    };
}