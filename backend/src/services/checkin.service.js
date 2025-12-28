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

// Helpers de Validación (Privados para limpieza, o exportados si sirven de test)
const MAX_DISTANCIA_METROS = 50;

/**
 * Valida y crea una solicitud de ingreso (Estado: pendiente).
 * Revisa: Existencia user/bici, ubicación GPS, ID válido, horario y capacidad.
 * NOTA: El parámetro 'bicicleteroId' antes era 'codigoQr'. Ahora recibimos el ID numérico.
 */
export async function crearSolicitudIngreso(rutAlumno, bicicleteroId, lat, lng, bicicletaId) {
    // 1. Validar Usuario y Bicicleta
    const usuario = await userRepo.findOne({ where: { rut: rutAlumno } });
    if (!usuario) throw new Error("Usuario no encontrado.");

    const bicicleta = await bicicletaRepo.findOne({ where: { id: bicicletaId, propietario: { rut: rutAlumno } } });
    if (!bicicleta) throw new Error("Bicicleta no encontrada o no pertenece al usuario.");

    // Validar que la bici no esté ya adentro (sin fechaSalida)
    const usoActivo = await usoRepo.findOne({
        where: { bicicleta: { id: bicicletaId }, fechaSalida: null },
    });
    if (usoActivo) throw new Error("Esta bicicleta ya figura ingresada en un bicicletero.");

    // 2. Validar Bicicletero por ID (CORREGIDO)
    // Antes buscaba por string codigoQr, ahora busca por ID primario
    const bicicletero = await bicicleteroRepo.findOne({ where: { id: bicicleteroId } });
    
    if (!bicicletero) throw new Error("Bicicletero no encontrado (ID inválido).");

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
    if (!bicicletero.horaApertura || !bicicletero.horaCierre) {
        // Sin horario definido = Operativo 24/7 (según lógica previa)
    } else {
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

    // 2. Validar que sea el mismo bicicletero donde está guardada (CORREGIDO)
    // Comparamos IDs. Usamos != para permitir comparación flexible (string vs number)
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
    };
}

// CORREGIDO: Valida buscando por ID
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