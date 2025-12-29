import React, { useState, useEffect } from 'react';
import { getCheckinStatus, cancelCheckin } from '../../services/checkin.service';

function StatusCheckin({ onScan }) {
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

    const handleCancelar = async () => {
        if (!window.confirm("¿Seguro que quieres cancelar?")) return;
        try {
            await cancelCheckin();
            alert("Solicitud cancelada exitosamente");
            cargarStatus(); // Recargar inmediato
        } catch (error) {
            alert(error.message);
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

    // --- RENDERIZADO: DISEÑO DE TARJETA CONCISO ---
    const bicicleta = status.bicicleta || {};
    const imagenBici = bicicleta.foto
        ? `http://localhost:3000${bicicleta.foto}`
        : 'https://via.placeholder.com/150?text=Bici';

    return (
        <div className="status-card-compact" style={{
            background: 'white',
            borderRadius: '12px',
            padding: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
        }}>
            {/* Cabecera: Estado y Bicicletero */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className={`badge ${['activo', 'ingresado', 'INGRESADO'].includes(status.estado) ? 'operativo' : 'mantenimiento'}`}
                    style={{ fontSize: '0.85rem', padding: '4px 8px' }}>
                    {status.estado.replace('_', ' ').toUpperCase()}
                </span>
                <span style={{ fontSize: '0.85rem', color: '#666', fontWeight: '500' }}>
                    📍 {status.bicicletero || 'Desconocido'}
                </span>
            </div>

            {/* Contenido Principal: Imagen + Datos Clave */}
            <div style={{ display: 'flex', gap: '12px' }}>
                {/* Imagen Cuadrada */}
                <div style={{ width: '70px', height: '70px', flexShrink: 0 }}>
                    <img
                        src={imagenBici}
                        alt="Mi Bicicleta"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px', border: '1px solid #eee' }}
                    />
                </div>

                {/* Detalles Concisos */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', fontSize: '0.9rem' }}>
                    <div style={{ fontWeight: 'bold', color: '#333' }}>
                        {bicicleta.marca} {bicicleta.modelo}
                    </div>
                    {status.casillero && (
                        <div style={{ color: '#007bff', fontWeight: '600', marginTop: '2px' }}>
                            Casillero: #{status.casillero}
                        </div>
                    )}
                    <div style={{ color: '#888', fileSize: '0.8rem', marginTop: '2px' }}>
                        🕒 {new Date(status.horaIngreso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                </div>
            </div>

            {/* Botones de Acción */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                {(status.estado === 'pendiente' || status.estado === 'solicitando_retiro') && (
                    <button onClick={handleCancelar} className="btn-action-cancel" style={{ flex: 1, background: '#fee2e2', color: '#b91c1c', border: 'none', padding: '8px', borderRadius: '6px', fontWeight: '600' }}>
                        ❌ Cancelar
                    </button>
                )}

                {['activo', 'ingresado', 'INGRESADO'].includes(status.estado) && (
                    <button onClick={() => onScan({ action: 'retirar' })} className="btn-action-withdraw" style={{ flex: 1, background: '#fef3c7', color: '#b45309', border: 'none', padding: '8px', borderRadius: '6px', fontWeight: '600' }}>
                        📤 Retirar
                    </button>
                )}
            </div>

            {status.estado === 'pendiente' && (
                <div style={{ fontSize: '0.75rem', color: '#666', textAlign: 'center', background: '#f8f9fa', padding: '4px', borderRadius: '4px' }}>
                    ⏳ Esperando aprobación del guardia...
                </div>
            )}
        </div>
    );
}

export default StatusCheckin;
