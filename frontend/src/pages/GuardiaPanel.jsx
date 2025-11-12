import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMisBicicleteros } from '../services/guardia.service.js';

function GuardiaPanel() {
  const navigate = useNavigate();
  
  // --- Estados ---
  const [bicicleteros, setBicicleteros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // --- Carga de Datos ---
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      // 1. Llamamos al nuevo servicio del guardia
      const bicicleterosData = await getMisBicicleteros();
      setBicicleteros(bicicleterosData.data || []);
      
      // 2. (Futuro) Aquí también cargarías las solicitudes pendientes y bicis estacionadas
      // const solicitudesData = await getSolicitudesPendientes();
      // const estacionadasData = await getBicicletasActivas();

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Manejador de Logout ---
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login'); // Redirigimos al login
  };

  // --- Manejadores de Acciones (Esqueleto) ---
  // Estos botones aún no hacen nada, como pediste.
  const handleAprobar = (idSolicitud) => {
    const casillero = prompt("Ingresar número de casillero físico:");
    if (casillero) {
      alert(`(Esqueleto) Aprobando solicitud ${idSolicitud} en casillero ${casillero}`);
      // Aquí iría la llamada al servicio: await aprobarIngreso(idSolicitud, casillero);
    }
  };

  const handleRechazar = (idSolicitud) => {
    alert(`(Esqueleto) Rechazando solicitud ${idSolicitud}`);
  };

  const handleModificar = (idEstancia) => {
    const nuevoCasillero = prompt("Ingresar nuevo número de casillero:");
    if (nuevoCasillero) {
      alert(`(Esqueleto) Modificando registro ${idEstancia} al casillero ${nuevoCasillero}`);
    }
  };

  const handleFinalizar = (idEstancia) => {
    if (window.confirm("¿Confirmar entrega y finalizar estadía?")) {
      alert(`(Esqueleto) Finalizando estadía ${idEstancia}`);
    }
  };

  // --- Renderizado ---
  if (loading) {
    return <div>Cargando panel del guardia...</div>;
  }
  if (error) {
    return <div style={{ color: 'red' }}>Error: {error}</div>;
  }

  return (
    <div>
      <button onClick={handleLogout} style={{ float: 'right' }}>Cerrar sesión</button>
      <h1>Panel de Guardia</h1>
      <p>Bienvenido, Guardia. Aquí gestiona los ingresos y egresos.</p>
      
      <hr />

      {/* SECCIÓN 1: BICICLETEROS ASIGNADOS (DATOS REALES) */}
      <h3>Mis Bicicleteros Asignados</h3>
      <table border="1" style={{ width: '100%', marginBottom: '20px' }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Ubicación</th>
            <th>Estado</th>
            <th>Horarios</th>
          </tr>
        </thead>
        <tbody>
          {bicicleteros.length > 0 ? (
            bicicleteros.map(b => (
              <tr key={b.id}>
                <td>{b.id}</td>
                <td>{b.ubicacion}</td>
                <td>{b.estado}</td>
                <td>{b.horaApertura && b.horaCierre ? `${b.horaApertura} - ${b.horaCierre}` : '24/7'}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="4">No tienes bicicleteros asignados.</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* SECCIÓN 2: SOLICITUDES PENDIENTES (ESQUELETO) */}
      <h3>Solicitudes de Ingreso Pendientes</h3>
      <table border="1" style={{ width: '100%', marginBottom: '20px' }}>
        <thead>
          <tr>
            <th>Usuario (RUT)</th>
            <th>Datos de Validación</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {/* Fila de ejemplo 1 (Datos Ficticios) */}
          <tr>
            <td>20.123.456-7</td>
            <td>Marca: "Oxford", Modelo: "Rojo"</td>
            <td>
              <button onClick={() => handleAprobar(1)}>Aprobar</button>
              <button onClick={() => handleRechazar(1)}>Rechazar</button>
            </td>
          </tr>
          {/* Fila de ejemplo 2 (Datos Ficticios) */}
          <tr>
            <td>19.876.543-K</td>
            <td>Marca: "Trek", Modelo: "Azul"</td>
            <td>
              <button onClick={() => handleAprobar(2)}>Aprobar</button>
              <button onClick={() => handleRechazar(2)}>Rechazar</button>
            </td>
          </tr>
        </tbody>
      </table>

      {/* SECCIÓN 3: BICICLETAS ESTACIONADAS (ESQUELETO) */}
      <h3>Bicicletas Estacionadas (Registros Activos)</h3>
      {/* A futuro, aquí habría un input para buscar por RUT */}
      <table border="1" style={{ width: '100%' }}>
        <thead>
          <tr>
            <th>Usuario (RUT)</th>
            <th>Casillero Físico</th>
            <th>Hora de Ingreso</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {/* Fila de ejemplo 1 (Datos Ficticios) */}
          <tr>
            <td>18.111.222-3</td>
            <td>A-05</td>
            <td>08:30 AM</td>
            <td>
              <button onClick={() => handleModificar(101)}>Modificar</button>
              <button onClick={() => handleFinalizar(101)}>Finalizar (Entregar)</button>
            </td>
          </tr>
          {/* Fila de ejemplo 2 (Datos Ficticios) */}
          <tr>
            <td>20.333.444-5</td>
            <td>B-12</td>
            <td>09:15 AM</td>
            <td>
              <button onClick={() => handleModificar(102)}>Modificar</button>
              <button onClick={() => handleFinalizar(102)}>Finalizar (Entregar)</button>
            </td>
          </tr>
        </tbody>
      </table>

    </div>
  );
}

export default GuardiaPanel;