import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { getMisBicicletas } from '../../services/bicicleta.service';
import { scanQr, validateQr, obtenerEstadoBicicletero } from '../../services/checkin.service';
import { useLocation } from 'react-router-dom';

function Scanner({ alCerrar, alIrAlPerfil, action }) {
  // Estados de Flujo: WAITING, SCANNING, DECIDING, PROCESSING, RESULT
  const [step, setStep] = useState('WAITING');

  // Estado para la decisión de acción manual ("Ingresar" vs "Sacar")
  const [actionMode, setActionMode] = useState(action === 'retirar' ? 'RETIRAR' : null);

  const [bicicletas, setBicicletas] = useState([]);
  const [contextData, setContextData] = useState(null);
  const [selectedBicicleta, setSelectedBicicleta] = useState('');
  const [mensaje, setMensaje] = useState(null);
  const [expectedId, setExpectedId] = useState(null);

  // Helper para distancia (Haversine simple)
  const calcularDistancia = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Radio tierra (metros)
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const verificarCondiciones = (detalles, userLat, userLng) => {
    // 1. Estado Operativo
    if (detalles.estado && detalles.estado !== 'operativo') {
      throw new Error(`Este bicicletero está ${detalles.estado} (No operativo).`);
    }

    // 2. Horario
    if (detalles.horaApertura && detalles.horaCierre) {
      const ahora = new Date();
      const [hA, mA] = detalles.horaApertura.split(':');
      const [hC, mC] = detalles.horaCierre.split(':');
      const minutosActual = ahora.getHours() * 60 + ahora.getMinutes();
      const minutosApertura = parseInt(hA) * 60 + parseInt(mA);
      const minutosCierre = parseInt(hC) * 60 + parseInt(mC);

      if (minutosActual < minutosApertura || minutosActual > minutosCierre) {
        throw new Error(`El bicicletero está cerrado. Horario: ${detalles.horaApertura} - ${detalles.horaCierre}`);
      }
    }

    // 3. Distancia (50 metros)
    if (detalles.latitud && detalles.longitud) {
      const latBici = parseFloat(detalles.latitud);
      const lngBici = parseFloat(detalles.longitud);

      const dist = calcularDistancia(userLat, userLng, latBici, lngBici);

      if (dist > 50) {
        throw new Error(`Estás demasiado lejos (${Math.round(dist)}m). Acércate al bicicletero.`);
      }
    }
  };

  const scannerRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    cargarBicicletas();

    if (location.state?.preSelectedBicicletero) {
      handlePreSelected(location.state.preSelectedBicicletero);
    } else {
      return () => stopScanner();
    }
  }, []);

  const handlePreSelected = (bicicletero) => {
    setExpectedId(bicicletero.id);
    setMensaje({ tipo: 'info', texto: `Por favor escanea el QR de: ${bicicletero.ubicacion}` });
    startScanner();
  };

  const cargarBicicletas = async () => {
    try {
      const resp = await getMisBicicletas();
      setBicicletas(resp.data || resp || []);
    } catch (error) {
      console.error("Error cargando bicis", error);
      setMensaje({ tipo: 'error', texto: "Error cargando bicicletas." });
    }
  };

  const startScanner = () => {
    setStep('SCANNING');
    setContextData(null);

    setTimeout(() => {
      if (!document.getElementById("reader")) return;

      const scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );
      scannerRef.current = scanner;
      scanner.render(onScanSuccess, onScanFailure);
    }, 100);
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(console.error);
      scannerRef.current = null;
    }
  };

  const onScanSuccess = async (decodedText) => {
    stopScanner();
    setStep('PROCESSING');
    setMensaje({ tipo: 'info', texto: "Verificando condiciones del bicicletero..." });

    try {
      // 1. Parsear JSON
      let datosQr;
      try {
        datosQr = JSON.parse(decodedText);
      } catch (e) {
        // Retrocompatibilidad simple
        if (!isNaN(decodedText)) {
          datosQr = { id: decodedText, tipo: 'bicicletero_ubicacion' };
        } else {
          throw new Error("Código QR con formato inválido.");
        }
      }

      // 2. Validar estructura
      if (!datosQr.id) {
        throw new Error("QR desconocido. Usa solo QRs de bicicleteros oficiales.");
      }

      // 3. Validar coincidencia con Mapa (si vino del mapa)
      if (expectedId && parseInt(datosQr.id) !== parseInt(expectedId)) {
        throw new Error("Este QR no es el que seleccionaste en el mapa.");
      }

      // 4. Obtener GPS del usuario
      if (!navigator.geolocation) throw new Error("GPS no disponible. Actívalo para continuar.");

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;

            // 5. CONSULTA AL SERVIDOR (Fuente de Verdad)
            const detalles = await obtenerEstadoBicicletero(datosQr.id);

            // 6. Validaciones Estrictas (Fail Fast)
            verificarCondiciones(detalles.data || detalles, userLat, userLng);

            // Si pasa todo, avanzamos
            setContextData({
              id: datosQr.id,
              ubicacion: datosQr.ubicacion || `Bicicletero #${datosQr.id}`,
              lat: userLat,
              lng: userLng
            });

            setStep('DECIDING');
            // Si veniamos con una accion predefinida ('retirar'), la mantenemos. Si no, null.
            setActionMode(action === 'retirar' ? 'RETIRAR' : null);
            setMensaje(null);

          } catch (backendError) {
            setMensaje({ tipo: 'error', texto: backendError.message || "Error validando bicicletero." });
            setStep('WAITING');
          }
        },
        (gpsError) => {
          let errorMsg = "No pudimos obtener tu ubicación.";
          switch (gpsError.code) {
            case gpsError.PERMISSION_DENIED:
              errorMsg = "❌ Permiso de GPS denegado.";
              break;
            case gpsError.POSITION_UNAVAILABLE:
              errorMsg = "📡 Señal GPS débil o no disponible.";
              break;
            case gpsError.TIMEOUT:
              errorMsg = "⌛ El GPS tardó demasiado.";
              break;
            default:
              errorMsg = `Error GPS: ${gpsError.message}`;
          }
          setMensaje({ tipo: 'error', texto: errorMsg });
          setStep('WAITING');
        },
        { timeout: 15000, enableHighAccuracy: true, maximumAge: 0 }
      );

    } catch (error) {
      console.error(error);
      setMensaje({ tipo: 'error', texto: error.message });
      setStep('WAITING');
    }
  };

  const onScanFailure = (error) => {
    // console.warn(error);
  };

  const ejecutarAccion = async () => {
    if (!selectedBicicleta) {
      alert("Selecciona una bicicleta");
      return;
    }

    // Determinamos la acción explícita para el backend
    const tipoAccion = actionMode === 'INGRESAR' ? 'ingreso' : 'salida';

    setStep('PROCESSING');
    setMensaje({ tipo: 'info', texto: "Procesando solicitud con el servidor..." });

    try {
      const { id, lat, lng } = contextData;

      // Enviamos el ID y la ACCIÓN
      const res = await scanQr(id, lat, lng, selectedBicicleta, tipoAccion);

      setMensaje({ tipo: 'success', texto: res.message || "Operación exitosa" });
      setStep('RESULT');
      cargarBicicletas();
    } catch (error) {
      setMensaje({ tipo: 'error', texto: error.message || "Error al procesar" });
      setStep('DECIDING');
    }
  };


  const renderDeciding = () => {
    if (!contextData) return null;

    // Filtros
    // Bicis ADENTRO de ESTE bicicletero (disponibles para sacar)
    const bicisParaRetirar = bicicletas.filter(b =>
      b.estadoActual?.estaAdentro &&
      parseInt(b.estadoActual?.bicicleteroId) === parseInt(contextData.id)
    );

    // Bicis AFUERA (disponibles para ingresar)
    const bicisParaIngresar = bicicletas.filter(b => !b.estadoActual?.estaAdentro);

    // VISTA 1: SELECCIÓN DE ACCIÓN
    if (!actionMode) {
      return (
        <div style={{ textAlign: 'center' }}>
          <h3 style={{ marginBottom: '15px' }}>📍 Estás en: {contextData.ubicacion}</h3>
          <p style={{ marginBottom: '20px' }}>¿Qué deseas hacer?</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <button
              onClick={() => setActionMode('INGRESAR')}
              disabled={bicisParaIngresar.length === 0}
              style={{
                padding: '20px', borderRadius: '12px', border: '2px solid #28a745',
                background: bicisParaIngresar.length > 0 ? '#f0fff4' : '#eee',
                color: bicisParaIngresar.length > 0 ? '#28a745' : '#999',
                cursor: bicisParaIngresar.length > 0 ? 'pointer' : 'not-allowed',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px'
              }}
            >
              <span style={{ fontSize: '2rem' }}>📥</span>
              <span style={{ fontWeight: 'bold' }}>Ingresar</span>
              <span style={{ fontSize: '0.8rem' }}>({bicisParaIngresar.length} disp.)</span>
            </button>

            <button
              onClick={() => setActionMode('RETIRAR')}
              disabled={bicisParaRetirar.length === 0}
              style={{
                padding: '20px', borderRadius: '12px', border: '2px solid #17a2b8',
                background: bicisParaRetirar.length > 0 ? '#f0faff' : '#eee',
                color: bicisParaRetirar.length > 0 ? '#17a2b8' : '#999',
                cursor: bicisParaRetirar.length > 0 ? 'pointer' : 'not-allowed',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px'
              }}
            >
              <span style={{ fontSize: '2rem' }}>📤</span>
              <span style={{ fontWeight: 'bold' }}>Sacar</span>
              <span style={{ fontSize: '0.8rem' }}>({bicisParaRetirar.length} disp.)</span>
            </button>
          </div>

          <button onClick={() => {
            if (alCerrar) alCerrar();
            else setStep('WAITING');
          }} style={{ marginTop: '25px', background: 'none', border: 'none', color: '#666', textDecoration: 'underline', cursor: 'pointer' }}>
            Cancelar operación
          </button>
        </div>
      );
    }

    // VISTA 2: LISTA DE BICICLETAS (Según selección)
    return (
      <div className="fade-in">
        <button onClick={() => { setActionMode(null); setSelectedBicicleta(''); }} style={{ marginBottom: '15px', background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}>
          ← Volver atrás
        </button>

        <h3 style={{ color: actionMode === 'INGRESAR' ? '#28a745' : '#17a2b8', marginBottom: '10px' }}>
          {actionMode === 'INGRESAR' ? '📥 Ingresar Bicicleta' : '📤 Retirar Bicicleta'}
        </h3>

        <p style={{ fontSize: '0.9em', color: '#555', marginBottom: '15px' }}>
          Selecciona la bicicleta que vas a {actionMode === 'INGRESAR' ? 'guardar aquí' : 'llevarte'}:
        </p>

        <select
          style={{ width: '100%', padding: '12px', marginBottom: '20px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '1rem' }}
          onChange={(e) => setSelectedBicicleta(e.target.value)}
          value={selectedBicicleta}
        >
          <option value="">-- Selecciona tu bicicleta --</option>
          {(actionMode === 'INGRESAR' ? bicisParaIngresar : bicisParaRetirar).map(b => (
            <option key={b.id} value={b.id}>
              {b.marca} {b.modelo} - {b.color}
            </option>
          ))}
        </select>

        <button
          onClick={ejecutarAccion}
          disabled={!selectedBicicleta}
          className="btn-primary"
          style={{
            backgroundColor: actionMode === 'INGRESAR' ? '#28a745' : '#17a2b8',
            width: '100%', color: 'white', padding: '12px', border: 'none', borderRadius: '8px',
            fontSize: '1rem', fontWeight: 'bold',
            opacity: !selectedBicicleta ? 0.6 : 1,
            cursor: !selectedBicicleta ? 'not-allowed' : 'pointer'
          }}
        >
          Confirmar {actionMode === 'INGRESAR' ? 'Ingreso' : 'Retiro'}
        </button>
      </div>
    );
  };

  return (
    <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '8px', marginTop: '20px' }}>

      {mensaje && (
        <div style={{
          padding: '10px', marginBottom: '15px', borderRadius: '4px',
          backgroundColor: mensaje.tipo === 'error' ? '#ffeeee' : (mensaje.tipo === 'success' ? '#eeffee' : '#eef9ff'),
          color: mensaje.tipo === 'error' ? 'red' : (mensaje.tipo === 'success' ? 'green' : '#0055aa'),
        }}>
          {mensaje.texto}
        </div>
      )}

      {step === 'WAITING' && (
        <div style={{ textAlign: 'center' }}>
          <h2>Scanner QR</h2>
          <p>Acércate al bicicletero y escanea el código.</p>
          <button onClick={startScanner} style={{ padding: '15px 30px', fontSize: '18px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '50px', cursor: 'pointer' }}>
            📷 Escanear QR
          </button>
        </div>
      )}

      {step === 'SCANNING' && (
        <div>
          <h3>Escanear Código...</h3>
          <div id="reader" width="100%"></div>
          <button onClick={() => {
            stopScanner();
            if (alCerrar) alCerrar();
            else setStep('WAITING');
          }} style={{ marginTop: '10px', width: '100%', padding: '10px' }}>Cancelar</button>
        </div>
      )}

      {step === 'DECIDING' && renderDeciding()}

      {step === 'RESULT' && (
        <div style={{ textAlign: 'center' }}>
          <h3>¡Listo!</h3>
          <p>{mensaje?.texto}</p>
          <button onClick={() => {
            if (alCerrar) alCerrar();
            else setStep('WAITING');
          }} style={{ marginTop: '10px', padding: '10px 20px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px' }}>Volver al Inicio</button>
        </div>
      )}

      {step === 'PROCESSING' && <p style={{ textAlign: 'center' }}>Procesando...</p>}

    </div>
  );
}

export default Scanner;