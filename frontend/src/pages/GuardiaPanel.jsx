import React, { useState, useEffect, useRef } from 'react'; // <--- 1. AGREGAMOS useRef
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

import SidebarGuardia from '../components/guardia/SidebarGuardia';
import Solicitudes from '../components/guardia/Solicitudes';
import EnCustodia from '../components/guardia/EnCustodia';
import CasilleroModal from '../components/guardia/CasilleroModal';

import './AdminDashboard.css'; 
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

  // --- REFS PARA NOTIFICACIONES ---
  const prevSolicitudesIds = useRef(new Set()); // Guardamos los IDs que ya conocemos
  const isFirstLoad = useRef(true); // Para no notificar apenas entras a la página

  // 1. INICIALIZACIÓN Y PERMISOS
  useEffect(() => {
    // Pedir permiso para notificaciones si no lo tenemos
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }

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

  // 2. DETECTOR DE NUEVAS SOLICITUDES (NOTIFICADOR)
  useEffect(() => {
    // Si es la primera carga, solo guardamos lo que hay y marcamos como "listo"
    if (isFirstLoad.current) {
      if (solicitudes.length > 0) {
         // Guardamos los IDs iniciales para no avisar de lo que ya estaba ahí
         prevSolicitudesIds.current = new Set(solicitudes.map(s => s.id));
      }
      isFirstLoad.current = false;
      return;
    }

    // Buscamos si hay alguna solicitud en la lista nueva que NO estaba en la lista vieja
    const nuevas = solicitudes.filter(s => !prevSolicitudesIds.current.has(s.id));

    if (nuevas.length > 0) {
      // ¡Encontramos una nueva! Enviamos notificación al dispositivo
      const ultima = nuevas[0]; // Tomamos la primera nueva para el texto
      
      if (Notification.permission === 'granted') {
        new Notification("🔔 Nueva Solicitud de Ingreso", {
          body: `${ultima.usuario.nombre} quiere ingresar una ${ultima.bicicleta.marca}`,
          icon: "/vite.svg", // Puedes poner un icono de bici aquí si tienes
          vibrate: [200, 100, 200] // Vibración en móviles (bzz-bzz)
        });
      }
    }

    // Actualizamos la memoria con los IDs actuales para la próxima comparación
    prevSolicitudesIds.current = new Set(solicitudes.map(s => s.id));

  }, [solicitudes]); // Se ejecuta cada vez que el polling actualiza 'solicitudes'


  // --- POLLING AUTOMÁTICO ---
  useEffect(() => {
    let intervalo;

    if (bicicleteroActual) {
      cargarDatos(bicicleteroActual.id, true); // Primera carga visual

      // Polling cada 5 segundos
      intervalo = setInterval(() => {
        cargarDatos(bicicleteroActual.id, false); // Carga silenciosa
      }, 5000); 
    }

    return () => { if (intervalo) clearInterval(intervalo); };
  }, [bicicleteroActual]);


  // Función de carga
  const cargarDatos = async (id, mostrarLoading = true) => {
    try {
      if (mostrarLoading) setLoading(true);

      const [pendientes, enCustodia] = await Promise.all([
        getSolicitudes(id),
        getActivos(id)
      ]);
      
      setSolicitudes(pendientes);
      setActivos(enCustodia);
      
    } catch (error) {
      console.error("Error loading:", error);
    } finally {
      if (mostrarLoading) setLoading(false);
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
      cargarDatos(bicicleteroActual.id, false);
    } catch (error) {
      alert(` Error: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleRechazar = async (id) => {
    const motivo = prompt("Ingrese motivo del rechazo:");
    if (!motivo) return;
    try {
      await rechazarIngreso(id, motivo);
      cargarDatos(bicicleteroActual.id, false);
    } catch (error) { alert(` Error: ${error.response?.data?.message || error.message}`); }
  };

  const handleFinalizar = async (id) => {
    if(!window.confirm("¿Confirmar salida?")) return;
    try {
      await finalizarEstadia(id);
      setBicicleteroActual(prev => ({...prev, bicicletasGuardadas: prev.bicicletasGuardadas - 1}));
      cargarDatos(bicicleteroActual.id, false);
    } catch (error) { alert(` Error: ${error.response?.data?.message || error.message}`); }
  };

  if (loading && !bicicleteroActual) return <div className="admin-layout"><p style={{padding:30}}>Cargando...</p></div>;

  return (
    <div className="admin-layout">
      
      <SidebarGuardia 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={handleLogout} 
      />

      <main className="main-content">
        
        <div style={{ 
          background: 'white', padding: '20px', borderRadius: '12px', marginBottom: '20px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' 
        }}>
            <div>
                <h2 style={{ margin: 0, color: '#2c3e50', fontSize: '1.5rem' }}>
                    {activeTab === 'solicitudes' ? 'Gestionar Solicitudes' : 'Bicicletas en Custodia'}
                </h2>
                <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                  <p style={{ margin: '5px 0 0', color: '#666' }}>
                      Ocupación: <strong>{bicicleteroActual?.bicicletasGuardadas} / {bicicleteroActual?.capacidad}</strong>
                  </p>
                  <span style={{fontSize:'0.7rem', background:'#e8f5e9', color:'#2e7d32', padding:'2px 6px', borderRadius:'4px', marginTop:'5px'}}>
                    ● En vivo
                  </span>
                </div>
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
            </div>
        </div>

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