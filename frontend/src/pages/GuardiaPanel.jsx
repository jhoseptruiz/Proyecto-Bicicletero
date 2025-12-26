import React, { useState, useEffect } from 'react';
import { 
  getMisBicicleteros, 
  getSolicitudes, 
  getActivos, 
  aprobarIngreso, 
  rechazarIngreso, 
  finalizarEstadia 
} from '../services/guardia.service';
import './GuardiaPanel.css';

// URL base para las fotos
const API_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:3000/api'; 

const getFotoUrl = (url) => {
  if (!url) return "https://via.placeholder.com/150?text=Sin+Foto";
  if (url.startsWith('http')) return url;
  const baseUrl = API_URL.replace('/api', ''); 
  return `${baseUrl}/${url}`;
};

const GuardiaPanel = () => {
  // --- ESTADOS ---
  const [misBicicleteros, setMisBicicleteros] = useState([]);
  const [bicicleteroActual, setBicicleteroActual] = useState(null);
  const [solicitudes, setSolicitudes] = useState([]);
  const [activos, setActivos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados para el Modal Visual
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState(null); 

  // --- CARGA DE DATOS ---
  useEffect(() => {
    async function init() {
      try {
        const bicis = await getMisBicicleteros();
        setMisBicicleteros(bicis);
        if (bicis.length > 0) {
          setBicicleteroActual(bicis[0]);
        }
      } catch (error) {
        console.error("Error inicializando:", error);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (bicicleteroActual) {
      cargarDatosDelBicicletero(bicicleteroActual.id);
    }
  }, [bicicleteroActual]);

  const cargarDatosDelBicicletero = async (id) => {
    try {
      setLoading(true);
      const [pendientesData, activosData] = await Promise.all([
        getSolicitudes(id),
        getActivos(id)
      ]);
      setSolicitudes(pendientesData);
      setActivos(activosData);
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBicicleteroChange = (e) => {
    const idSeleccionado = parseInt(e.target.value);
    const seleccionado = misBicicleteros.find(b => b.id === idSeleccionado);
    setBicicleteroActual(seleccionado);
  };

  // --- ACCIONES ---

  // 1. Abrir Modal para Aprobar
  const abrirModalSeleccion = (solicitudId) => {
    setSolicitudSeleccionada(solicitudId);
    setIsModalOpen(true);
  };

  // 2. Lógica al hacer click en un circulito AZUL
  const handleSeleccionarCasillero = async (casilleroId) => {
    if (!window.confirm(`¿Asignar bicicleta al casillero [ ${casilleroId} ]?`)) return;

    try {
      await aprobarIngreso(solicitudSeleccionada, casilleroId);
      
      setIsModalOpen(false);
      setSolicitudSeleccionada(null);
      // Actualizamos contador localmente para feedback instantáneo
      setBicicleteroActual(prev => ({...prev, bicicletasGuardadas: prev.bicicletasGuardadas + 1}));
      cargarDatosDelBicicletero(bicicleteroActual.id);
      
    } catch (error) {
      alert(`❌ Error al aprobar: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleRechazar = async (solicitudId) => {
    const motivo = prompt("Ingrese motivo del rechazo:");
    if (!motivo) return;
    try {
      await rechazarIngreso(solicitudId, motivo);
      cargarDatosDelBicicletero(bicicleteroActual.id);
    } catch (error) {
      alert("Error al rechazar");
    }
  };

  const handleFinalizar = async (registroId) => {
    if(!window.confirm("¿Confirmar que el usuario retira su bicicleta?")) return;
    try {
      await finalizarEstadia(registroId);
      setBicicleteroActual(prev => ({...prev, bicicletasGuardadas: prev.bicicletasGuardadas - 1}));
      cargarDatosDelBicicletero(bicicleteroActual.id);
    } catch (error) {
      alert("Error al finalizar estadía");
    }
  };

  // --- GENERADOR DE LA GRILLA VISUAL ---
  const renderMapaCasilleros = () => {
    if (!bicicleteroActual) return null;

    const capacidad = bicicleteroActual.capacidad;
    const casillerosOcupados = new Set(activos.map(a => a.casillero)); 
    const grupos = [];
    
    for (let i = 0; i < capacidad; i++) {
      const grupoIndex = Math.floor(i / 5);
      const numeroEnGrupo = (i % 5) + 1;
      const letraGrupo = String.fromCharCode(65 + grupoIndex); 
      const idCasillero = `${letraGrupo}-${numeroEnGrupo}`; 

      if (!grupos[grupoIndex]) {
        grupos[grupoIndex] = { letra: letraGrupo, slots: [] };
      }

      const ocupado = casillerosOcupados.has(idCasillero);

      grupos[grupoIndex].slots.push(
        <button
          key={idCasillero}
          className={`slot-btn ${ocupado ? 'slot-ocupado' : 'slot-libre'}`}
          disabled={ocupado}
          onClick={() => !ocupado && handleSeleccionarCasillero(idCasillero)}
          title={ocupado ? 'Ocupado' : 'Disponible'}
        >
          {numeroEnGrupo}
        </button>
      );
    }

    return (
      <div className="casilleros-grid">
        {grupos.map((grupo) => (
          <div key={grupo.letra} className="grupo-container">
            <div className="grupo-title">Grupo {grupo.letra}</div>
            <div className="grupo-slots">{grupo.slots}</div>
          </div>
        ))}
      </div>
    );
  };

  // --- RENDERIZADO PRINCIPAL ---
  if (loading && !bicicleteroActual) return <div className="guardia-container"><h1>Cargando...</h1></div>;
  if (misBicicleteros.length === 0) return <div className="guardia-container"><h1>No tienes bicicleteros asignados.</h1></div>;

  return (
    <div className="guardia-container">
      <header className="header-panel">
        <div className="header-info">
          <h1>Panel de Guardia</h1>
          <div className="selector-container">
            <label>Gestionando:</label>
            <select 
              className="bicicletero-select" 
              value={bicicleteroActual?.id || ''} 
              onChange={handleBicicleteroChange}
            >
              {misBicicleteros.map(b => (
                <option key={b.id} value={b.id}>
                  {b.ubicacion} (ID: {b.id})
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="capacity-badge">
           Capacidad: <strong>{bicicleteroActual?.bicicletasGuardadas} / {bicicleteroActual?.capacidad}</strong>
        </div>
        <button className="btn-refresh" onClick={() => cargarDatosDelBicicletero(bicicleteroActual.id)}>Actualizar ↻</button>
      </header>

      <div className="panel-grid">
        {/* SOLICITUDES */}
        <section className="column">
          <h2>🔔 Solicitudes ({solicitudes.length})</h2>
          {solicitudes.length === 0 ? <p className="empty-msg">Sin solicitudes pendientes.</p> : (
            solicitudes.map(sol => (
              <div key={sol.id} className="card-item">
                <div className="card-content">
                  <img src={getFotoUrl(sol.bicicleta.fotoUrl)} alt="Bici" className="bike-photo-large" />
                  <div className="card-info">
                    <h3>{sol.usuario.nombre} {sol.usuario.apellido}</h3>
                    <p className="rut">{sol.usuario.rut}</p>
                    <p>Bicicleta: <strong>{sol.bicicleta.marca}</strong></p>
                    <span className="badge badge-pendiente">Requiere Ingreso</span>
                  </div>
                </div>
                <div className="actions-area">
                  <button className="btn btn-approve" onClick={() => abrirModalSeleccion(sol.id)}>
                    ✔ Asignar Casillero
                  </button>
                  <button className="btn btn-reject" onClick={() => handleRechazar(sol.id)} style={{marginTop:'5px'}}>
                    ✖ Rechazar
                  </button>
                </div>
              </div>
            ))
          )}
        </section>

        {/* EN CUSTODIA (Modificado aquí) */}
        <section className="column">
          <h2>🚲 En Custodia ({activos.length})</h2>
          {activos.length === 0 ? <p className="empty-msg">El bicicletero está vacío.</p> : (
            activos.map(activo => (
              <div key={activo.id} className="card-item active-card">
                <div className="card-content">
                  <img src={getFotoUrl(activo.bicicleta.fotoUrl)} alt="Bici" className="bike-photo-large" />
                  <div className="card-info">
                    <div className="casillero-tag">
                      <span className="label">Casillero:</span>
                      <span className="value">{activo.casillero}</span>
                    </div>
                    <p><strong>{activo.usuario.nombre} {activo.usuario.apellido}</strong></p>
                    {/* --- NUEVA LÍNEA AGREGADA: MARCA --- */}
                    <p style={{color: '#1e3c72', fontWeight:'600'}}>Bicicleta: {activo.bicicleta.marca}</p>
                    {/* ----------------------------------- */}
                    <p className="rut">{activo.usuario.rut}</p>
                    <p className="time">Ingreso: {new Date(activo.fechaIngreso).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                  </div>
                </div>
                <button className="btn btn-finish" onClick={() => handleFinalizar(activo.id)}>
                  📤 Marcar Salida / Entregar
                </button>
              </div>
            ))
          )}
        </section>
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Selecciona un Casillero</h2>
            <p>Selecciona una ubicación <strong>azul</strong> para asignar la bicicleta.</p>
            
            <div className="leyenda">
              <span><span className="dot" style={{background:'#007bff'}}></span>Disponible</span>
              <span><span className="dot" style={{background:'#dc3545'}}></span>Ocupado</span>
            </div>

            {renderMapaCasilleros()}

            <button className="btn-close-modal" onClick={() => setIsModalOpen(false)}>Cancelar Operación</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuardiaPanel;