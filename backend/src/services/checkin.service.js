import { AppDataSource } from "../config/configDb.js";
import { Bicicletero } from "../entities/bicicletero.entity.js";
import { UsoBicicletero } from "../entities/uso_bicicletero.entity.js";
import { User } from "../entities/user.entity.js";
import { Bicicleta } from "../entities/bicicleta.entity.js";
import { calcularDistancia } from "../utils/geoUtils.js";

// Repositorios
const usoRepo = AppDataSource.getRepository(UsoBicicletero);
const bicicleteroRepo = AppDataSource.getRepository(Bicicletero);
const userRepo = AppDataSource.getRepository(User);
const bicicletaRepo = AppDataSource.getRepository(Bicicleta);

// Helpers de Validación (Privados para limpieza, o exportados si sirven de test)
const MAX_DISTANCIA_METROS = 50;

/**
 * Procesa la solicitud de ingreso escaneada por el alumno.
 * 
 * @param {string} rutAlumno - RUT del usuario logueado.
 * @param {string} codigoQr - Contenido del QR escaneado.
 * @param {number} lat - Latitud GPS del celular.
 * @param {number} lng - Longitud GPS del celular.
 * @param {number} bicicletaId - Bicicleta que quiere ingresar.
 * @returns {Promise<object>} - El registro de Uso creado.
 */
export async function crearSolicitudIngreso(rutAlumno, codigoQr, lat, lng, bicicletaId) {
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

    // 2. Validar Bicicletero por QR
    const bicicletero = await bicicleteroRepo.findOne({ where: { codigoQr: codigoQr } });
    if (!bicicletero) throw new Error("Código QR inválido. No pertenece a ningún bicicletero registrado.");

    // 3. Validar Ubicación Física (Geolocalización)
    if (bicicletero.latitud && bicicletero.longitud) {
        const distancia = calcularDistancia(lat, lng, bicicletero.latitud, bicicletero.longitud);
        if (distancia > MAX_DISTANCIA_METROS) {
            throw new Error(`Estás muy lejos del bicicletero (${distancia}m). Acércate a menos de ${MAX_DISTANCIA_METROS}m.`);
        }
    } else {
        // Opcional: Si el bicicletero no tiene coords configuradas, ¿permitimos o denegamos?
        // Por seguridad, si es feature core, debería tenerlas.
        throw new Error("El bicicletero no tiene ubicación configurada para validación.");
    }

    // 4. Validar Horario de Funcionamiento
    // Nota: horaApertura/Cierre vienen como string "HH:MM:SS" de la BD
    const ahora = new Date();
    const [horaActual, minActual] = [ahora.getHours(), ahora.getMinutes()];

    // Convertir horarios de BD a comparables (simple parsing)
    // Asumimos formato "HH:MM:SS". Si es null, asumimos 24/7 o cerrado? Asumamos cerrado si no tiene horario.
    if (!bicicletero.horaApertura || !bicicletero.horaCierre) {
        // Si no hay horario definido, asumo operativo. (O lanzar error según regla de negocio)
    } else {
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
    // Contamos usos activos (sin fecha salida) para este bicicletero
    // Ojo: bicicletasGuardadas en Entity es un contador cache, pero la verdad absoluta es count() en UsoBicicletero
    // Usaremos el campo del bicicletero si confiamos en que el Guardia lo mantiene actualizado.
    // Para ser robustos en el Taller, consultemos la tabla real.
    const ocupados = await usoRepo.count({
        where: { bicicletero: { id: bicicletero.id }, fechaSalida: null }
    });

    if (ocupados >= bicicletero.capacidad) {
        throw new Error("El bicicletero está lleno. No hay cupos disponibles.");
    }

    // 6. Crear Solicitud (Estado: ESPERANDO_CONFIRMACION)
    const nuevaSolicitud = usoRepo.create({
        usuario: usuario,
        bicicleta: bicicleta,
        bicicletero: bicicletero,
        fechaIngreso: new Date(),
        estado: "ESPERANDO_CONFIRMACION",
        // Casillero asignado es null hasta que el guardia lo asigne
    });

    return await usoRepo.save(nuevaSolicitud);
}

/**
 * Procesa la solicitud de SALIDA escaneada por el alumno.
 * Cambia el estado a SOLICITANDO_RETIRO para que el guardia lo vea.
 */
export async function crearSolicitudSalida(rutAlumno, codigoQr, lat, lng, bicicletaId) {
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

    // 2. Validar que sea el mismo bicicletero donde está guardada
    // (Opcional: Si el sistema es distribuido. Pero asumamos que debe estar ahí)
    if (usoActivo.bicicletero.codigoQr !== codigoQr) {
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
    usoActivo.estado = "SOLICITANDO_RETIRO";
    return await usoRepo.save(usoActivo);
}

/**
 * Verifica si el usuario ya tiene esta bici adentro para guiar el flujo en el Frontend.
 * @returns {Promise<boolean>} true si la bici ya está adentro.
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
 * Incluye ubicación, capacidad total y ocupación calculada en tiempo real.
 */
export async function obtenerEstadoBicicleteros() {
    const bicicleteros = await bicicleteroRepo.find();

    // Calcular ocupación real para cada uno
    const estados = await Promise.all(bicicleteros.map(async (bici) => {
        const ocupados = await usoRepo.count({
            where: { bicicletero: { id: bici.id }, fechaSalida: null }
        });

        // Determinar estado lógico para el mapa
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
            estado: estadoMapa, // Para pintar colores en el mapa
            horario: `${bici.horaApertura} - ${bici.horaCierre}`
        };
    }));

    return estados;
}
