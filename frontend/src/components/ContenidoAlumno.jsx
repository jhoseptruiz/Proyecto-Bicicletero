import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import EstadoCheckin from '../components/alumno/EstadoCheckin';
import MapaAlumno from '../components/alumno/MapaAlumno';
import Scanner from '../components/alumno/Scanner'; // Importamos el Scanner directamente

function ContenidoAlumno({ alIrAlPerfil }) {
    const [view, setView] = useState('dashboard'); // 'dashboard' | 'scan'
    const [scanProps, setScanProps] = useState({}); // Para pasar datos como preSelectedBicicletero

    const [portalContainer, setPortalContainer] = useState(null);

    useEffect(() => {
        const slot = document.getElementById('mobile-action-slot');
        if (slot) {
            setPortalContainer(slot);
        } else {
            const timer = setTimeout(() => {
                const retrySlot = document.getElementById('mobile-action-slot');
                if (retrySlot) setPortalContainer(retrySlot);
            }, 100);
            return () => clearTimeout(timer);
        }
    }, []);

    const [status, setStatus] = useState(null);

    // Fetch status check for validations
    const verificarEstado = async () => {
        try {
            const { getCheckinStatus } = await import('../services/checkin.service');
            const resp = await getCheckinStatus();
            setStatus(resp.data); // { estado: 'pendiente', ... }
        } catch (e) {
            console.error("Error validando estado para scanner:", e);
        }
    };

    useEffect(() => {
        verificarEstado();
        // Polling para mantener sincronizado el boton
        const interval = setInterval(verificarEstado, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleOpenScan = async (props = {}) => {
        // Validación Preventiva (Frontend)
        if (status) {
            if (status.estado === 'pendiente') {
                alert("⚠️ Ya tienes una solicitud pendiente. Espera a que el guardia la apruebe.");
                return;
            }
            if (status.estado === 'solicitando_retiro') {
                alert("⚠️ Ya has solicitado el retiro. Dirígete a la salida.");
                return;
            }
        }

        // Refrescar estado antes de abrir
        await verificarEstado();

        setScanProps(props);
        setView('scan');
    };

    const handleCloseScan = () => {
        setView('dashboard');
        setScanProps({});
    };

    if (view === 'scan') {
        return (
            <div className="fade-in">
                <button onClick={handleCloseScan} style={{ marginBottom: 15, background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '1rem' }}>
                    ← Volver al Mapa
                </button>
                <div style={{ maxWidth: 600, margin: '0 auto' }}>
                    <Scanner alCerrar={handleCloseScan} alIrAlPerfil={alIrAlPerfil} {...scanProps} />
                </div>
            </div>
        );
    }

    return (
        <div className="bicicleteros-layout fade-in">
            <div className="map-column">
                <div className="card-container" style={{ height: 'calc(100vh - 180px)', padding: 0, overflow: 'hidden' }}>
                    <MapaAlumno onMarkerClick={(bici) => handleOpenScan({ preSelectedBicicletero: bici })} />
                </div>
            </div>

            <div className="form-column">
                <div className="admin-form card-container">
                    <h3>Estado Actual</h3>
                    <EstadoCheckin onScan={handleOpenScan} />
                </div>
            </div>

            {portalContainer && status &&
                (status.estado === 'SIN_SOLICITUD' || status.estado === 'INGRESADO' || status.estado === 'activo' || status.estado === 'ingresado') && (
                    ReactDOM.createPortal(
                        <button
                            className="fab-button pop-in"
                            onClick={() => handleOpenScan()}
                            style={{ animation: 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards' }}
                        >
                            Escanear
                        </button>,
                        portalContainer
                    )
                )}
        </div>
    );
}

export default ContenidoAlumno;
