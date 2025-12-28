import React from 'react';

// Helper para las fotos
const API_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:3000/api'; 
const getFotoUrl = (url) => {
  if (!url) return "https://via.placeholder.com/150?text=Sin+Foto";
  if (url.startsWith('http')) return url;
  const baseUrl = API_URL.replace('/api', ''); 
  return `${baseUrl}/${url}`;
};

const Solicitudes = ({ solicitudes, onAprobar, onRechazar }) => {
  if (solicitudes.length === 0) {
    return <div className="empty-state">No hay solicitudes pendientes.</div>;
  }

  return (
    <>
      {solicitudes.map((sol, index) => (
        <div 
          key={sol.id} 
          className="card-registro fade-in-card"
          style={{ animationDelay: `${index * 0.1}s` }} // Efecto cascada
        >
          <img src={getFotoUrl(sol.bicicleta.fotoUrl)} alt="Bici" className="card-img" />
          
          <div className="card-details">
            <h3>{sol.usuario.nombre} {sol.usuario.apellido}</h3>
            <p className="rut-text">{sol.usuario.rut}</p>
            <p className="brand-text">Marca: {sol.bicicleta.marca}</p>
            <p className="time-text">
              Solicitud: {new Date(sol.fechaIngreso).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
            </p>
            
            <div className="card-actions">
              <button className="btn-action btn-approve" onClick={() => onAprobar(sol.id)}>
                Asignar Casillero
              </button>
              <button className="btn-action btn-reject" onClick={() => onRechazar(sol.id)}>
                Rechazar
              </button>
            </div>
          </div>
        </div>
      ))}
    </>
  );
};

export default Solicitudes;