import { AppDataSource } from "../config/configDb.js";
import { Bicicletero } from "../entities/bicicletero.entity.js";
import { RegistroUso } from "../entities/registroUso.entity.js";
import { User } from "../entities/user.entity.js";
import { Bicicleta } from "../entities/bicicleta.entity.js";
import { calcularDistancia } from "../utils/geoUtils.js";
import { In } from "typeorm";

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
    // Validar concurrencia: Solo una solicitud activa (pendiente/retirando) permitida por usuario
    const solicitudEnProceso = await usoRepo.findOne({
        where: {
            usuario: { rut: rutAlumno },
            estado: In(["pendiente", "solicitando_retiro"])
        }
    });

    if (solicitudEnProceso) {
        throw new Error("Ya tienes una solicitud en proceso. Finaliza la anterior antes de iniciar otra.");
    }

    if (!rutAlumno) throw new Error("El RUT del alumno es inválido o no fue proporcionado.");

    const usuario = await userRepo.findOne({ where: { rut: rutAlumno } });
    if (!usuario) throw new Error("Usuario no encontrado.");

    const bicicleta = await bicicletaRepo.findOne({ where: { id: bicicletaId, propietario: { rut: rutAlumno } } });
    if (!bicicleta) throw new Error("Bicicleta no encontrada o no pertenece al usuario.");

    // Validar que la bicicleta no esté ingresada
    const usoActivo = await usoRepo.findOne({
        where: {
            bicicleta: { id: bicicletaId },
            fechaSalida: null,
            estado: In(["pendiente", "activo", "solicitando_retiro"])
        },
    });

    if (usoActivo) throw new Error("Esta bicicleta ya figura ingresada (o pendiente) en un bicicletero.");

    const bicicletero = await bicicleteroRepo.findOne({ where: { id: bicicleteroId } });
    if (!bicicletero) throw new Error("Bicicletero no encontrado (ID inválido).");

    if (bicicletero.estado !== 'operativo') {
        throw new Error("Este bicicletero no está operativo actualmente.");
    }

    // Validación de geolocalización
    if (bicicletero.latitud && bicicletero.longitud) {
        const distancia = calcularDistancia(lat, lng, bicicletero.latitud, bicicletero.longitud);
        if (distancia > MAX_DISTANCIA_METROS) {
            throw new Error(`Estás muy lejos del bicicletero (${distancia}m). Acércate a menos de ${MAX_DISTANCIA_METROS}m.`);
        }
    } else {
        throw new Error("El bicicletero no tiene ubicación configurada.");
    }

    // Validación de horario
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
            // Horario que cruza medianoche (ej. 20:00 - 06:00)
            if (minutosActuales < minutosApertura && minutosActuales > minutosCierre) {
                throw new Error(`El bicicletero está cerrado actualmente. Horario: ${bicicletero.horaApertura} - ${bicicletero.horaCierre}`);
            }
        }
    }

    // Validación de capacidad
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
    // Validar concurrencia
    const solicitudEnProceso = await usoRepo.findOne({
        where: {
            usuario: { rut: rutAlumno },
            estado: In(["pendiente", "solicitando_retiro"])
        }
    });

    // Si existe solicitud en proceso para OTRA bicicleta, bloquear.
    if (solicitudEnProceso && solicitudEnProceso.bicicleta.id !== bicicletaId) {
        throw new Error("Ya tienes otra solicitud en proceso. Finalízala antes de retirar esta bicicleta.");
    }

    // Validar que la bicicleta esté ingresada
    const usoActivo = await usoRepo.findOne({
        where: {
            usuario: { rut: rutAlumno },
            bicicleta: { id: bicicletaId },
            fechaSalida: null,
            estado: In(["pendiente", "activo", "solicitando_retiro"])
        },
        relations: ["bicicletero"]
    });

    if (!usoActivo) throw new Error("No tienes esta bicicleta estacionada actualmente.");

    // No permitir retiro si aún está pendiente de ingreso
    if (usoActivo.estado === 'pendiente') {
        throw new Error("Tu solicitud de ingreso aún está pendiente. Espera a que el guardia te apruebe.");
    }

    if (usoActivo.bicicletero.id != bicicleteroId) {
        throw new Error("Estás escaneando un bicicletero distinto al donde dejaste tu bicicleta.");
    }

    // Geolocalización
    if (usoActivo.bicicletero.latitud && usoActivo.bicicletero.longitud) {
        const distancia = calcularDistancia(lat, lng, usoActivo.bicicletero.latitud, usoActivo.bicicletero.longitud);
        if (distancia > MAX_DISTANCIA_METROS) {
            throw new Error(`Estás muy lejos para retirar la bicicleta (${distancia}m).`);
        }
    }

    usoActivo.estado = "solicitando_retiro";
    return await usoRepo.save(usoActivo);
}

