// frontend/src/pages/AlumnoHome.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EstadoCheckin from '../components/alumno/EstadoCheckin';
import MapaAlumno from '../components/alumno/MapaAlumno';
import SidebarAlumno from '../components/alumno/SidebarAlumno';
import './AdminDashboard.css'; // Reutilizamos estilos del Admin para consistencia

function AlumnoHome() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleTabChange = (tab) => {
    if (tab === 'perfil') {
      navigate('/perfil');
    } else {
      setActiveTab(tab);
    }
  };

  return (
    <div className="admin-layout">
      {/* Sidebar con estilo unificado */}
      <SidebarAlumno
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        onLogout={handleLogout}
      />

      <main className="main-content">

        {activeTab === 'dashboard' && (
          <div className="bicicleteros-layout fade-in">

            {/* Columna Izquierda: Mapa (2/3) */}
            <div className="map-column">
              <div className="card-container" style={{ height: 'calc(100vh - 180px)', padding: 0, overflow: 'hidden' }}>
                <MapaAlumno />
              </div>
            </div>

            {/* Columna Derecha: Estado (1/3) */}
            <div className="form-column">
              <div className="admin-form card-container">
                <h3>Estado Actual</h3>
                <EstadoCheckin />
              </div>
            </div>

            {/* Botón Flotante para Escaneo */}
            <div className="fab-container">
              <button className="fab-button" onClick={() => navigate('/scan')}>
                📷 Escanear QR
              </button>
            </div>


          </div>
        )}
      </main>
    </div>
  );
}

export default AlumnoHome;