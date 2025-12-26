import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBicicleteros, CrearBicicletero, ActualizarBicicletero, deleteBicicletero } from '../services/bicicletero.service.js';
import { getPersonal, createPersonal, updatePersonal, deletePersonal } from '../services/user.service.js';
import Map, {Marker, NavigationControl} from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './AdminDashboard.css';

function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('bicicleteros');
  const [filtroRol, setFiltroRol] = useState('todos');

  // --- Estado Datos ---
  const [bicicleteros, setBicicleteros] = useState([]);
  const [Personal, setPersonal] = useState([]);
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
  const [guardiaId, setguardiaId] = useState('');

  // --- Estado Formulario Personal ---
  const [editarPersonalRut, setEditarPersonalRut] = useState(null); // null = modo crear
  const [pRut, setpRut] = useState('');
  const [pNombre, setpNombre] = useState('');
  const [pApellido, setpApellido] = useState('');
  const [pGmail, setpGmail] = useState('');
  const [pPassword, setpPassword] = useState('');
  const [pRole, setpRole] = useState('guardia');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      const [bicicleterosData, personalData] = await Promise.all([
        getBicicleteros(),
        getPersonal()
      ]);

      setBicicleteros(bicicleterosData.data || []);
      setPersonal(personalData.data || []);
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
    setguardiaId('');
    setError('');
  };

  const handleEditClick = (bicicletero) =>{
    setEditarId(bicicletero.id);
    setUbicacion(bicicletero.ubicacion);
    setCapacidad(bicicletero.capacidad);
    setEstado(bicicletero.estado);
    setHoraApertura(bicicletero.horaApertura);
    setHoraCierre(bicicletero.horaCierre);
    setguardiaId(bicicletero.guardiaAsignado ? bicicletero.guardiaAsignado.rut:'' );
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

  // --- Lógica Personal ---
  const resetFormularioPersonal = () => {
    setEditarPersonalRut(null);
    setpRut('');
    setpNombre('');
    setpApellido('');
    setpGmail('');
    setpPassword('');
    setpRole('guardia');
    setError('');
  };

  const handleEditPersonalClick = (usuario) => {
    setEditarPersonalRut(usuario.rut);
    setpRut(usuario.rut);
    setpNombre(usuario.nombre);
    setpApellido(usuario.apellido);
    setpGmail(usuario.email);
    setpRole(usuario.role||'guardia');
    setpPassword(''); // No llenamos la contraseña por seguridad
  };

  const handlePersonalSubmit = async (e) => {
    e.preventDefault();
    const currentUser = JSON.parse(localStorage.getItem('user'));
    if (editarPersonalRut === currentUser.rut && pRole !== 'admin') {
      setError("No puedes quitarte el rol de administrador a ti mismo.");
      return;
    }

    try {
      setError('');
      const personalData = {
        rut: pRut,
        nombre: pNombre,
        apellido: pApellido,
        email: pGmail,
        password: pPassword,
        role: pRole
      };

      if (editarPersonalRut) {
        await updatePersonal(editarPersonalRut, personalData);
        alert('Usuario actualizado');
      } else {
        if (!pPassword) throw new Error("La contraseña es obligatoria para crear un nuevo Usuario.");
        await createPersonal(personalData);
        alert('Usuario creado');
      }

      resetFormularioPersonal();
      fetchData(); 
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeletePersonal = async (rut) => {
    const currentUser = JSON.parse(localStorage.getItem('user'));
    if (rut === currentUser.rut) {
      alert("No puedes eliminar tu propio usuario.");
      return;
    }

    if(!window.confirm("¿Estás seguro de eliminar este usuario?")) return;
    try {
      await deletePersonal(rut);
      alert('Usuario eliminado');
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

  const personalFiltrado = Personal.filter(p => {
    //muestra todos
    if(filtroRol === 'todos') return true;
    //filtra por rol
    return p.role === filtroRol;
  });

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
                className={`menu-item ${activeTab === 'Personal' ? 'active' : ''}`}
                onClick={() => setActiveTab('Personal')}
            >
                👮 Personal
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
        
        {/* VISTA: GESTIÓN DE Personal */}
        {activeTab === 'Personal' && (
            <div className="content-section fade-in">
                <div className="section-header">
                    <h2>Gestión de Personal</h2>
                </div>
                
                <div className="card-container">
                    <form onSubmit={handlePersonalSubmit} className="admin-form grid-2-col">
                        <div>
                            <label>RUT:</label>
                            <input 
                                type="text" 
                                value={pRut} 
                                onChange={e => setpRut(e.target.value)} 
                                disabled={!!editarPersonalRut} 
                                required 
                                placeholder="Ej: 12345678-9"
                            />
                        </div>
                        <div>
                            <label>Email:</label>
                            <input type="email" value={pGmail} onChange={e => setpGmail(e.target.value)} required />
                        </div>

                        <div>
                            <label>Nombre:</label>
                            <input type="text" value={pNombre} onChange={e => setpNombre(e.target.value)} required />
                        </div>

                        <div>
                            <label>Apellido:</label>
                            <input type="text" value={pApellido} onChange={e => setpApellido(e.target.value)} required />
                        </div>

                        <div>
                          <label>Rol:</label>
                          <select value={pRole} onChange={e => setpRole(e.target.value)}>
                            <option value="guardia">Guardia</option>
                            <option value="admin">Administrador</option>
                          </select> 
                        </div>

                        <div>
                            <label>Contraseña:</label>
                            <input 
                                type="password" 
                                value={pPassword} 
                                onChange={e => setpPassword(e.target.value)} 
                                placeholder={editarPersonalRut ? "(Dejar en blanco para mantener)" : "Requerida"}
                            />
                        </div>

                        <div className="full-width actions">
                            <button type="submit" className="btn-primary">{editarPersonalRut ? 'Actualizar Personal' : 'Crear Personal'}</button>
                            <button type="button" onClick={resetFormularioPersonal} className="btn-secondary">Cancelar</button>
                        </div>
                    </form>
                </div>

                <div className="table-container">
                  <div style ={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                    <h3>Lista de Personal</h3>
                    <div>
                      <label style ={{marginRight: '10px'}} >Filtrar por:</label>
                      <select value={filtroRol} onChange={e => setFiltroRol(e.target.value)}>
                        <option value="">Todos</option>
                        <option value="guardia">Guardia</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </div>
                  </div>

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
                            {personalFiltrado.length > 0 ? (
                                personalFiltrado.map(p => (
                                    <tr key={p.rut}>
                                        <td>{p.rut}</td>
                                        <td>{p.nombre}</td>
                                        <td>{p.apellido}</td>
                                        <td>{p.email}</td>
                                        <td>
                                          <span style = {{
                                            padding: '4px 8px', borderRadius: '12px', frontSize: '0.85rem', fontWeight: 'bold',
                                            backgroundColor: p.role ==='admin' ? '#e3f2fd' : '#fff3e0',
                                            color: p.role ==='admin' ? '#1565c0' : '#e65100'
                                          }}>
                                          {p.role === 'admin'?'Administrador':'Guardia'}
                                          </span>
                                        </td>
                                        <td>
                                            <button className="btn-edit" onClick={() => handleEditPersonalClick(p)}>Editar</button>
                                            <button className="btn-delete" onClick={() => handleDeletePersonal(p.rut)}>Eliminar</button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="5">No hay usuarios registrados</td></tr>
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
                                <select value={guardiaId} onChange={(e) => setguardiaId(e.target.value)}>
                                    <option value="">(Ninguno)</option>
                                    {Personal.filter(p => p.role === 'guardia').map(g => (
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