import { AppDataSource } from "../config/configDb.js";
import { Bicicletero } from "../entities/bicicletero.entity.js";
import { RegistroUso } from "../entities/registroUso.entity.js";
import { User } from "../entities/user.entity.js";
import { Bicicleta } from "../entities/bicicleta.entity.js";
import { calcularDistancia } from "../utils/geoUtils.js";
import { In } from "typeorm"; // <--- IMPORTANTE: Importamos 'In'

// Repositorios
const usoRepo = AppDataSource.getRepository(RegistroUso);
const bicicleteroRepo = AppDataSource.getRepository(Bicicletero);
const userRepo = AppDataSource.getRepository(User);
const bicicletaRepo = AppDataSource.getRepository(Bicicleta);

// Helpers de Validación
const MAX_DISTANCIA_METROS = 50;

/**
 * Valida y crea una solicitud de ingreso (Estado: pendiente).
 */
export async function crearSolicitudIngreso(rutAlumno, bicicleteroId, lat, lng, bicicletaId) {
    // 1. Validar Usuario y Bicicleta
    if (!rutAlumno) throw new Error("El RUT del alumno es inválido o no fue proporcionado.");

    // 1. Validar Usuario y Bicicleta
    const usuario = await userRepo.findOne({ where: { rut: rutAlumno } });
    if (!usuario) throw new Error("Usuario no encontrado.");

    const bicicleta = await bicicletaRepo.findOne({ where: { id: bicicletaId, propietario: { rut: rutAlumno } } });
    if (!bicicleta) throw new Error("Bicicleta no encontrada o no pertenece al usuario.");

    // Validar que la bici no esté ya adentro.
    // CORRECCIÓN: Solo bloqueamos si está en un estado "VIVO" (Pendiente, Activo, etc).
    // Ignoramos registros 'rechazados' o 'finalizados' que por error no tengan fecha de salida.
    const usoActivo = await usoRepo.findOne({
        where: { 
            bicicleta: { id: bicicletaId }, 
            fechaSalida: null,
            estado: In(["pendiente", "activo", "solicitando_retiro"]) // <--- FILTRO AGREGADO
        },
    });
    
    if (usoActivo) throw new Error("Esta bicicleta ya figura ingresada (o pendiente) en un bicicletero.");

    // 2. Validar Bicicletero
    const bicicletero = await bicicleteroRepo.findOne({ where: { id: bicicleteroId } });
    if (!bicicletero) throw new Error("Bicicletero no encontrado (ID inválido).");

    // 3. Validar Ubicación Física
    if (bicicletero.latitud && bicicletero.longitud) {
        const distancia = calcularDistancia(lat, lng, bicicletero.latitud, bicicletero.longitud);
        if (distancia > MAX_DISTANCIA_METROS) {
            throw new Error(`Estás muy lejos del bicicletero (${distancia}m). Acércate a menos de ${MAX_DISTANCIA_METROS}m.`);
        }
    } else {
        throw new Error("El bicicletero no tiene ubicación configurada.");
    }

    // 4. Validar Horario
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
    // Solo contamos las que están activamente ocupando espacio
    const ocupados = await usoRepo.count({
        where: { 
            bicicletero: { id: bicicletero.id }, 
            fechaSalida: null,
            estado: In(["pendiente", "activo", "solicitando_retiro"])
        }
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
 */
export async function crearSolicitudSalida(rutAlumno, bicicleteroId, lat, lng, bicicletaId) {
    // 1. Validar Usuario y que tenga la bici adentro
    const usoActivo = await usoRepo.findOne({
        where: {
            usuario: { rut: rutAlumno },
            bicicleta: { id: bicicletaId },
            fechaSalida: null,
            estado: In(["pendiente", "activo", "solicitando_retiro"]) // Solo "vivas"
        },
        relations: ["bicicletero"]
    });

    if (!usoActivo) throw new Error("No tienes esta bicicleta estacionada actualmente.");

    // 2. Validar que sea el mismo bicicletero
    if (usoActivo.bicicletero.id != bicicleteroId) {
        throw new Error("Estás escaneando un bicicletero distinto al donde dejaste tu bicicleta.");
    }

    // 3. Geolocalización
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
 * Obtiene el estado de la solicitud activa.
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
    };
}

export async function validarQrBicicletero(bicicleteroId) {
    const bicicletero = await bicicleteroRepo.findOne({ where: { id: bicicleteroId } });
    if (!bicicletero) throw new Error("Bicicletero no encontrado.");
    
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
 * Verifica si el usuario ya tiene esta bici adentro.
 * Esto define si el Frontend muestra "Ingresar" (si es false) o "Retirar" (si es true).
 */
export async function verificarBicicletaEnBicicletero(rutAlumno, bicicletaId) {
    const uso = await usoRepo.findOne({
        where: {
            usuario: { rut: rutAlumno },
            bicicleta: { id: bicicletaId },
            fechaSalida: null,
            // CORRECCIÓN: Si fue rechazada, cuenta como que NO está adentro, así que devuelve false (permitiendo intentar de nuevo)
            estado: In(["pendiente", "activo", "solicitando_retiro"]) 
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
            where: { 
                bicicletero: { id: bici.id }, 
                fechaSalida: null,
                estado: In(["pendiente", "activo", "solicitando_retiro"])
            }
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