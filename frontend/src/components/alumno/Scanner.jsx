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

  // ...

  const handlePreSelected = (bicicletero) => {
    setExpectedId(bicicletero.id);
    setMensaje({ tipo: 'info', texto: `Por favor escanea el QR de: ${bicicletero.ubicacion}` });
    startScanner();
  };

  // ...

  const onScanSuccess = async (decodedText) => {
    stopScanner();
    setStep('PROCESSING');
    setMensaje({ tipo: 'info', texto: "Verificando condiciones del bicicletero..." });

    try {
      // 1. Parsear JSON
      let datosQr;
      try { datosQr = JSON.parse(decodedText); }
      catch (e) { throw new Error("Código QR con formato inválido."); }

      // 2. Validar estructura
      if (!datosQr.id || datosQr.tipo !== 'bicicletero_ubicacion') {
        throw new Error("QR desconocido. Usa solo QRs de bicicleteros oficiales.");
      }

      // ...


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
              errorMsg = "❌ Permiso de GPS denegado. Actívalo en el navegador.";
              break;
            case gpsError.POSITION_UNAVAILABLE:
              errorMsg = "📡 Señal GPS débil o no disponible.";
              if (!window.isSecureContext) {
                errorMsg += " (Nota: El GPS requiere HTTPS o Localhost).";
              }
              break;
            case gpsError.TIMEOUT:
              errorMsg = "⌛ El GPS tardó demasiado en responder.";
              break;
            default:
              errorMsg = `Error GPS desconocido: ${gpsError.message}`;
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

    setStep('PROCESSING');
    setMensaje({ tipo: 'info', texto: "Procesando solicitud con el servidor..." });

    try {
      // CAMBIO AQUÍ: Usamos contextData.id en lugar de contextData.qrRaw
      const { id, lat, lng } = contextData;

      // Enviamos el ID (ej: 15) como primer parámetro
      const res = await scanQr(id, lat, lng, selectedBicicleta);

      setMensaje({ tipo: 'success', texto: res.message || "Operación exitosa" });
      setStep('RESULT');
      cargarBicicletas();
    } catch (error) {
      setMensaje({ tipo: 'error', texto: error.message || "Error al procesar" });
      setStep('DECIDING');
    }
  };



  // ... (Resetear actionMode al llegar a DECIDING en onScanSuccess) ...

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
          <h2>¿Listo para chequear?</h2>
          <p>Escanea el código QR del bicicletero.</p>
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
