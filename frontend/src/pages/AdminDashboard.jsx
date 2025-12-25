import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBicicleteros, CrearBicicletero, ActualizarBicicletero, deleteBicicletero } from '../services/bicicletero.service.js';
import { getGuardias, createGuardia, updateGuardia, deleteGuardia } from '../services/user.service.js';
import Map, {Marker, NavigationControl} from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

function AdminDashboard() {
  const navigate = useNavigate();

  const [bicicleteros, setBicicleteros] = useState([]);
  const [guardias, setGuardias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewState, setViewState] = useState({
    longitude: -73.0134,
    latitude: -36.8222,
    zoom: 16
  });
  const [marcaLocalizacion, setMarcaLocalizacion] = useState({lat: -36.8222, lng: -73.0134});
  const MAPBOX_TOKEN = "pk.eyJ1IjoibWlsZW5ja2FhIiwiYSI6ImNtamxxZDAzYjJxNTIza3B5OXZmcmk1cXMifQ.xW3QubyrM10uSbt08RlAPA";

  const handleMapClick = (event) => {
    const [lng, lat] = event.lngLat;
    //validar limites UBB
    if(lat < -36.8255 || lat > -36.8190 || lng < -73.0170 || lng > -73.0090){
        alert("El bicicletero debe estar dentro del campus UBB");
        return;
    }
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
    <div style={{ padding: '20px' }}>
      <button onClick={handleLogout} style={{float:'right'}}>Cerrar sesión</button>
      <h1>Panel de Administrador</h1>
      
      {/* SECCIÓN 1: GESTIÓN DE GUARDIAS */}
      <section style={{ marginBottom: '40px', border: '1px solid #ccc', padding: '15px' }}>
        <h2>Gestión de Guardias</h2>
        <form onSubmit={handleGuardiaSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
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
            <div style={{ gridColumn: 'span 2', marginTop: '10px' }}>
                <button type="submit">{editarGuardiaRut ? 'Actualizar Guardia' : 'Crear Guardia'}</button>
                <button type="button" onClick={resetFormularioGuardia} style={{ marginLeft: '10px' }}>Cancelar</button>
            </div>
        </form>

        <h4 style={{marginTop: '20px'}}>Lista de Guardias</h4>
        <table border="1" style={{width:'100%', marginTop:'10px'}}>
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
                                <button onClick={() => handleEditGuardiaClick(g)}>Editar</button>
                                <button onClick={() => handleDeleteGuardia(g.rut)} style={{marginLeft: '5px', backgroundColor: '#ffcccc'}}>Eliminar</button>
                            </td>
                        </tr>
                    ))
                ) : (
                    <tr><td colSpan="5">No hay guardias registrados</td></tr>
                )}
            </tbody>
        </table>
      </section>

      <hr />

      {/* SECCIÓN 2: GESTIÓN DE BICICLETEROS */}
      <section>
        <h2>Gestión de Bicicleteros</h2>
        <form onSubmit={handleSubmit}>
          <div style = {{ height: '400px', width: '100%', marginBottom: '20px' }}>
            <Map 
            {...viewState}
            onMove= {evt => setViewState(evt.viewState)}
            style = {{width: '100%', height: '100%'}}
            mapStyle = "mapbox://styles/mapbox/streets-v11"
            mapboxAccessToken = {MAPBOX_TOKEN}
            onClick = {handleMapClick}>
              <NavigationControl/>

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
                      color="blue" 
                      onClick = {() => alert(b.ubicacion)} />
                  )
                ))}
            </Map>
          </div>

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
                <option value="Fuera_de_servicio">Fuera de servicio</option>
              </select>
            </div>
            <div>
              <label>Horarios: </label>
              <input type="time" value={horaApertura} onChange={(e) => setHoraApertura(e.target.value)} />
              <span> - </span>
              <input type="time" value={horaCierre} onChange={(e) => setHoraCierre(e.target.value)} />
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
            <button type="submit" style={{marginTop:'10px'}}>{editarId ? 'Actualizar Bicicletero' : 'Añadir Bicicletero'}</button>
            <button type="button" onClick={resetFormulario} style={{marginLeft:'10px'}}>Cancelar</button>
        </form>

        <h4 style={{marginTop: '20px'}}>Bicicleteros existentes</h4>
        <table border="1" style={{width:'100%', marginTop:'10px'}}>
            <thead>
            <tr>
                <th>ID</th>
                <th>Ubicación</th>
                <th>Ocupados</th>
                <th>Capacidad</th>
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
                    <td>{b.id}</td>
                    <td>{b.ubicacion}</td>
                    <td>{b.bicicletasGuardadas}</td>
                    <td>{b.capacidad}</td>
                    <td>{b.estado}</td>
                    <td>{b.horaApertura && b.horaCierre ? `${b.horaApertura} - ${b.horaCierre}` : '24/7'}</td>
                    <td>{b.guardiaAsignado ? `${b.guardiaAsignado.nombre} ${b.guardiaAsignado.apellido}` : '(Sin asignar)'}</td>
                    <td>
                    <button onClick={() => handleEditClick(b)}>Editar</button>
                    <button onClick={() => handleDeleteBicicletero(b.id)} style={{marginLeft: '5px', backgroundColor: '#ffcccc'}}>Eliminar</button> 
                    </td>
                </tr>
                )) 
            ) : (
                <tr><td colSpan="8">No hay bicicleteros registrados</td></tr>
            )}
            </tbody>
        </table>
      </section>
    </div>
  );
}

export default AdminDashboard;