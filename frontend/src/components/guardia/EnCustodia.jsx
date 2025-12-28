import React from 'react';

// Helper para las fotos
const API_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:3000/api'; 
const getFotoUrl = (url) => {
  if (!url) return "https://via.placeholder.com/150?text=Sin+Foto";
  if (url.startsWith('http')) return url;
  const baseUrl = API_URL.replace('/api', ''); 
  return `${baseUrl}/${url}`;
};

const EnCustodia = ({ activos, onCambiarCasillero, onFinalizar }) => {
  if (activos.length === 0) {
    return <div className="empty-state">El bicicletero está vacío.</div>;
  }

  return (
    <>
      {activos.map(activo => (
        <div key={activo.id} className="card-registro active-card">
          <div className="casillero-badge">{activo.casillero}</div>
          <img src={getFotoUrl(activo.bicicleta.fotoUrl)} alt="Bici" className="card-img" />
          <div className="card-details">
            <h3>{activo.usuario.nombre} {activo.usuario.apellido}</h3>
            <p className="rut-text">{activo.usuario.rut}</p>
            <p className="brand-text">Bici: {activo.bicicleta.marca}</p>
            <p className="time-text">
              Entrada: {new Date(activo.fechaIngreso).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
            </p>
            
            <div className="card-actions">
              <button className="btn-action btn-change" onClick={() => onCambiarCasillero(activo.id)}>
                Cambiar Casillero
              </button>
              <button className="btn-action btn-finish" onClick={() => onFinalizar(activo.id)}>
                Finalizar / Salida
              </button>
            </div>
          </div>
        </div>
      ))}
    </>
  );
};

export default EnCustodia;