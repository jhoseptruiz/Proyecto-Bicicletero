import React, { useState, useEffect } from 'react';
import {useNavigate} from 'react-router-dom';
import { getBicicleteros, CrearBicicletero } from '../services/bicicletero.service.js';
import { getGuardias } from '../services/user.service.js';

function AdminDashboard() {
  const navigate = useNavigate();

  const [bicicleteros, setBicicleteros] = useState([]);
  const [guardias, setGuardias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  //formulario
  const [ubicacion, setUbicacion] = useState('');
  const [capacidad, setCapacidad] = useState(15);
  const [estado, setEstado] = useState('operativo');
  const [horaApertura, setHoraApertura] = useState('07:00');
  const [horaCierre, setHoraCierre] = useState('21:00');
  const [guardiaId, setGuardiaId] = useState('');

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
    } finally {
      setLoading(false);
    }
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

      await CrearBicicletero(newData);
      alert('Bicicletero creado..');

      //limpiar formulario y muestra lista
      setUbicacion('');
      setCapacidad(15);
      setHoraApertura('07:00');
      setHoraCierre('21:00');
      setGuardiaId('');
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

    //cierra sesion
  const handleLogout = () =>{
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    navigate('/login');
  };

  if (loading) {
    return <div>Cargando panel del administrador...</div>;
  }
  if (error) {
    return <div style={{ color: 'red' }}>Error: {error}</div>;
  }
  return (
    <div>
      <button onClick = {handleLogout} style={{float:'right'}}>Cerrar sesión</button>
      <h1>Panel de Administrador</h1>
      <hr />
      <h3>Creacion de Bicicleteros</h3>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Ubicacion: </label>
          <input
            type="text"
            value={ubicacion}
            onChange={(e) => setUbicacion(e.target.value)}
            required
          ></input>
        </div>
        <div>
          <label>Capacidad: </label>
          <input
            type="number"
            value={capacidad}
            onChange={(e) => setCapacidad(e.target.value)}
            required
            min={0}
            max={15}
          ></input>
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
          <input
            type="time"
            value={horaApertura}
            onChange={(e) => setHoraApertura(e.target.value)}>
          </input>
          <span> - </span>
          <input
          type= "time"
          value = {horaCierre}
          onChange={(e) => setHoraCierre(e.target.value)}
          ></input>
          <small>(Dejar vacios para 24/7)</small>
        </div>
        <div>
          <label>Guardia Asignado: </label>
          <select value = {guardiaId} onChange={(e) => setGuardiaId(e.target.value)}>
            <option value = "">(Ninguno)</option>
            {guardias.map(guardias =>(
              <option key= {guardias.id} value= {guardias.id} >{guardias.nombre} {guardias.apellido}</option>
            ))}
          </select>
        </div>
        <button type = "submit">Añadir bicicletero</button>
      </form >
      <hr />

      <h3>Biciclteros existentes</h3>
      <table border= "1" style={{width:'100%'}}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Ubicacion</th>
            <th>Ocupados</th>
            <th>Capacidad</th>
            <th>Estado</th>
            <th>Horarios</th>
            <th>Guardia</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {bicicleteros.length > 0?(
            bicicleteros.map(b =>(
              <tr key= {b.id}>
                <td>{b.id}</td>
                <td>{b.ubicacion}</td>
                <td>{b.bicicletasGuardadas}</td>
                <td>{b.capacidad}</td>
                <td>{b.estado}</td>
                <td>{b.horaApertura && b.horaCierre?
                `${b.horaApertura} - ${b.horaCierre}` : '24/7'}</td>
                <td>{b.guardiaAsignado?
                `${b.guardiaAsignado.nombre} ${b.guardiaAsignado.apellido}` : 
                '(Sin asignar)'}</td>
                <td>
                  <button>Editar</button>
                  <button>Eliminar</button>
                </td>
              </tr>
            )) 
          ):(
            <tr>
              <td colSpan = "7">No hay bicicleteros registrados</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default AdminDashboard;