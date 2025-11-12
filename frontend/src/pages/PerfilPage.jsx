// frontend/src/pages/PerfilPage.jsx

import React from 'react';
import { Link } from 'react-router-dom';
import GestionBicicletas from '../components/GestionBicicletas.jsx';

function PerfilPage() {
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : {};

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: 'auto' }}>
      <Link to="/alumno">{"<"} Volver al Home</Link>
      <h1>Mi Perfil</h1>
      
      {/* Sección de Información del Usuario */}
      <div style={{ marginBottom: '20px' }}>
        <h3>Información Personal</h3>
        <p><strong>RUT:</strong> {user.sub}</p>
        <p><strong>Email:</strong> {user.email}</p>
      </div>

      <hr />

      <GestionBicicletas />
      
    </div>
  );
}

export default PerfilPage;