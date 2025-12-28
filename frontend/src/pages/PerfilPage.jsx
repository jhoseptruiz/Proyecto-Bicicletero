// frontend/src/pages/PerfilPage.jsx

import React from 'react';
import { Link } from 'react-router-dom';
import GestionBicicletas from '../components/GestionBicicletas.jsx';

import PerfilContent from '../components/PerfilContent';

function PerfilPage() {
  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: 'auto' }}>
      <Link to="/alumno">{"<"} Volver al Home</Link>
      <div style={{ marginTop: '20px' }}>
        <PerfilContent />
      </div>
    </div>
  );
}

export default PerfilPage;