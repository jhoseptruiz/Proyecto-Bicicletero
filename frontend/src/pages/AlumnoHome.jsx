import React from 'react';
import { useNavigate } from 'react-router-dom';

function AlumnoHome() {
  const navigate = useNavigate();

  const handleLogout = () =>{
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div>
      <button onClick={handleLogout} style={{float:'right'}}>Cerrar Sesión</button>
      <h1>Plataforma de Alumno</h1>
      <p>Bienvenido, Alumno. Aquí verás el mapa de bicicleteros.</p>
    </div>
  );
}

export default AlumnoHome;