import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBicicleteros, CrearBicicletero, ActualizarBicicletero, deleteBicicletero } from '../services/bicicletero.service.js';
import { getGuardias, createGuardia, updateGuardia, deleteGuardia } from '../services/user.service.js';
import Map, {Marker, NavigationControl} from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './AdminDashboard.css';

function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('bicicleteros');

  // --- Estado Datos ---
  const [bicicleteros, setBicicleteros] = useState([]);
  const [guardias, setGuardias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewState, setViewState] = useState({
    longitude: -73.0134,
    latitude: -36.8222,
    zoom: 16
  });
  // --- Estado Mapa ---
  const [marcaLocalizacion, setMarcaLocalizacion] = useState({lat: -36.8222, lng: -73.0134});
  const MAPBOX_TOKEN = "pk.eyJ1IjoibWlsZW5ja2FhIiwiYSI6ImNtamxxZDAzYjJxNTIza3B5OXZmcmk1cXMifQ.xW3QubyrM10uSbt08RlAPA";
  
  const getColorEstado = (estado) => {
    switch(estado){
      case 'operativo': return 'green';
      case 'mantenimiento': return 'orange';
      case 'fuera_de_Servicio': return 'red';
      default: return 'gray';
    }
  };

  const handleMapClick = (event) => {
    const {lng, lat} = event.lngLat;
    //limites UBB
    const limitesUBB =[
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
    //ejecutar validacion
    const estaDentro = puntoLimite(lat, lng, limitesUBB);
    if(!estaDentro){
        alert("El bicicletero debe estar dentro del campus UBB");
        return;
    }
    //si pasa validacion marca la ubicacion
    setMarcaLocalizacion({lat, lng});
  };

  // --- Estado Formulario Bicicletero ---
  const [editarId, setEditarId] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [capacidad, setCapacidad] = useState(15);
  const [estado, setEstado] = useState('operativo');
  const [horaApertura, setHoraApertura] = useState('07:00');
  const [horaCierre, setHoraCierre] = useState('21:00');
  const [guardiaId, setGuardiaId] = useState('');

  // --- Estado Formulario Guardia ---
  const [editarGuardiaRut, setEditarGuardiaRut] = useState(null); // null = modo crear
  const [gRut, setGRut] = useState('');
  const [gNombre, setGNombre] = useState('');
  const [gApellido, setGApellido] = useState('');
  const [gEmail, setGEmail] = useState('');
  const [gPassword, setGPassword] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      const [bicicleterosData, guardiasData] = await Promise.all([
        getBicicleteros(),
        getGuardias()
      ]);

      setBicicleteros(bicicleterosData.data || []);
      setGuardias(guardiasData.data || []);
    } catch (err) {
      setError(err.message);
      // Si el error es 401 (Unauthorized), redirigir al login
      if (err.message.includes("401")) {
         handleLogout();
      }
    } finally {
      setLoading(false);
    }
  };
  
  // --- Lógica Bicicleteros ---
  const resetFormulario = () =>{
    setEditarId(null);
    setUbicacion('');
    setCapacidad(15);
    setEstado('operativo');
    setHoraApertura('07:00');
    setHoraCierre('21:00');
    setGuardiaId('');
    setError('');
  };

  const handleEditClick = (bicicletero) =>{
    setEditarId(bicicletero.id);
    setUbicacion(bicicletero.ubicacion);
    setCapacidad(bicicletero.capacidad);
    setEstado(bicicletero.estado);
    setHoraApertura(bicicletero.horaApertura);
    setHoraCierre(bicicletero.horaCierre);
    setGuardiaId(bicicletero.guardiaAsignado ? bicicletero.guardiaAsignado.rut:'' );
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

      if(editarId){
        await ActualizarBicicletero(editarId, newData);
        alert('Bicicletero actualizado');
      }else{
        await CrearBicicletero(newData);
        alert('Bicicletero creado');
      }
      resetFormulario();
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteBicicletero = async (id) => {
    if(!window.confirm("¿Estás seguro de eliminar este bicicletero?")) return;
    try {
      await deleteBicicletero(id);
      setBicicleteros(bicicleteros.filter(b => b.id !== id));
      alert('Bicicletero eliminado');
    } catch (err) {
      setError(err.message);
    }
  };

  // --- Lógica Guardias ---
  const resetFormularioGuardia = () => {
    setEditarGuardiaRut(null);
    setGRut('');
    setGNombre('');
    setGApellido('');
    setGEmail('');
    setGPassword('');
    setError('');
  };

  const handleEditGuardiaClick = (guardia) => {
    setEditarGuardiaRut(guardia.rut);
    setGRut(guardia.rut);
    setGNombre(guardia.nombre);
    setGApellido(guardia.apellido);
    setGEmail(guardia.email);
    setGPassword(''); // No llenamos la contraseña por seguridad
  };

  const handleGuardiaSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      const guardiaData = {
        rut: gRut,
        nombre: gNombre,
        apellido: gApellido,
        email: gEmail,
        password: gPassword 
      };

      if (editarGuardiaRut) {
        await updateGuardia(editarGuardiaRut, guardiaData);
        alert('Guardia actualizado');
      } else {
        if (!gPassword) throw new Error("La contraseña es obligatoria para crear un nuevo guardia");
        await createGuardia(guardiaData);
        alert('Guardia creado');
      }

      resetFormularioGuardia();
      fetchData(); 
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteGuardia = async (rut) => {
    if(!window.confirm("¿Estás seguro de eliminar este guardia?")) return;
    try {
      await deleteGuardia(rut);
      alert('Guardia eliminado');
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };
  
  // --- Logout ---
  const handleLogout = () =>{
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (loading) return <div>Cargando panel...</div>;
  if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;

  return (
    <div className="admin-layout">
      
      {/* --- SIDEBAR --- */}
      <aside className="sidebar">
        <div className="sidebar-header">
            <h2>Admin Panel</h2>
        </div>
        
        <nav className="sidebar-menu">
            <button 
                className={`menu-item ${activeTab === 'bicicleteros' ? 'active' : ''}`}
                onClick={() => setActiveTab('bicicleteros')}
            >
                🚲 Bicicleteros
            </button>
            <button 
                className={`menu-item ${activeTab === 'guardias' ? 'active' : ''}`}
                onClick={() => setActiveTab('guardias')}
            >
                👮 Guardias
            </button>
        </nav>

        <div className="sidebar-footer">
            <button onClick={handleLogout} className="logout-btn">
                Cerrar sesión
            </button>
        </div>
      </aside>

      {/* --- CONTENIDO PRINCIPAL --- */}
      <main className="main-content">
        
        {/* VISTA: GESTIÓN DE GUARDIAS */}
        {activeTab === 'guardias' && (
            <div className="content-section fade-in">
                <div className="section-header">
                    <h2>Gestión de Guardias</h2>
                </div>
                
                <div className="card-container">
                    <form onSubmit={handleGuardiaSubmit} className="admin-form grid-2-col">
                        <div>
                            <label>RUT:</label>
                            <input 
                                type="text" 
                                value={gRut} 
                                onChange={e => setGRut(e.target.value)} 
                                disabled={!!editarGuardiaRut} 
                                required 
                                placeholder="Ej: 12345678-9"
                            />
                        </div>
                        <div>
                            <label>Email:</label>
                            <input type="email" value={gEmail} onChange={e => setGEmail(e.target.value)} required />
                        </div>
                        <div>
                            <label>Nombre:</label>
                            <input type="text" value={gNombre} onChange={e => setGNombre(e.target.value)} required />
                        </div>
                        <div>
                            <label>Apellido:</label>
                            <input type="text" value={gApellido} onChange={e => setGApellido(e.target.value)} required />
                        </div>
                        <div>
                            <label>Contraseña:</label>
                            <input 
                                type="password" 
                                value={gPassword} 
                                onChange={e => setGPassword(e.target.value)} 
                                placeholder={editarGuardiaRut ? "(Dejar en blanco para mantener)" : "Requerida"}
                            />
                        </div>
                        <div className="full-width actions">
                            <button type="submit" className="btn-primary">{editarGuardiaRut ? 'Actualizar Guardia' : 'Crear Guardia'}</button>
                            <button type="button" onClick={resetFormularioGuardia} className="btn-secondary">Cancelar</button>
                        </div>
                    </form>
                </div>

                <div className="table-container">
                    <h3>Lista de Guardias</h3>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>RUT</th>
                                <th>Nombre</th>
                                <th>Apellido</th>
                                <th>Email</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {guardias.length > 0 ? (
                                guardias.map(g => (
                                    <tr key={g.rut}>
                                        <td>{g.rut}</td>
                                        <td>{g.nombre}</td>
                                        <td>{g.apellido}</td>
                                        <td>{g.email}</td>
                                        <td>
                                            <button className="btn-edit" onClick={() => handleEditGuardiaClick(g)}>Editar</button>
                                            <button className="btn-delete" onClick={() => handleDeleteGuardia(g.rut)}>Eliminar</button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="5">No hay guardias registrados</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* VISTA: GESTIÓN DE BICICLETEROS */}
        {activeTab === 'bicicleteros' && (
            <div className="content-section fade-in">
                <div className="section-header">
                    <h2>Gestión de Bicicleteros</h2>
                </div>

                {/* Contenedor flexible para Mapa y Formulario lado a lado en pantallas grandes */}
                <div className="bicicleteros-layout">
                    
                    {/* Columna Izquierda: Mapa */}
                    <div className="map-column">
                        <div className="map-wrapper">
                            <Map 
                            {...viewState}
                            onMove= {evt => setViewState(evt.viewState)}
                            style = {{width: '100%', height: '100%'}}
                            mapStyle = "mapbox://styles/mapbox/streets-v11"
                            mapboxAccessToken = {MAPBOX_TOKEN}
                            onClick = {handleMapClick}>
                            <NavigationControl/>
                            {/* marcador seleccionable */}
                            <Marker 
                                longitude={marcaLocalizacion.lng} 
                                latitude={marcaLocalizacion.lat} 
                                color="red" />
                                {/* marcadores bicicleteros */}
                                {bicicleteros.map(b => (
                                b.latitud && b.longitud &&(
                                    <Marker 
                                    key={b.id}
                                    longitude={parseFloat(b.longitud)}
                                    latitude={parseFloat(b.latitud)}
                                    color={getColorEstado(b.estado)} 
                                    onClick = {(e) =>{
                                        e.originalEvent.stopPropagation();
                                        // Al hacer click en un marcador existente, cargamos sus datos en el form
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
                                <select value={guardiaId} onChange={(e) => setGuardiaId(e.target.value)}>
                                    <option value="">(Ninguno)</option>
                                    {guardias.map(g => (
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
                    <h3>Bicicleteros existentes</h3>
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
                        {bicicleteros.length > 0 ? (
                            bicicleteros.map(b => (
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
                                <button className="btn-delete" onClick={() => handleDeleteBicicletero(b.id)}>Eliminar</button> 
                                </td>
                            </tr>
                            )) 
                        ) : (
                            <tr><td colSpan="6">No hay bicicleteros registrados</td></tr>
                        )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
      </main>
    </div>
  );
}

export default AdminDashboard;