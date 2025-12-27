import React, { useState, useEffect } from 'react';
import { getCheckinStatus } from '../../services/checkin.service';

function StatusCheckin() {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        cargarStatus();
        // Polling: Consultar estado cada 5 seg por si el guardia aprueba
        const intervalo = setInterval(cargarStatus, 5000);
        return () => clearInterval(intervalo);
    }, []);

    const cargarStatus = async () => {
        try {
            const resp = await getCheckinStatus();
            setStatus(resp.data);
            setError(null);
        } catch (err) {
            console.error("Error status", err);
            setError("No se pudo obtener el estado.");
        } finally {
            setLoading(false);
        }
    };

    if (loading && !status) return <div>Cargando estado...</div>;
    if (error) return <div style={{ color: 'red' }}>{error}</div>;

    if (!status || status.estado === 'SIN_SOLICITUD') {
        return (
            <div className="status-content">
                <div style={{ textAlign: 'center', padding: '20px' }}>
                    <h3 style={{ color: '#666' }}>Sin Solicitudes Activas</h3>
                    <p style={{ color: '#999' }}>No tienes ninguna bicicleta en proceso de ingreso.</p>
                </div>
            </div>
        );
    }

    // Mapeo de estilos según estado
    let badgeClass = 'badge mantenimiento'; // Default
    let texto = status.estado;

    if (status.estado === 'ESPERANDO_CONFIRMACION') {
        badgeClass = 'badge mantenimiento'; // Naranja/Warning
        texto = "Esperando Confirmación";
    } else if (status.estado === 'APROBADO' || status.estado === 'INGRESADO' || status.estado === 'activo') {
        badgeClass = 'badge operativo'; // Verde/Success
        texto = "Ingresado";
    } else if (status.estado === 'SOLICITANDO_RETIRO' || status.estado === 'solicitando_retiro') {
        badgeClass = 'badge';
        // Usamos estilo base por ahora
    }

    // Reutilizamos estructura de cards del Admin para consistencia

    return (
        <div className="status-content">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                <span className={`badge ${status.estado === 'activo' || status.estado === 'INGRESADO' ? 'operativo' : 'mantenimiento'}`}>
                    {status.estado.replace('_', ' ')}
                </span>
            </div>

            <div className="admin-form">
                <div className="form-group" style={{ marginBottom: '10px' }}>
                    <label>Hora Ingreso:</label>
                    <input type="text" value={new Date(status.horaIngreso).toLocaleString()} readOnly />
                </div>

                <div className="grid-2-col">
                    <div>
                        <label>Ubicación:</label>
                        <input type="text" value={status.bicicletero || 'Desconocida'} readOnly />
                    </div>
                    <div>
                        <label>Casillero:</label>
                        <input type="text" value={status.casillero || '-'} readOnly />
                    </div>
                </div>
            </div>

            {status.estado === 'ESPERANDO_CONFIRMACION' && (
                <p className="help-text">
                    El guardia debe aprobar tu ingreso.
                </p>
            )}
        </div>
    );
}

export default StatusCheckin;
