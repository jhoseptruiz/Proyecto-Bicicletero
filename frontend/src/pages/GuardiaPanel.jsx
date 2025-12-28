import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// Asegúrate de usar la opción correcta de logout según tu servicio:
// Opción A (si tienes export const logout): import { logout } from '../services/auth.service';
// Opción B (manual, ver abajo en handleLogout)

import { 
  getMisBicicleteros, 
  getSolicitudes, 
  getActivos, 
  aprobarIngreso, 
  rechazarIngreso, 
  finalizarEstadia,
  modificarUbicacion 
} from '../services/guardia.service';

import SidebarGuardia from '../components/guardia/SidebarGuardia';
import Solicitudes from '../components/guardia/Solicitudes';
import EnCustodia from '../components/guardia/EnCustodia';
import CasilleroModal from '../components/guardia/CasilleroModal';

// 1. IMPORTANTE: Importamos el CSS compartido PRIMERO
import './AdminDashboard.css'; 
// 2. Importamos el CSS específico del guardia (ya limpio) DESPUÉS
import './GuardiaPanel.css'; 

const GuardiaPanel = () => {
  const navigate = useNavigate();

  // Estados
  const [misBicicleteros, setMisBicicleteros] = useState([]);
  const [bicicleteroActual, setBicicleteroActual] = useState(null);
  const [solicitudes, setSolicitudes] = useState([]);
  const [activos, setActivos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('solicitudes');
  
  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null); 
  const [modalMode, setModalMode] = useState('aprobar');

  // Inicialización
  useEffect(() => {
    async function init() {
      try {
        const bicis = await getMisBicicleteros();
        setMisBicicleteros(bicis);
        if (bicis.length > 0) setBicicleteroActual(bicis[0]);
      } catch (error) {
        console.error("Error init:", error);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (bicicleteroActual) {
      cargarDatos(bicicleteroActual.id);
    }
  }, [bicicleteroActual]);

  const cargarDatos = async (id) => {
    try {
      setLoading(true);
      const [pendientes, enCustodia] = await Promise.all([
        getSolicitudes(id),
        getActivos(id)
      ]);
      setSolicitudes(pendientes);
      setActivos(enCustodia);
    } catch (error) {
      console.error("Error loading:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handlers
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleBicicleteroChange = (e) => {
    const id = parseInt(e.target.value);
    setBicicleteroActual(misBicicleteros.find(b => b.id === id));
  };

  // Modal Logic
  const abrirModalAprobar = (id) => {
    setSelectedItem(id);
    setModalMode('aprobar');
    setIsModalOpen(true);
  };

  const abrirModalCambiar = (id) => {
    setSelectedItem(id);
    setModalMode('cambiar');
    setIsModalOpen(true);
  };

  const handleSeleccionarCasillero = async (casilleroId) => {
    const esAprobar = modalMode === 'aprobar';
    const accionTexto = esAprobar ? 'Asignar' : 'Mover';
    
    if (!window.confirm(`¿${accionTexto} bicicleta al casillero [ ${casilleroId} ]?`)) return;

    try {
      if (esAprobar) {
        await aprobarIngreso(selectedItem, casilleroId);
        setBicicleteroActual(prev => ({...prev, bicicletasGuardadas: prev.bicicletasGuardadas + 1}));
      } else {
        await modificarUbicacion(selectedItem, casilleroId);
      }
      setIsModalOpen(false);
      setSelectedItem(null);
      cargarDatos(bicicleteroActual.id);
    } catch (error) {
      alert(` Error: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleRechazar = async (id) => {
    const motivo = prompt("Ingrese motivo del rechazo:");
    if (!motivo) return;
    try {
      await rechazarIngreso(id, motivo);
      cargarDatos(bicicleteroActual.id);
    } catch (error) { alert(` Error: ${error.response?.data?.message || error.message}`); }
  };

  const handleFinalizar = async (id) => {
    if(!window.confirm("¿Confirmar salida?")) return;
    try {
      await finalizarEstadia(id);
      setBicicleteroActual(prev => ({...prev, bicicletasGuardadas: prev.bicicletasGuardadas - 1}));
      cargarDatos(bicicleteroActual.id);
    } catch (error) { alert(` Error: ${error.response?.data?.message || error.message}`); }
  };

  if (loading && !bicicleteroActual) return <div className="admin-layout"><p style={{padding:30}}>Cargando...</p></div>;

  return (
    /* Usamos 'admin-layout' para que herede la estructura de tus compañeros */
    <div className="admin-layout">
      
      <SidebarGuardia 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={handleLogout} 
      />

      <main className="main-content">
        
        {/* Usamos 'section-header' si existe en AdminDashboard.css, o estilizamos inline para evitar conflictos */}
        <div style={{ 
          background: 'white', padding: '20px', borderRadius: '12px', marginBottom: '20px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' 
        }}>
            <div>
                <h2 style={{ margin: 0, color: '#2c3e50', fontSize: '1.5rem' }}>
                    {activeTab === 'solicitudes' ? 'Gestionar Solicitudes' : 'Bicicletas en Custodia'}
                </h2>
                <p style={{ margin: '5px 0 0', color: '#666' }}>
                    Ocupación: <strong>{bicicleteroActual?.bicicletasGuardadas} / {bicicleteroActual?.capacidad}</strong>
                </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <select 
                    style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }}
                    value={bicicleteroActual?.id || ''} 
                    onChange={handleBicicleteroChange}
                >
                    {misBicicleteros.map(b => (
                        <option key={b.id} value={b.id}>{b.ubicacion}</option>
                    ))}
                </select>
                <button 
                  onClick={() => cargarDatos(bicicleteroActual.id)}
                  style={{ background: '#e0e0e0', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer' }}
                >
                  ↻
                </button>
            </div>
        </div>

        {/* Aquí usamos nuestra clase cards-grid que definimos en GuardiaPanel.css (ya limpia) */}
        <div className="cards-grid">
            {activeTab === 'solicitudes' ? (
                <Solicitudes 
                    solicitudes={solicitudes} 
                    onAprobar={abrirModalAprobar} 
                    onRechazar={handleRechazar} 
                />
            ) : (
                <EnCustodia 
                    activos={activos} 
                    onCambiarCasillero={abrirModalCambiar} 
                    onFinalizar={handleFinalizar} 
                />
            )}
        </div>

      </main>

      <CasilleroModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        capacidad={bicicleteroActual?.capacidad || 0}
        ocupados={new Set(activos.map(a => a.casillero))}
        onSeleccionar={handleSeleccionarCasillero}
        titulo={modalMode === 'aprobar' ? 'Asignar Casillero' : 'Mover de Casillero'}
        accion={modalMode === 'aprobar' ? 'asignar' : 'mover'}
      />
    </div>
  );
};

export default GuardiaPanel;