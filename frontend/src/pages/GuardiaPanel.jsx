import React, { useState, useEffect, useRef } from 'react';
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

import Sidebar from '../components/Sidebar';
import Solicitudes from '../components/guardia/Solicitudes';
import EnCustodia from '../components/guardia/EnCustodia';
import CasilleroModal from '../components/guardia/CasilleroModal';
import ConfirmModal from '../components/guardia/ConfirmModal';
import ContenidoAlumno from '../components/ContenidoAlumno';
import PerfilContent from '../components/PerfilContent';

import './AdminDashboard.css';
import './GuardiaPanel.css';

// Constante de audio
const NOTIFICACION_AUDIO = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");

const GuardiaPanel = () => {
  const navigate = useNavigate();

  // Estados de Datos
  const [misBicicleteros, setMisBicicleteros] = useState([]);
  const [bicicleteroActual, setBicicleteroActual] = useState(null);
  const [solicitudes, setSolicitudes] = useState([]);
  const [activos, setActivos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('solicitudes');

  // Estados de Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalMode, setModalMode] = useState('aprobar');

  // Estado para Confirmaciones
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    action: null,
    isDanger: false
  });

  // Estado de Permisos de Notificación
  const [permisoNotificacion, setPermisoNotificacion] = useState(Notification.permission);

  // Refs
  const prevSolicitudesIds = useRef(new Set());
  const isFirstLoad = useRef(true);

  // Inicialización
  useEffect(() => {
    async function init() {
      try {
        const bicis = await getMisBicicleteros();
        setMisBicicleteros(bicis);
        if (bicis.length > 0) setBicicleteroActual(bicis[0]);
      } catch (error) {
        console.error("Error init:", error);
      } 
      finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // --- FUNCIÓN CORREGIDA: ACTIVAR NOTIFICACIONES ---
  const activarNotificaciones = () => {
    // Pedimos permiso al navegador
    Notification.requestPermission().then(permission => {
      setPermisoNotificacion(permission); // Actualizamos el estado visual

      if (permission === 'granted') {
        // CASO 1: ÉXITO - El usuario aceptó
        
        // Reproducimos y pausamos audio para "desbloquearlo" en móviles
        NOTIFICACION_AUDIO.play().catch((e) => console.warn("Audio test:", e));
        NOTIFICACION_AUDIO.pause();
        NOTIFICACION_AUDIO.currentTime = 0;
        
        // Vibración de prueba
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        
        alert("✅ Sonido y Alertas activados correctamente.");

      } else if (permission === 'denied') {
        // CASO 2: BLOQUEADO - El navegador ya las bloqueó antes
        alert(
          "⚠️ Las notificaciones están bloqueadas.\n\n" +
          "Para activarlas:\n" +
          "1. Toca el icono del 'Candado' 🔒 o 'Configuración' junto a la dirección web (arriba).\n" +
          "2. Busca 'Permisos' o 'Notificaciones'.\n" +
          "3. Selecciona 'Permitir' o 'Restablecer'.\n" +
          "4. Recarga la página."
        );
      } else {
        // CASO 3: DEFAULT - El usuario cerró el cuadro sin elegir
        console.log("El usuario no tomó una decisión.");
      }
    });
  };

  // Detector de Solicitudes (Worker + Vibración)
  useEffect(() => {
    if (loading) return;

    if (isFirstLoad.current) {
      // Guardamos lo que haya (sea 0 o 100) como "visto"
      prevSolicitudesIds.current = new Set(solicitudes.map(s => s.id));
      isFirstLoad.current = false;
      return;
    }
    
    const nuevas = solicitudes.filter(s => !prevSolicitudesIds.current.has(s.id));
    
    if (nuevas.length > 0) {
      const ultima = nuevas[0];
      const esIngreso = ultima.estado === 'pendiente';

      // A. Vibración
      if (navigator.vibrate) navigator.vibrate([500, 200, 500]);

      // B. Sonido
      NOTIFICACION_AUDIO.currentTime = 0;
      NOTIFICACION_AUDIO.play().catch(e => console.log("Audio bloqueado:", e));

      // C. Notificación Visual
      if (Notification.permission === 'granted') {
        try {
            new Notification(esIngreso ? "🚲 Nueva Bicicleta" : "📤 Solicitud de Retiro", {
                body: `${ultima.usuario.nombre} quiere ${esIngreso ? 'ingresar' : 'retirar'} una ${ultima.bicicleta.marca}`,
                icon: "/vite.svg",
                vibrate: [200, 100, 200],
                requireInteraction: true 
            });
        } catch (e) {
            console.error("Error lanzando notificación:", e);
        }
      }
    }
    prevSolicitudesIds.current = new Set(solicitudes.map(s => s.id));
  }, [solicitudes, loading]);

  // Polling con Worker
  useEffect(() => {
    if (!bicicleteroActual) return;
    cargarDatos(bicicleteroActual.id, true);

    const workerCode = `
      let intervalId;
      self.onmessage = function(e) {
        if (e.data === 'start') {
          intervalId = setInterval(() => { self.postMessage('tick'); }, 4000); 
        } else if (e.data === 'stop') { clearInterval(intervalId); }
      };
    `;
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const worker = new Worker(URL.createObjectURL(blob));

    worker.onmessage = () => { cargarDatos(bicicleteroActual.id, false); };
    worker.postMessage('start');

    return () => {
      worker.postMessage('stop');
      worker.terminate();
      URL.revokeObjectURL(blob);
    };
  }, [bicicleteroActual]);

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

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleBicicleteroChange = (e) => {
    const id = parseInt(e.target.value);
    setBicicleteroActual(misBicicleteros.find(b => b.id === id));
  };

  // --- LOGICA MODALES ---
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

  const solicitarConfirmacion = (title, message, action, isDanger = false) => {
    setConfirmConfig({ isOpen: true, title, message, action, isDanger });
  };

  const handleSeleccionarCasillero = (casilleroId) => {
    const esAprobar = modalMode === 'aprobar';
    const accionTexto = esAprobar ? 'Asignar' : 'Mover a';

    const ejecutarAsignacion = async () => {
      try {
        if (esAprobar) {
          await aprobarIngreso(selectedItem, casilleroId);
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

    solicitarConfirmacion(
      "Confirmar Ubicación",
      `¿Estás seguro de ${accionTexto.toLowerCase()} la bicicleta en el casillero ${casilleroId}?`,
      ejecutarAsignacion,
      false
    );
  };

  const handleRechazar = (id) => {
    const ejecutarRechazo = async () => {
      try {
        await rechazarIngreso(id, "Sin motivo especificado");
        cargarDatos(bicicleteroActual.id, false);
      } catch (error) { alert(` Error: ${error.response?.data?.message || error.message}`); }
    };

    solicitarConfirmacion(
      "Rechazar Solicitud",
      "¿Estás seguro de rechazar el ingreso? Esta acción no se puede deshacer.",
      ejecutarRechazo,
      true
    );
  };

  const handleFinalizar = (id) => {
    const ejecutarSalida = async () => {
      try {
        await finalizarEstadia(id);
        cargarDatos(bicicleteroActual.id, false);
      } catch (error) { alert(` Error: ${error.response?.data?.message || error.message}`); }
    };

    solicitarConfirmacion(
      "Confirmar Salida",
      "¿El alumno ha retirado su bicicleta? Esto liberará el casillero.",
      ejecutarSalida,
      false
    );
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
  };

  if (loading && !bicicleteroActual) return <div className="admin-layout"><p style={{ padding: 30 }}>Cargando...</p></div>;

  return (
    <div className="admin-layout">
      <Sidebar
        role="guardia"
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        onLogout={handleLogout}
      />

      <main className="main-content">

        {(activeTab === 'solicitudes' || activeTab === 'custodia') && (
          <>
            {/* Header */}
            <div style={{ 
                background: 'white', padding: '20px', borderRadius: '12px', marginBottom: '20px', 
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                boxShadow: '0 2px 5px rgba(0,0,0,0.05)', flexWrap: 'wrap', gap: '15px' 
            }}>
                
                {/* SECCIÓN 1: TÍTULO Y OCUPACIÓN */}
                <div>
                    <h2 style={{ margin: 0, color: '#2c3e50', fontSize: '1.5rem' }}>
                        {activeTab === 'solicitudes' ? 'Gestionar Solicitudes' : 'Bicicletas en Custodia'}
                    </h2>
                    <div style={{display:'flex', alignItems:'center', gap:'10px', marginTop:'5px'}}>
                        <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
                            Ocupación: <strong>{activos.length} / {bicicleteroActual?.capacidad}</strong>
                        </p>
                    </div>
                </div>

                {/* SECCIÓN 2: INFO DEL BICICLETERO */}
                {bicicleteroActual && (
                    <div style={{ 
                        display: 'flex', gap: '20px', fontSize: '0.9rem', color: '#555', 
                        background: '#f8f9fa', padding: '8px 20px', borderRadius: '8px', border: '1px solid #eee' 
                    }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#999', fontWeight: 'bold' }}>Estado</span>
                            <span style={{ fontWeight: 'bold', color: bicicleteroActual.estado === 'operativo' ? '#27ae60' : '#e74c3c', textTransform: 'capitalize' }}>
                                {bicicleteroActual.estado || 'Desconocido'}
                            </span>
                        </div>
                        <div style={{ width: '1px', background: '#ddd', height: '30px' }}></div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#999', fontWeight: 'bold' }}>Horario</span>
                            <span style={{ fontWeight: 'bold', color: '#2c3e50' }}>
                                {bicicleteroActual.horaApertura?.slice(0,5)} - {bicicleteroActual.horaCierre?.slice(0,5)} Hrs
                            </span>
                        </div>
                    </div>
                )}

                {/* SECCIÓN 3: SELECTOR Y BOTÓN ALERTAS */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    
                    {/* BOTÓN CON ESTADO CONTROLADO */}
                    {permisoNotificacion !== 'granted' && (
                        <button 
                            onClick={activarNotificaciones}
                            style={{ 
                                background: '#e74c3c', color: 'white', border: 'none', padding: '8px 15px', 
                                borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem',
                                animation: 'pulse 2s infinite'
                            }}
                            title="Haz clic para activar sonido y alertas"
                        >
                            🔔 Activar Alertas
                        </button>
                    )}

                    <select 
                        style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc', background:'white', cursor:'pointer' }}
                        value={bicicleteroActual?.id || ''} 
                        onChange={handleBicicleteroChange}
                    >
                        {misBicicleteros.map(b => <option key={b.id} value={b.id}>{b.ubicacion}</option>)}
                    </select>
                </div>
            </div>

            {/* Tarjetas */}
            <div className="cards-grid">
              {activeTab === 'solicitudes' ? (
                <Solicitudes
                  solicitudes={solicitudes}
                  onAprobar={abrirModalAprobar}
                  onRechazar={handleRechazar}
                  onFinalizar={handleFinalizar}
                />
              ) : (
                <EnCustodia
                  activos={activos}
                  onCambiarCasillero={abrirModalCambiar}
                  onFinalizar={handleFinalizar}
                />
              )}
            </div>
          </>
        )}

        {activeTab === 'perfil' && <PerfilContent />}
        {activeTab === 'ir_a_alumno' && (
          <ContenidoAlumno alIrAlPerfil={() => setActiveTab('perfil')} />
        )}

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

      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
        onConfirm={confirmConfig.action}
        title={confirmConfig.title}
        message={confirmConfig.message}
        isDanger={confirmConfig.isDanger}
      />
    </div>
  );
};

export default GuardiaPanel;