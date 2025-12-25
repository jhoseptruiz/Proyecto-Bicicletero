// frontend/src/pages/AlumnoHome.jsx

import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import StatusCheckin from '../components/StatusCheckin';

function AlumnoHome() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div style={{ padding: '20px' }}>
      <button onClick={handleLogout} style={{ float: 'right' }}>Cerrar Sesión</button>
      <h1>Plataforma de Alumno</h1>

      <div style={{ marginBottom: '20px' }}>
        <Link to="/perfil">
          <button style={{ marginRight: '10px' }}>Mi Perfil</button>
        </Link>
        <Link to="/scan">
          <button style={{ backgroundColor: '#007bff', color: 'white' }}>📷 Escanear QR</button>
        </Link>
      </div>

      <hr />

      <StatusCheckin />

      <p style={{ marginTop: '20px' }}>Bienvenido, Alumno. Aquí verás el mapa de bicicleteros.</p>
    </div>
  );
}

export default AlumnoHome;