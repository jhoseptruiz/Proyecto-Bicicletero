import React from 'react';
import { useNavigate } from 'react-router-dom';

function GuardiaPanel() {
  const navigate = useNavigate();

  const handleLogout = () =>{
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div>
      <button onClick={handleLogout} style={{float:'right'}}>Cerrar sesión</button>
      <h1>Panel del Guardia</h1>
      <p>Bienvenido, Guardia. Aquí gestionarás los check-ins manuales.</p>
    </div>
  );
}

export default GuardiaPanel;