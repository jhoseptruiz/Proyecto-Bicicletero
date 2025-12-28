import React from 'react';

const API_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:3000/api'; 
const getFotoUrl = (url) => {
  if (!url) return "https://via.placeholder.com/150?text=Sin+Foto";
  if (url.startsWith('http')) return url;
  const baseUrl = API_URL.replace('/api', ''); 
  return `${baseUrl}/${url}`;
};

// AHORA RECIBIMOS "onFinalizar" TAMBIÉN
const Solicitudes = ({ solicitudes, onAprobar, onRechazar, onFinalizar }) => {
  
  if (solicitudes.length === 0) {
    return <div className="empty-state">No hay solicitudes pendientes.</div>;
  }

  return (
    <>
      {solicitudes.map((sol, index) => {
        // DETERMINAR TIPO DE SOLICITUD
        const esIngreso = sol.estado === 'pendiente';
        const tipoTexto = esIngreso ? 'INGRESO' : 'RETIRO';
        const tipoColor = esIngreso ? '#27ae60' : '#e67e22'; // Verde vs Naranja

        return (
          <div 
            key={sol.id} 
            className="card-registro fade-in-card"
            style={{ 
              animationDelay: `${index * 0.1}s`,
              borderLeft: `5px solid ${tipoColor}` // Borde de color según tipo
            }} 
          >
            <img src={getFotoUrl(sol.bicicleta.fotoUrl)} alt="Bici" className="card-img" />
            
            <div className="card-details">
              {/* BADGE DE TIPO DE SOLICITUD */}
              <div style={{
                  background: tipoColor, color: 'white', padding: '2px 8px', 
                  borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold',
                  width: 'fit-content', marginBottom: '5px'
              }}>
                  SOLICITUD DE {tipoTexto}
              </div>

              <h3>{sol.usuario.nombre} {sol.usuario.apellido}</h3>
              <p className="rut-text">{sol.usuario.rut}</p>
              <p className="brand-text">Marca: {sol.bicicleta.marca}</p>
              
              {/* Si es salida, mostramos casillero actual */}
              {!esIngreso && (
                 <div className="casillero-badge">{sol.casillero}</div>
              )}

              <p className="time-text">
                Hora: {new Date(esIngreso ? sol.fechaIngreso : (sol.updated_at || sol.fechaIngreso)).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
              </p>
              
              <div className="card-actions">
                {esIngreso ? (
                  /* --- BOTONES PARA INGRESO --- */
                  <>
                    <button className="btn-action btn-approve" onClick={() => onAprobar(sol.id)}>
                      Asignar Casillero
                    </button>
                    <button className="btn-action btn-reject" onClick={() => onRechazar(sol.id)}>
                      Rechazar
                    </button>
                  </>
                ) : (
                  /* --- BOTONES PARA SALIDA --- */
                  <button className="btn-action btn-finish" onClick={() => onFinalizar(sol.id)}>
                    Confirmar Salida
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
};

export default Solicitudes;