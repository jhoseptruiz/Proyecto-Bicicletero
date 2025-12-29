import React, { useState } from 'react';
import Map, { Marker, NavigationControl } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { CrearBicicletero, ActualizarBicicletero, deleteBicicletero } from '../../services/bicicletero.service.js';
import QRCode from 'qrcode';

function BicicleteroManager({ bicicleterosList, personalList, onRefresh }) {
  const [filtroEstado, setFiltroEstado] = useState('todos');

  // --- ESTADO PARA MODAL DE ERROR (POP UP) ---
  const [errorModal, setErrorModal] = useState({ isOpen: false, message: '' });

  // Estado Mapa 
  const [viewState, setViewState] = useState({
    longitude: -73.0134,
    latitude: -36.8222,
    zoom: 16
  });
  const [marcaLocalizacion, setMarcaLocalizacion] = useState({ lat: -36.8222, lng: -73.0134 });
  const MAPBOX_TOKEN = "pk.eyJ1IjoibWlsZW5ja2FhIiwiYSI6ImNphamxxZDAzYjJxNTIza3B5OXZmcmk1cXMifQ.xW3QubyrM10uSbt08RlAPA";

  // --- ESTADOS DEL FORMULARIO---
  const [editarId, setEditarId] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [capacidad, setCapacidad] = useState(15);
  const [estado, setEstado] = useState('operativo');
  const [horaApertura, setHoraApertura] = useState('07:00');
  const [horaCierre, setHoraCierre] = useState('21:00');

  // estados para Turnos
  const [guardiaAMId, setguardiaAMId] = useState('');
  const [guardiaPMId, setguardiaPMId] = useState('');
  const [horaCambioTurno, setHoraCambioTurno] = useState('14:00');

  // Estados QR
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrUrl, setQrUrl] = useState('');
  const [selectedBicicletero, setSelectedBicicletero] = useState(null);

  const getColorEstado = (estado) => {
    switch (estado) {
      case 'operativo': return 'green';
      case 'mantenimiento': return 'orange';
      case 'fuera_de_Servicio': return 'black';
      default: return 'gray';
    }
  };

  const handleMapClick = (event) => {
    const { lng, lat } = event.lngLat;
    const limitesUBB = [
      { lat: -36.82062174, lng: -73.01483544 },
      { lat: -36.82082823, lng: -73.01619221 },
      { lat: -36.82223570, lng: -73.01659265 },
      { lat: -36.82410483, lng: -73.01509450 },
      { lat: -36.82445675, lng: -73.01175369 },
      { lat: -36.82155629, lng: -73.01028303 },
    ];

    const puntoLimite = (latitude, longitude, polygon) => {
      let x = latitude, y = longitude;
      let inside = false;
      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        let xi = polygon[i].lat, yi = polygon[i].lng;
        let xj = polygon[j].lat, yj = polygon[j].lng;

        let intersect = ((yi > y) !== (yj > y)) &&
          (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
      }
      return inside;
    };

    const estaDentro = puntoLimite(lat, lng, limitesUBB);
    if (!estaDentro) {
      showError("El bicicletero debe estar dentro del campus UBB");
      return;
    }
    setMarcaLocalizacion({ lat, lng });
  };

  const resetFormulario = () => {
    setEditarId(null);
    setUbicacion('');
    setCapacidad(15);
    setEstado('operativo');
    setHoraApertura('07:00');
    setHoraCierre('21:00');
    // Reset Turnos
    setguardiaAMId('');
    setguardiaPMId('');
    setHoraCambioTurno('14:00');
  };

  // --- HELPER PARA POP UP ERROR ---
  const showError = (msg) => {
    setErrorModal({ isOpen: true, message: msg });
  };

  const closeError = () => {
    setErrorModal({ isOpen: false, message: '' });
  };

  // --- MANEJADORES CON BLOQUEO LÓGICO ---

  const handleEditClick = (bicicletero) => {
    // 1. BLOQUEO: Si hay bicis, mostramos Pop Up y detenemos
    if (bicicletero.bicicletasGuardadas > 0) {
      showError("No se pudo modificar porque el bicicletero está en uso.");
      return;
    }

    setEditarId(bicicletero.id);
    setUbicacion(bicicletero.ubicacion);
    setCapacidad(bicicletero.capacidad);
    setEstado(bicicletero.estado);
    setHoraApertura(bicicletero.horaApertura);
    setHoraCierre(bicicletero.horaCierre);

    // Cargar Turnos
    setguardiaAMId(bicicletero.guardiaAM ? bicicletero.guardiaAM.rut : '');
    setguardiaPMId(bicicletero.guardiaPM ? bicicletero.guardiaPM.rut : '');
    setHoraCambioTurno(bicicletero.horaCambioTurno || '14:00');

    // Cargar posición en mapa
    if (bicicletero.latitud && bicicletero.longitud) {
      setMarcaLocalizacion({ lat: parseFloat(bicicletero.latitud), lng: parseFloat(bicicletero.longitud) });
    }
  };

  const handleDeleteBicicletero = async (bicicletero) => {
    // 1. BLOQUEO: Si hay bicis, mostramos Pop Up y detenemos
    if (bicicletero.bicicletasGuardadas > 0) {
      showError("No se puede eliminar porque el bicicletero está en uso.");
      return;
    }

    if (!window.confirm("¿Estás seguro de eliminar este bicicletero?")) return;
    try {
      await deleteBicicletero(bicicletero.id);
      alert('Bicicletero eliminado');
      onRefresh();
    } catch (err) {
      showError(err.message || "Error al eliminar");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const newData = {
        ubicacion,
        capacidad: parseInt(capacidad, 10),
        estado,
        horaApertura: horaApertura || null,
        horaCierre: horaCierre || null,
        latitud: marcaLocalizacion.lat,
        longitud: marcaLocalizacion.lng,
        // Datos de Turnos
        guardiaAMId: guardiaAMId || null,
        guardiaPMId: guardiaPMId || null,
        horaCambioTurno
      };

      if (editarId) {
        await ActualizarBicicletero(editarId, newData);
        alert('Bicicletero actualizado');
      } else {
        await CrearBicicletero(newData);
        alert('Bicicletero creado');
      }
      resetFormulario();
      onRefresh();
    } catch (err) {
      showError(err.message || "Error al guardar");
    }
  };

  const bicicleterosFiltrados = bicicleterosList.filter(b => {
    if (filtroEstado === 'todos') return true;
    return b.estado === filtroEstado;
  });

  // --- QR HANDLERS ---
  const handleVerQR = async (bicicletero) => {
    try {
      const qrData = JSON.stringify({
        id: bicicletero.id,
        lat: parseFloat(bicicletero.latitud),
        lng: parseFloat(bicicletero.longitud),
        tipo: 'bicicletero_ubicacion'
      });

      const url = await QRCode.toDataURL(qrData, {
        width: 300,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' }
      });

      setQrUrl(url);
      setSelectedBicicletero(bicicletero);
      setShowQrModal(true);
    } catch (err) {
      console.error("Error generando QR", err);
      showError("No se pudo generar el código QR");
    }
  };

  const handleDescargarQR = () => {
    if (!qrUrl || !selectedBicicletero) return;
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = `QR-Bicicletero-${selectedBicicletero.ubicacion.replace(/\s+/g, '-')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const cerrarModal = () => {
    setShowQrModal(false);
    setQrUrl('');
    setSelectedBicicletero(null);
  };

  return (
    <div className="content-section fade-in">
      <div className="section-header">
        <h2>Gestión de Bicicleteros</h2>
      </div>

      <div className="bicicleteros-layout">
        <div className="map-column">
          <div className="map-wrapper">
            <Map
              {...viewState}
              onMove={evt => setViewState(evt.viewState)}
              style={{ width: '100%', height: '100%' }}
              mapStyle="mapbox://styles/mapbox/streets-v11"
              mapboxAccessToken={MAPBOX_TOKEN}
              onClick={handleMapClick}>
              <NavigationControl />
              <Marker
                longitude={marcaLocalizacion.lng}
                latitude={marcaLocalizacion.lat}
                color="red" />
              {bicicleterosList.map(b => (
                b.latitud && b.longitud && (
                  <Marker
                    key={b.id}
                    longitude={parseFloat(b.longitud)}
                    latitude={parseFloat(b.latitud)}
                    color={getColorEstado(b.estado)}
                    onClick={(e) => {
                      e.originalEvent.stopPropagation();
                      handleEditClick(b);
                    }} />
                )
              ))}
            </Map>
            <p className="help-text">Haz clic en el mapa para definir una nueva ubicación.</p>
          </div>
        </div>

        <div className="form-column">
          <form onSubmit={handleSubmit} className="admin-form card-container">
            <h3>{editarId ? 'Editar Bicicletero' : 'Nuevo Bicicletero'}</h3>
            <div>
              <label>Ubicación: </label>
              <input type="text" value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} required />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <label>Latitud: </label>
                <input type="number" step="any" value={marcaLocalizacion.lat} onChange={(e) => setMarcaLocalizacion({ ...marcaLocalizacion, lat: parseFloat(e.target.value) })} required />
              </div>
              <div style={{ flex: 1 }}>
                <label>Longitud: </label>
                <input type="number" step="any" value={marcaLocalizacion.lng} onChange={(e) => setMarcaLocalizacion({ ...marcaLocalizacion, lng: parseFloat(e.target.value) })} required />
              </div>
            </div>
            <div>
              <label>Capacidad: </label>
              <input type="number" value={capacidad} onChange={(e) => setCapacidad(e.target.value)} required min={0} max={15} />
            </div>
            <div>
              <label>Estado: </label>
              <select value={estado} onChange={(e) => setEstado(e.target.value)}>
                <option value="operativo">Operativo</option>
                <option value="mantenimiento" >Mantenimiento</option>
                <option value="fuera_de_Servicio">Fuera de servicio</option>
              </select>
            </div>
            <div>
              <label>Horarios: </label>
              <div className="time-inputs">
                <input type="time" value={horaApertura} onChange={(e) => setHoraApertura(e.target.value)} />
                <span> a </span>
                <input type="time" value={horaCierre} onChange={(e) => setHoraCierre(e.target.value)} />
              </div>
              <small>(Dejar vacios para 24/7)</small>
            </div>

            {/* SECCIÓN DE TURNOS Y GUARDIAS (Reemplaza al guardiaId simple) */}
            <div style={{ marginTop: '15px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#666', fontSize: '0.9rem' }}>Asignación de Turnos</h4>

              <div style={{ marginBottom: '10px' }}>
                <label>Hora Cambio de Turno:</label>
                <input
                  type="time"
                  value={horaCambioTurno}
                  onChange={(e) => setHoraCambioTurno(e.target.value)}
                  style={{ width: '100%' }}
                />
                <small style={{ display: 'block', color: '#888', marginTop: '2px', fontSize: '0.75rem' }}>
                  Hora fin turno AM / inicio PM.
                </small>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.85rem' }}>Guardia Mañana:</label>
                  <select value={guardiaAMId} onChange={(e) => setguardiaAMId(e.target.value)} style={{ fontSize: '0.85rem' }}>
                    <option value="">(Sin asignar)</option>
                    {personalList.filter(p => p.role === 'guardia').map(g => (
                      <option key={g.rut} value={g.rut}>{g.nombre} {g.apellido}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem' }}>Guardia Tarde:</label>
                  <select value={guardiaPMId} onChange={(e) => setguardiaPMId(e.target.value)} style={{ fontSize: '0.85rem' }}>
                    <option value="">(Sin asignar)</option>
                    {personalList.filter(p => p.role === 'guardia').map(g => (
                      <option key={g.rut} value={g.rut}>{g.nombre} {g.apellido}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="actions" style={{ marginTop: '20px' }}>
              <button type="submit" className="btn-primary">{editarId ? 'Guardar Cambios' : 'Añadir'}</button>
              <button type="button" onClick={resetFormulario} className="btn-secondary">Cancelar</button>
            </div>
          </form>
        </div>
      </div>

      <div className="table-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h3>Bicicleteros existentes</h3>
          <div>
            <label style={{ marginRight: '10px' }}>Filtrar por:</label>
            <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
              <option value="todos">Todos</option>
              <option value="operativo">Operativo</option>
              <option value="mantenimiento">Mantenimiento</option>
              <option value="fuera_de_Servicio">Fuera de servicio</option>
            </select>
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Ubicación</th>
              <th>Latitud</th>
              <th>Longitud</th>
              <th>Ocupados/Cap</th>
              <th>Estado</th>
              <th>Horarios</th>
              <th>Guardias (AM/PM)</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {bicicleterosFiltrados.length > 0 ? (
              bicicleterosFiltrados.map(b => (
                <tr key={b.id}>
                  <td>{b.ubicacion}</td>
                  <td>{b.latitud}</td>
                  <td>{b.longitud}</td>
                  <td>{b.bicicletasGuardadas} / {b.capacidad}</td>
                  <td><span className={`badge ${b.estado}`}>{b.estado}</span></td>
                  <td>{b.horaApertura && b.horaCierre ? `${b.horaApertura} - ${b.horaCierre}` : '24/7'}</td>
                  <td>
                    <div style={{ fontSize: '0.8rem', lineHeight: '1.4' }}>
                      <div><strong>AM:</strong> {b.guardiaAM ? b.guardiaAM.nombre : '-'}</div>
                      <div><strong>PM:</strong> {b.guardiaPM ? b.guardiaPM.nombre : '-'}</div>
                      <div style={{ color: '#666', marginTop: '2px', borderTop: '1px dashed #ccc' }}>
                        Cambio: {b.horaCambioTurno?.slice(0, 5) || '14:00'}
                      </div>
                    </div>
                  </td>
                  <td>
                    <button
                      className="btn-edit"
                      onClick={() => handleEditClick(b)}
                    >
                      Editar
                    </button>
                    <button className="btn-primary" style={{ padding: '5px 10px', fontSize: '0.9rem', backgroundColor: '#6c757d', marginLeft: '5px' }}
                      onClick={() => handleVerQR(b)}>Ver QR</button>
                    <button
                      className="btn-delete"
                      onClick={() => handleDeleteBicicletero(b)}
                      style={{ marginLeft: '5px' }}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="8">No hay bicicleteros registrados</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showQrModal && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="btn-close" onClick={cerrarModal}>×</button>
            <h3 style={{ marginTop: 0, color: '#2c3e50' }}>Código QR Bicicletero</h3>
            <p style={{ color: '#666' }}>{selectedBicicletero?.ubicacion}</p>
            <div className="qr-display-container">
              {qrUrl && <img src={qrUrl} alt="QR Code" className="qr-image" />}
            </div>
            <div className="modal-actions">
              <button className="btn-primary" onClick={handleDescargarQR}>⬇ Descargar</button>
              <button className="btn-secondary" onClick={cerrarModal}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {errorModal.isOpen && (
        <div className="modal-overlay" onClick={closeError}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', borderTop: '5px solid #e74c3c' }}>
            <button className="btn-close" onClick={closeError}>×</button>
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: '50px', marginBottom: '15px' }}>⚠️</div>
              <h3 style={{ color: '#e74c3c', margin: '0 0 10px 0' }}>Operación Denegada</h3>
              <p style={{ fontSize: '1.1rem', color: '#555', lineHeight: '1.5' }}>
                {errorModal.message}
              </p>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={closeError} style={{ backgroundColor: '#e74c3c', color: 'white', border: 'none' }}>
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BicicleteroManager;