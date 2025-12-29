import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getMisBicicleteros,
  getSolicitudes,
  getActivos,
  aprobarIngreso,
  rechazarIngreso,
  finalizarEstadia,
  modificarUbicacion,
  getResumenGlobal
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
  const [contadoresGlobales, setContadoresGlobales] = useState({});
  const [totalSolicitudesGlobales, setTotalSolicitudesGlobales] = useState(0);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('solicitudes');

  // Estados de Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalMode, setModalMode] = useState('aprobar');

  // Confirmaciones
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    action: null,
    isDanger: false
  });

  // Safe safe initialization of validation permission
  const [permisoNotificacion, setPermisoNotificacion] = useState(() => {
    try {
      return ('Notification' in window) ? Notification.permission : 'default';
    } catch (e) {
      return 'default';
    }
  });

  // Refs
  const prevSolicitudesIds = useRef(new Set());
  const prevTotalGlobal = useRef(0);
  const isFirstLoad = useRef(true);

  // Inicialización
  useEffect(() => {
    async function init() {
      try {
        const bicis = await getMisBicicleteros();
        const listaBicis = Array.isArray(bicis) ? bicis : [];
        setMisBicicleteros(listaBicis);
        if (listaBicis.length > 0) setBicicleteroActual(listaBicis[0]);
      } catch (error) {
        console.error("Error init:", error);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const activarNotificaciones = () => {
    if (!('Notification' in window)) {
      alert("⚠️ Tu navegador no soporta notificaciones nativas.");
      return;
    }
    Notification.requestPermission().then(permission => {
      setPermisoNotificacion(permission);
      if (permission === 'granted') {
        NOTIFICACION_AUDIO.play().catch(() => { });
        NOTIFICACION_AUDIO.pause();
        NOTIFICACION_AUDIO.currentTime = 0;
        if (navigator.vibrate) navigator.vibrate([100]);
        alert("✅ Alertas activadas.");
      } else if (permission === 'denied') {
        alert("⚠️ Las notificaciones están bloqueadas. Revisa la configuración del sitio.");
      }
    });
  };

  // Detector de Solicitudes Locales
  useEffect(() => {
    if (loading) return; // Evitar falsas alarmas al cargar

    if (isFirstLoad.current) {
      if (solicitudes.length > 0) {
        prevSolicitudesIds.current = new Set(solicitudes.map(s => s.id));
      }
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

      // C. Notificación Visual (BLINDADA)
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(esIngreso ? "🚲 Nueva Bicicleta" : "📤 Solicitud de Retiro", {
            body: `${ultima.usuario.nombre} quiere ${esIngreso ? 'ingresar' : 'retirar'} una ${ultima.bicicleta.marca}`,
            icon: "/vite.svg",
            vibrate: [200, 100, 200]
          });
        } catch (e) {
          console.log("Notificación visual no soportada:", e);
        }
      }
    }
    prevSolicitudesIds.current = new Set(solicitudes.map(s => s.id));
  }, [solicitudes, loading]);

  // Detector de Alertas Globales
  useEffect(() => {
    if (loading) return;
    if (isFirstLoad.current) {
      prevTotalGlobal.current = totalSolicitudesGlobales;
      return;
    }

    if (totalSolicitudesGlobales > prevTotalGlobal.current) {
      // Audio y Vibración
      if (navigator.vibrate) navigator.vibrate([500, 200, 500]);
      NOTIFICACION_AUDIO.currentTime = 0;
      NOTIFICACION_AUDIO.play().catch(e => console.log("Audio:", e));

      // Notificación Visual (BLINDADA)
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification("🔔 Nueva Solicitud", { body: "Revisa tus bicicleteros.", icon: "/vite.svg" });
        } catch (e) {
          console.log("Notificación visual global omitida en móvil.");
        }
      }
    }
    prevTotalGlobal.current = totalSolicitudesGlobales;
  }, [totalSolicitudesGlobales, loading]);

  // Polling con Worker + Try/Catch de Seguridad
  useEffect(() => {
    if (!bicicleteroActual) return;

    cargarDatos(bicicleteroActual.id, true);

    let worker = null;
    try {
      const workerCode = `
          let intervalId;
          self.onmessage = function(e) {
            if (e.data === 'start') {
              intervalId = setInterval(() => { self.postMessage('tick'); }, 4000); 
            } else if (e.data === 'stop') { clearInterval(intervalId); }
          };
        `;
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      worker = new Worker(URL.createObjectURL(blob));

      worker.onmessage = () => { cargarDatos(bicicleteroActual.id, false); };
      worker.postMessage('start');
    } catch (e) {
      console.warn("Worker no soportado, usando fallback", e);
      const interval = setInterval(() => cargarDatos(bicicleteroActual.id, false), 4000);
      return () => clearInterval(interval);
    }

    return () => {
      if (worker) {
        worker.postMessage('stop');
        worker.terminate();
      }
    };
  }, [bicicleteroActual]);

  const cargarDatos = async (id, mostrarLoading = true) => {
    try {
      if (mostrarLoading) setLoading(true);

      const [pendientes, enCustodia, resumen] = await Promise.all([
        getSolicitudes(id),
        getActivos(id),
        getResumenGlobal().catch(e => [])
      ]);

      setSolicitudes(Array.isArray(pendientes) ? pendientes : []);
      setActivos(Array.isArray(enCustodia) ? enCustodia : []);

      const mapaContadores = {};
      let sumaTotal = 0;

      if (Array.isArray(resumen)) {
        resumen.forEach(item => {
          if (item && item.id) {
            mapaContadores[item.id] = parseInt(item.cantidad || 0);
            sumaTotal += parseInt(item.cantidad || 0);
          }
        });
      }

      setContadoresGlobales(mapaContadores);
      setTotalSolicitudesGlobales(sumaTotal);

    } catch (error) {
      console.error("Error loading:", error);
      setSolicitudes([]);
    } finally {
      if (mostrarLoading) setLoading(false);
    }
  };

  // Handlers
  const handleLogout = () => { localStorage.removeItem('token'); localStorage.removeItem('user'); navigate('/login'); };
  const handleBicicleteroChange = (e) => { setBicicleteroActual(misBicicleteros.find(b => b.id === parseInt(e.target.value))); };

  const abrirModalAprobar = (id) => { setSelectedItem(id); setModalMode('aprobar'); setIsModalOpen(true); };
  const abrirModalCambiar = (id) => { setSelectedItem(id); setModalMode('cambiar'); setIsModalOpen(true); };
  const solicitarConfirmacion = (title, message, action, isDanger) => { setConfirmConfig({ isOpen: true, title, message, action, isDanger }); };

  const handleSeleccionarCasillero = (casilleroId) => {
    const esAprobar = modalMode === 'aprobar';
    const ejecutar = async () => {
      try {
        if (esAprobar) await aprobarIngreso(selectedItem, casilleroId);
        else await modificarUbicacion(selectedItem, casilleroId);
        setIsModalOpen(false); setSelectedItem(null); cargarDatos(bicicleteroActual.id, false);
      } catch (e) { alert(e.message); }
    };
    solicitarConfirmacion("Confirmar", `¿${esAprobar ? 'Asignar' : 'Mover'} a ${casilleroId}?`, ejecutar);
  };

  const handleRechazar = (id) => solicitarConfirmacion("Rechazar", "¿Seguro?", async () => { await rechazarIngreso(id, "X"); cargarDatos(bicicleteroActual.id, false); }, true);
  const handleFinalizar = (id) => solicitarConfirmacion("Salida", "¿Retiró?", async () => { await finalizarEstadia(id); cargarDatos(bicicleteroActual.id, false); });

  const solicitudesEnOtros = Object.entries(contadoresGlobales || {})
    .filter(([id]) => parseInt(id) !== bicicleteroActual?.id)
    .reduce((acc, [, cant]) => acc + cant, 0);

  if (loading && !bicicleteroActual) return <div className="admin-layout"><p style={{ padding: 30 }}>Cargando...</p></div>;

  return (
    <div className="admin-layout">
      <Sidebar role="guardia" activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />

      <main className="main-content">
        {(activeTab === 'solicitudes' || activeTab === 'custodia') && (
          <>
            <div style={{ background: 'white', padding: '20px', borderRadius: '12px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', flexWrap: 'wrap', gap: '15px' }}>

              <div>
                <h2 style={{ margin: 0, color: '#2c3e50', fontSize: '1.5rem' }}>{activeTab === 'solicitudes' ? 'Gestionar Solicitudes' : 'Bicicletas en Custodia'}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px' }}>
                  <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>Ocupación: <strong>{activos.length} / {bicicleteroActual?.capacidad}</strong></p>
                </div>
              </div>

              {bicicleteroActual && (
                <div style={{ display: 'flex', gap: '20px', fontSize: '0.9rem', color: '#555', background: '#f8f9fa', padding: '8px 20px', borderRadius: '8px', border: '1px solid #eee' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#999', fontWeight: 'bold' }}>Estado</span>
                    <span style={{ fontWeight: 'bold', color: bicicleteroActual.estado === 'operativo' ? '#27ae60' : '#e74c3c', textTransform: 'capitalize' }}>{bicicleteroActual.estado || 'Desc'}</span>
                  </div>
                  <div style={{ width: '1px', background: '#ddd', height: '30px' }}></div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#999', fontWeight: 'bold' }}>Horario</span>
                    <span style={{ fontWeight: 'bold', color: '#2c3e50' }}>{bicicleteroActual.horaApertura?.slice(0, 5)} - {bicicleteroActual.horaCierre?.slice(0, 5)} Hrs</span>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', position: 'relative' }}>
                {permisoNotificacion !== 'granted' && (
                  <button onClick={activarNotificaciones} style={{ background: '#e74c3c', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.9rem', animation: 'pulse 2s infinite' }}>🔔 Activar Alertas</button>
                )}

                {solicitudesEnOtros > 0 && (
                  <div style={{ background: '#e74c3c', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem', boxShadow: '0 2px 5px rgba(0,0,0,0.2)', animation: 'pulse 1s infinite' }} title={`${solicitudesEnOtros} solicitudes en otros bicicleteros`}>
                    {solicitudesEnOtros}
                  </div>
                )}

                <select
                  style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc', background: 'white', cursor: 'pointer' }}
                  value={bicicleteroActual?.id || ''}
                  onChange={handleBicicleteroChange}
                >
                  {misBicicleteros.map(b => {
                    const cantidad = contadoresGlobales[b.id] || 0;
                    const textoLabel = cantidad > 0 ? `${b.ubicacion} (${cantidad})` : b.ubicacion;
                    return <option key={b.id} value={b.id}>{textoLabel}</option>;
                  })}
                </select>
              </div>
            </div>

            <div className="cards-grid">
              {activeTab === 'solicitudes' ?
                <Solicitudes solicitudes={solicitudes} onAprobar={abrirModalAprobar} onRechazar={handleRechazar} onFinalizar={handleFinalizar} /> :
                <EnCustodia activos={activos} onCambiarCasillero={abrirModalCambiar} onFinalizar={handleFinalizar} />
              }
            </div>
          </>
        )}

        {activeTab === 'perfil' && <PerfilContent />}
        {activeTab === 'ir_a_alumno' && <ContenidoAlumno alIrAlPerfil={() => setActiveTab('perfil')} />}

      </main>

      <CasilleroModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} capacidad={bicicleteroActual?.capacidad || 0} ocupados={new Set(activos.map(a => a.casillero))} onSeleccionar={handleSeleccionarCasillero} titulo={modalMode === 'aprobar' ? 'Asignar' : 'Mover'} accion={modalMode === 'aprobar' ? 'asignar' : 'mover'} />
      <ConfirmModal isOpen={confirmConfig.isOpen} onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })} onConfirm={confirmConfig.action} title={confirmConfig.title} message={confirmConfig.message} isDanger={confirmConfig.isDanger} />
    </div>
  );
};

export default GuardiaPanel;