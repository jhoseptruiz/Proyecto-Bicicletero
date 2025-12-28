import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import EstadoCheckin from '../components/alumno/EstadoCheckin';
import MapaAlumno from '../components/alumno/MapaAlumno';
import Scanner from '../components/alumno/Scanner'; // Importamos el Scanner directamente

function ContenidoAlumno({ alIrAlPerfil }) {
    const [view, setView] = useState('dashboard'); // 'dashboard' | 'scan'
    const [scanProps, setScanProps] = useState({}); // Para pasar datos como preSelectedBicicletero


    useEffect(() => {
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

    const handleOpenScan = (props = {}) => {
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
                    <EstadoCheckin />
                </div>
            </div>

            {portalContainer &&
                ReactDOM.createPortal(
                    <button className="fab-button" onClick={() => handleOpenScan()}>
                        Escanear
                    </button>,
                    portalContainer
                )
            }
        </div>
    );
}

export default ContenidoAlumno;
