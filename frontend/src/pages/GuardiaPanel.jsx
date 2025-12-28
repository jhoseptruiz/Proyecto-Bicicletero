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
import AlumnoContent from '../components/AlumnoContent';
import PerfilContent from '../components/PerfilContent';

import './AdminDashboard.css';
import './GuardiaPanel.css';

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
  const [isModalOpen, setIsModalOpen] = useState(false); // Modal de Casilleros (Bolitas)
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalMode, setModalMode] = useState('aprobar');

  // --- NUEVO ESTADO PARA CONFIRMACIONES ---
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    action: null, // La función a ejecutar si dice "Sí"
    isDanger: false
  });

  // Refs para notificaciones
  const prevSolicitudesIds = useRef(new Set());
  const isFirstLoad = useRef(true);

  // Inicialización
  useEffect(() => {
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

  // Notificaciones
  useEffect(() => {
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
      if (Notification.permission === 'granted') {
        new Notification("🔔 Nueva Solicitud", {
          body: `${ultima.usuario.nombre} - ${ultima.bicicleta.marca}`,
          icon: "/vite.svg"
        });
      }
    }
    prevSolicitudesIds.current = new Set(solicitudes.map(s => s.id));
  }, [solicitudes]);

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

  // Helper para abrir la confirmación
  const solicitarConfirmacion = (title, message, action, isDanger = false) => {
    setConfirmConfig({ isOpen: true, title, message, action, isDanger });
  };

  // 1. CONFIRMAR ASIGNACIÓN (Desde el modal de bolitas)
  const handleSeleccionarCasillero = (casilleroId) => {
    const esAprobar = modalMode === 'aprobar';
    const accionTexto = esAprobar ? 'Asignar' : 'Mover a';

    // Definimos la acción que se ejecutará si dice "SÍ"
    const ejecutarAsignacion = async () => {
      try {
        if (esAprobar) {
          await aprobarIngreso(selectedItem, casilleroId);
          setBicicleteroActual(prev => ({ ...prev, bicicletasGuardadas: prev.bicicletasGuardadas + 1 }));
        } else {
          await modificarUbicacion(selectedItem, casilleroId);
        }
        setIsModalOpen(false); // Cerramos el modal de bolitas
        setSelectedItem(null);
        cargarDatos(bicicleteroActual.id, false);
      } catch (error) {
        alert(` Error: ${error.response?.data?.message || error.message}`);
      }
    };

    // Abrimos la confirmación
    solicitarConfirmacion(
      "Confirmar Ubicación",
      `¿Estás seguro de ${accionTexto.toLowerCase()} la bicicleta en el casillero ${casilleroId}?`,
      ejecutarAsignacion,
      false
    );
  };

  // 2. CONFIRMAR RECHAZO (Sin escribir motivo)
  const handleRechazar = (id) => {
    const ejecutarRechazo = async () => {
      try {
        await rechazarIngreso(id, "Sin motivo especificado"); // Enviamos string genérico
        cargarDatos(bicicleteroActual.id, false);
      } catch (error) { alert(` Error: ${error.response?.data?.message || error.message}`); }
    };

    solicitarConfirmacion(
      "Rechazar Solicitud",
      "¿Estás seguro de rechazar el ingreso de esta bicicleta? Esta acción no se puede deshacer.",
      ejecutarRechazo,
      true // Es peligroso/rojo
    );
  };

  // 3. CONFIRMAR SALIDA
  const handleFinalizar = (id) => {
    const ejecutarSalida = async () => {
      try {
        await finalizarEstadia(id);
        setBicicleteroActual(prev => ({ ...prev, bicicletasGuardadas: prev.bicicletasGuardadas - 1 }));
        cargarDatos(bicicleteroActual.id, false);
      } catch (error) { alert(` Error: ${error.response?.data?.message || error.message}`); }
    };

    solicitarConfirmacion(
      "Confirmar Salida",
      "¿El alumno ha retirado su bicicleta? Esto liberará el casillero.",
      ejecutarSalida,
      false // Azul/Normal
    );
  };

  if (loading && !bicicleteroActual) return <div className="admin-layout"><p style={{ padding: 30 }}>Cargando...</p></div>;

  // --- Navegación (Ahora todo es SPA) ---
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
  };

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
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
            }}>
              <div>
                <h2 style={{ margin: 0, color: '#2c3e50', fontSize: '1.5rem' }}>
                  {activeTab === 'solicitudes' ? 'Gestionar Solicitudes' : 'Bicicletas en Custodia'}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <p style={{ margin: '5px 0 0', color: '#666' }}>
                    Ocupación: <strong>{bicicleteroActual?.bicicletasGuardadas} / {bicicleteroActual?.capacidad}</strong>
                  </p>
                  <span style={{ fontSize: '0.7rem', background: '#e8f5e9', color: '#2e7d32', padding: '2px 6px', borderRadius: '4px', marginTop: '5px' }}>
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

            {/* Tarjetas */}
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
          </>
        )}

        {activeTab === 'perfil' && <PerfilContent />}
        {activeTab === 'ir_a_alumno' && (
          <AlumnoContent onGoToProfile={() => setActiveTab('perfil')} />
        )}

      </main>

      {/* --- MODAL DE SELECCIÓN DE CASILLERO --- */}
      <CasilleroModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        capacidad={bicicleteroActual?.capacidad || 0}
        ocupados={new Set(activos.map(a => a.casillero))}
        onSeleccionar={handleSeleccionarCasillero}
        titulo={modalMode === 'aprobar' ? 'Asignar Casillero' : 'Mover de Casillero'}
        accion={modalMode === 'aprobar' ? 'asignar' : 'mover'}
      />

      {/* --- NUEVO MODAL DE CONFIRMACIÓN --- */}
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