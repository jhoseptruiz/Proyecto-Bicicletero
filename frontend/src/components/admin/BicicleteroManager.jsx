import React, { useState } from 'react';
import Map, { Marker, NavigationControl } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { CrearBicicletero, ActualizarBicicletero, deleteBicicletero } from '../../services/bicicletero.service.js';
import QRCode from 'qrcode';

function BicicleteroManager({ bicicleterosList, personalList, onRefresh }) {
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [error, setError] = useState('');

  // Estado Mapa 
  const [viewState, setViewState] = useState({
    longitude: -73.0134,
    latitude: -36.8222,
    zoom: 16
  });
  const [marcaLocalizacion, setMarcaLocalizacion] = useState({ lat: -36.8222, lng: -73.0134 });
  const MAPBOX_TOKEN = "pk.eyJ1IjoibWlsZW5ja2FhIiwiYSI6ImNtamxxZDAzYjJxNTIza3B5OXZmcmk1cXMifQ.xW3QubyrM10uSbt08RlAPA";

  // Estado Formulario Bicicletero 
  const [editarId, setEditarId] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [capacidad, setCapacidad] = useState(15);
  const [estado, setEstado] = useState('operativo');
  const [horaApertura, setHoraApertura] = useState('07:00');
  const [horaCierre, setHoraCierre] = useState('21:00');
  const [guardiaId, setguardiaId] = useState('');

  // Estados qr
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrUrl, setQrUrl] = useState('');
  const [selectedBicicletero, setSelectedBicicletero] = useState(null);

  const getColorEstado = (estado) => {
    switch (estado) {
      case 'operativo': return 'green';
      case 'mantenimiento': return 'orange';
      case 'fuera_de_Servicio': return 'red';
      default: return 'gray';
    }
  };

  const handleMapClick = (event) => {
    const { lng, lat } = event.lngLat;
    //limites UBB
    const limitesUBB = [
      { lat: -36.82062174, lng: -73.01483544 },
      { lat: -36.82082823, lng: -73.01619221 },
      { lat: -36.82223570, lng: -73.01659265 },
      { lat: -36.82410483, lng: -73.01509450 },
      { lat: -36.82445675, lng: -73.01175369 },
      { lat: -36.82155629, lng: -73.01028303 },
    ];
    //validar limites UBB
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
      alert("El bicicletero debe estar dentro del campus UBB");
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
    setguardiaId('');
    setError('');
  };

  const handleEditClick = (bicicletero) => {
    setEditarId(bicicletero.id);
    setUbicacion(bicicletero.ubicacion);
    setCapacidad(bicicletero.capacidad);
    setEstado(bicicletero.estado);
    setHoraApertura(bicicletero.horaApertura);
    setHoraCierre(bicicletero.horaCierre);
    setguardiaId(bicicletero.guardiaAsignado ? bicicletero.guardiaAsignado.rut : '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      const newData = {
        ubicacion,
        capacidad: parseInt(capacidad, 10),
        estado,
        horaApertura: horaApertura || null,
        horaCierre: horaCierre || null,
        guardiaId: guardiaId || null,
        latitud: marcaLocalizacion.lat,
        longitud: marcaLocalizacion.lng,
      };

      if (editarId) {
        await ActualizarBicicletero(editarId, newData);
        alert('Bicicletero actualizado');
      } else {
        await CrearBicicletero(newData);
        alert('Bicicletero creado');
      }
      resetFormulario();
      onRefresh(); // Recargar datos en el padre
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteBicicletero = async (id) => {
    if (!window.confirm("¿Estás seguro de eliminar este bicicletero?")) return;
    try {
      await deleteBicicletero(id);
      alert('Bicicletero eliminado');
      onRefresh(); // Recargar datos en el padre
    } catch (err) {
      setError(err.message);
    }
  };

  const bicicleterosFiltrados = bicicleterosList.filter(b => {
    if (filtroEstado === 'todos') return true;
    return b.estado === filtroEstado;
  });

  const handleVerQR = async (bicicletero) => {
    try {
      // Creamos un objeto con los datos vitales para la validación
      const qrData = JSON.stringify({
        id: bicicletero.id,
        lat: parseFloat(bicicletero.latitud),
        lng: parseFloat(bicicletero.longitud),
        tipo: 'bicicletero_ubicacion' // Identificador para saber qué estamos escaneando
      });

      // Generamos la imagen
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
      alert("No se pudo generar el código QR");
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

      {error && <div style={{ color: 'red', marginBottom: '10px' }}>Error: {error}</div>}

      <div className="bicicleteros-layout">
        {/* Columna Izquierda: Mapa */}
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

        {/* Columna Derecha: Formulario */}
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
            <div>
              <label>Guardia Asignado: </label>
              <select value={guardiaId} onChange={(e) => setguardiaId(e.target.value)}>
                <option value="">(Ninguno)</option>
                {personalList.filter(p => p.role === 'guardia').map(g => (
                  <option key={g.rut} value={g.rut}>{g.nombre} {g.apellido}</option>
                ))}
              </select>
            </div>
            <div className="actions">
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
              <option value="fuera_de_servicio">Fuera de servicio</option>
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
              <th>Guardia</th>
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
                  <td>{b.guardiaAsignado ? `${b.guardiaAsignado.nombre}` : '-'}</td>
                  <td>
                    <button className="btn-edit" onClick={() => handleEditClick(b)}>Editar</button>
                    <button className="btn-primary" style={{ padding: '5px 10px', fontSize: '0.9rem', backgroundColor: '#6c757d' }}
                      onClick={() => handleVerQR(b)}>Ver QR</button>
                    <button className="btn-delete" onClick={() => handleDeleteBicicletero(b.id)}>Eliminar</button>
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
              <button className="btn-primary" onClick={handleDescargarQR}>
                ⬇ Descargar
              </button>
              <button className="btn-secondary" onClick={cerrarModal}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BicicleteroManager;