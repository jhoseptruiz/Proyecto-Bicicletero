import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  getMisBicicleteros, 
  getSolicitudes, 
  getActivos, 
  aprobarIngreso, 
  rechazarIngreso, 
  finalizarEstadia,
  modificarUbicacion 
} from '../services/guardia.service';

// Importamos los componentes modulares
import SidebarGuardia from '../components/guardia/SidebarGuardia';
import Solicitudes from '../components/guardia/Solicitudes';
import EnCustodia from '../components/guardia/EnCustodia';
import CasilleroModal from '../components/guardia/CasilleroModal';

// Reutilizamos el CSS del Admin para consistencia total
import './AdminDashboard.css'; 
// Si necesitas estilos extra específicos para las tarjetas, impórtalos aquí:
import './GuardiaPanel.css'; 

const GuardiaPanel = () => {
  const navigate = useNavigate();

  // --- ESTADOS ---
  const [misBicicleteros, setMisBicicleteros] = useState([]);
  const [bicicleteroActual, setBicicleteroActual] = useState(null);
  const [solicitudes, setSolicitudes] = useState([]);
  const [activos, setActivos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // UI States
  const [activeTab, setActiveTab] = useState('solicitudes'); // 'solicitudes' | 'custodia'
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null); 
  const [modalMode, setModalMode] = useState('aprobar'); // 'aprobar' | 'cambiar'

  // --- LOGICA DE CARGA ---
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

  // --- HANDLERS ---
const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleBicicleteroChange = (e) => {
    const id = parseInt(e.target.value);
    setBicicleteroActual(misBicicleteros.find(b => b.id === id));
  };

  // MODAL LOGIC
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
    } catch (error) { alert(` Error al rechazar: ${error.response?.data?.message || error.message}`); }
  };

  const handleFinalizar = async (id) => {
    if(!window.confirm("¿Confirmar salida?")) return;
    try {
      await finalizarEstadia(id);
      setBicicleteroActual(prev => ({...prev, bicicletasGuardadas: prev.bicicletasGuardadas - 1}));
      cargarDatos(bicicleteroActual.id);
    } catch (error) { alert(` Error al finalizar: ${error.response?.data?.message || error.message}`); }
  };

  if (loading && !bicicleteroActual) return <div className="admin-layout"><p style={{padding: 20}}>Cargando...</p></div>;

  return (
    <div className="admin-layout">
      {/* 1. SIDEBAR */}
      <SidebarGuardia 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={handleLogout} 
      />

      {/* 2. CONTENIDO PRINCIPAL */}
      <main className="main-content">
        
        {/* Header de la sección (Bicicletero selector) */}
        <div className="card-container fade-in" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
                <h2 style={{ margin: 0, color: '#2c3e50' }}>
                    {activeTab === 'solicitudes' ? 'Gestionar Solicitudes' : 'Bicicletas en Custodia'}
                </h2>
                <p style={{ margin: '5px 0 0', color: '#666' }}>
                    Ocupación: <strong>{bicicleteroActual?.bicicletasGuardadas} / {bicicleteroActual?.capacidad}</strong>
                </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <select 
                    className="admin-form" 
                    style={{ margin: 0, padding: '8px', borderRadius: '5px', borderColor: '#ddd' }}
                    value={bicicleteroActual?.id || ''} 
                    onChange={handleBicicleteroChange}
                >
                    {misBicicleteros.map(b => (
                        <option key={b.id} value={b.id}>{b.ubicacion}</option>
                    ))}
                </select>
                <button className="btn-secondary" onClick={() => cargarDatos(bicicleteroActual.id)}>
                    ↻
                </button>
            </div>
        </div>

        {/* Área de Contenido (Cards) */}
        <div className="fade-in">
           {/* Usamos una clase cards-grid si la definiste en GuardiaPanel.css, 
               o style inline para asegurar el grid */}
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
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
        </div>

      </main>

      {/* 3. MODALES */}
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