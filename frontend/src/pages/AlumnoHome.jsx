// frontend/src/pages/AlumnoHome.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EstadoCheckin from '../components/alumno/EstadoCheckin';
import MapaAlumno from '../components/alumno/MapaAlumno';
import Sidebar from '../components/Sidebar';
import './AdminDashboard.css'; // Reutilizamos estilos del Admin para consistencia

{ activeTab === 'dashboard' && <ContenidoAlumno alIrAlPerfil={() => setActiveTab('perfil')} /> }
import PerfilContent from '../components/PerfilContent';

function AlumnoHome() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  return (
    <div className="admin-layout">
      <Sidebar
        role="alumno"
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        onLogout={handleLogout}
      />

      <main className="main-content">
        {activeTab === 'dashboard' && (
          <AlumnoContent onGoToProfile={() => setActiveTab('perfil')} />
        )}
        {activeTab === 'perfil' && <PerfilContent />}
      </main>
    </div>
  );
}

export default AlumnoHome;