/**
 * Cancela una solicitud activa.
 */
export async function cancelarSolicitud(rutAlumno) {
    // Buscar específicamente una solicitud que esté en proceso (pendiente o retirando)
    const uso = await usoRepo.findOne({
        where: {
            usuario: { rut: rutAlumno },
            fechaSalida: null,
            estado: In(['pendiente', 'solicitando_retiro'])
        }
    });

    if (!uso) {
        // Verificar si tiene alguna activa para dar un msj más claro
        const tieneActivas = await usoRepo.findOne({ where: { usuario: { rut: rutAlumno }, fechaSalida: null } });
        if (tieneActivas) {
            throw new Error("No tienes solicitudes pendientes. Tu bicicleta ya está ingresada (Activa).");
        }
        throw new Error("No tienes ninguna solicitud activa para cancelar.");
    }

    if (uso.estado === 'pendiente') {
        // Cancelar Ingreso -> Eliminar registro
        await usoRepo.remove(uso);
        return { message: "Solicitud de ingreso cancelada." };
    }

    if (uso.estado === 'solicitando_retiro') {
        // Cancelar Salida -> Volver a estado 'activo'
        uso.estado = 'activo';
        await usoRepo.save(uso);
        return { message: "Solicitud de retiro cancelada. Tu bicicleta sigue segura." };
    }

    throw new Error("Estado desconocido, no se pudo cancelar.");
}

/**
 * Obtiene el estado de la solicitud activa del usuario.
 */
export async function obtenerEstadoSolicitud(rutAlumno) {
    const usos = await usoRepo.find({
        where: {
            usuario: { rut: rutAlumno },
            fechaSalida: null,
            estado: In(["pendiente", "activo", "solicitando_retiro"]) // Solo estados válidos del ENUM
        },
        relations: ["bicicletero", "bicicleta"],
        order: { fechaIngreso: "DESC" }
    });

    if (!usos || usos.length === 0) return [];

    return usos.map(uso => {
        const hA = uso.bicicletero.horaApertura;
        const hC = uso.bicicletero.horaCierre;
        const horarioStr = (hA && hC)
            ? `${hA.slice(0, 5)} - ${hC.slice(0, 5)}`
            : "Horario no definido";

        return {
            id: uso.id,
            estado: uso.estado,
            bicicletero: uso.bicicletero.ubicacion,
            horario: horarioStr,
            // Enviar horas crudas para validación frontend
            horaApertura: hA,
            horaCierre: hC,
            casillero: uso.casillero,
            horaIngreso: uso.fechaIngreso,
            bicicleta: {
                id: uso.bicicleta.id,
                marca: uso.bicicleta.marca,
                color: uso.bicicleta.color,
                foto: uso.bicicleta.foto,
                modelo: uso.bicicleta.modelo
            }
        };
    });
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
 * Verifica si el usuario ya tiene esta bici adentro.
 */
export async function verificarBicicletaEnBicicletero(rutAlumno, bicicletaId) {
    const uso = await usoRepo.findOne({
        where: {
            usuario: { rut: rutAlumno },
            bicicleta: { id: bicicletaId },
            fechaSalida: null,
            // Solo registros vivos
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