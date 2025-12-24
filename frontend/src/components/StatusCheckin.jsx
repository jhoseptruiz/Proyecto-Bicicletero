import React, { useState, useEffect } from 'react';
import { getCheckinStatus } from '../services/checkin.service';

function StatusCheckin() {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        cargarStatus();
        // Opcional: Polling cada 5 segundos para ver si el guardia aprobó
        const intervalo = setInterval(cargarStatus, 5000);
        return () => clearInterval(intervalo);
    }, []);

    const cargarStatus = async () => {
        try {
            // getCheckinStatus devuelve { data: { estado: '...', ... } } o similar
            // Revisando controller:
            // Si no hay solicitud: { estado: "SIN_SOLICITUD" } (dentro de data o directo?)
            // Controller: handleSuccess(res, 200, "...", status); -> status va en data.
            const resp = await getCheckinStatus();
            setStatus(resp.data);
            setError(null);
        } catch (err) {
            console.error("Error status", err);
            // Si el error es 404 o similar, tal vez es que no hay token.
            setError("No se pudo obtener el estado.");
        } finally {
            setLoading(false);
        }
    };

    if (loading && !status) return <div>Cargando estado...</div>;
    if (error) return <div style={{ color: 'red' }}>{error}</div>;

    if (!status || status.estado === 'SIN_SOLICITUD') {
        return (
            <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px', textAlign: 'center' }}>
                <h3>Sin Solicitudes Activas</h3>
                <p>No tienes ninguna bicicleta en proceso de ingreso.</p>
                {/* Aquí luego pondremos botón para ir a Escanear */}
            </div>
        );
    }

    // Mapeo de colores/textos según estado
    let color = '#666';
    let texto = status.estado;

    if (status.estado === 'ESPERANDO_CONFIRMACION') {
        color = '#ffc107'; // Amarillo Warning
        texto = "Esperando Confirmación del Guardia";
    } else if (status.estado === 'APROBADO' || status.estado === 'INGRESADO') { // Ajustar según ENUM real
        color = '#28a745'; // Verde
        texto = "Bicicleta Ingresada";
    } else if (status.estado === 'SOLICITANDO_RETIRO') {
        color = '#17a2b8'; // Azul Info
        texto = "Solicitando Retiro";
    }

    return (
        <div style={{ padding: '20px', border: '2px solid ' + color, borderRadius: '8px', backgroundColor: '#fff', marginTop: '20px' }}>
            <h2 style={{ color: color }}>{texto}</h2>

            <div style={{ marginTop: '15px' }}>
                <p><strong>Hora Ingreso:</strong> {new Date(status.horaIngreso).toLocaleString()}</p>
                <p><strong>Ubicación:</strong> {status.bicicletero || 'Desconocida'}</p>
                {status.casillero && <p><strong>Casillero:</strong> {status.casillero}</p>}
            </div>

            {status.estado === 'ESPERANDO_CONFIRMACION' && (
                <p style={{ fontStyle: 'italic', marginTop: '10px', color: '#666' }}>
                    Por favor, espera a que el guardia verifique tu bicicleta.
                </p>
            )}
        </div>
    );
}

export default StatusCheckin;
