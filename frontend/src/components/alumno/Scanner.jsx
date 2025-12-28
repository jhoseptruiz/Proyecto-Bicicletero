import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { getMisBicicletas } from '../../services/bicicleta.service';
import { scanQr, validateQr, obtenerEstadoBicicletero } from '../../services/checkin.service';
import { useLocation } from 'react-router-dom';

function Scanner({ alCerrar, alIrAlPerfil }) {
  // Estados de Flujo: 'WAITING' (Esperando) | 'SCANNING' (Escaneando) | 'DECIDING' (Decidiendo) | 'PROCESSING' (Procesando) | 'RESULT' (Resultado)
  const [step, setStep] = useState('WAITING');

  const [bicicletas, setBicicletas] = useState([]);
  const [contextData, setContextData] = useState(null); // Datos del bicicletero escaneado
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

    // 4. Capacidad (Opcional: Solo advertencia por ahora, ya que podría estar saliendo)
    if (detalles.disponibles <= 0) {
      // No bloqueamos aquí, porque quizás quiere RETIRAR. La lógica de retiro validará después.
      // Pero podríamos mostrar un aviso.
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
    // CAMBIO: Guardamos el ID esperado, no el string del QR completo
    setExpectedId(bicicletero.id);
    setMensaje({ tipo: 'info', texto: `Por favor escanea el QR de: ${bicicletero.ubicacion}` });
    startScanner();
  };

  const cargarBicicletas = async () => {
    try {
      const resp = await getMisBicicletas();
      setBicicletas(resp.data || resp);
    } catch (error) {
      console.error("Error cargando bicis", error);
    }
  };

  const startScanner = () => {
    setStep('SCANNING');
    setContextData(null);

    setTimeout(() => {
      // Importante: Asegurarse de que el elemento 'reader' exista antes de instanciar
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

  // --- AQUÍ ESTABA EL ERROR PRINCIPAL ---
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

  const renderDeciding = () => {
    if (!contextData) return null;

    // Filtros Inteligentes
    // Nota: Asegúrate que 'b.estadoActual.bicicleteroId' coincida en tipo (string/int) con contextData.id
    const bicisAdentro = bicicletas.filter(b =>
      b.estadoActual?.estaAdentro &&
      parseInt(b.estadoActual?.bicicleteroId) === parseInt(contextData.id)
    );

    const bicisAfuera = bicicletas.filter(b => !b.estadoActual?.estaAdentro);

    return (
      <div>
        {/* Mostramos la ubicación extraída del QR o ID */}
        <h3 style={{ marginBottom: '5px' }}>📍 Bicicletero #{contextData.id}</h3>
        <p style={{ fontSize: '0.9em', color: '#666', marginBottom: '15px' }}>Selecciona qué deseas hacer:</p>

        {bicisAdentro.length > 0 && (
          <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #17a2b8', borderRadius: '8px', backgroundColor: '#f0faff' }}>
            <h4 style={{ color: '#17a2b8', margin: '0 0 10px 0' }}>📤 Retirar Bicicleta</h4>
            <select
              style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
              onChange={(e) => setSelectedBicicleta(e.target.value)}
              value={selectedBicicleta}
            >
              <option value="">-- Selecciona para Retirar --</option>
              {bicisAdentro.map(b => <option key={b.id} value={b.id}>{b.marca}</option>)}
            </select>
            <button onClick={ejecutarAccion} disabled={!selectedBicicleta} className="btn-primary" style={{ backgroundColor: '#17a2b8', width: '100%', color: 'white', padding: '10px', border: 'none', borderRadius: '4px' }}>
              Confirmar Retiro
            </button>
          </div>
        )}

        <div style={{ padding: '15px', border: '1px solid #28a745', borderRadius: '8px', backgroundColor: '#f0fff4' }}>
          <h4 style={{ color: '#28a745', margin: '0 0 10px 0' }}>📥 Ingresar Bicicleta</h4>

          {bicisAfuera.length > 0 ? (
            <>
              <select
                style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
                onChange={(e) => setSelectedBicicleta(e.target.value)}
                value={selectedBicicleta}
              >
                <option value="">-- Selecciona para Ingresar --</option>
                {bicisAfuera.map(b => <option key={b.id} value={b.id}>{b.marca}</option>)}
              </select>
              <button onClick={ejecutarAccion} disabled={!selectedBicicleta} className="btn-primary" style={{ backgroundColor: '#28a745', width: '100%', color: 'white', padding: '10px', border: 'none', borderRadius: '4px' }}>
                Confirmar Ingreso
              </button>
            </>
          ) : (
            <p style={{ fontStyle: 'italic', color: '#666' }}>No tienes bicicletas disponibles afuera.</p>
          )}

          <div style={{ marginTop: '15px', borderTop: '1px solid #ccc', paddingTop: '10px' }}>
            <button
              onClick={() => {
                if (alIrAlPerfil) alIrAlPerfil();
              }}
              style={{ background: 'white', border: '1px dashed #28a745', color: '#28a745', width: '100%', padding: '8px', borderRadius: '4px', cursor: 'pointer' }}
            >
              + Registrar Nueva Bicicleta
            </button>
          </div>
        </div>

        <button onClick={() => {
          if (alCerrar) alCerrar();
          else setStep('WAITING');
        }} style={{ marginTop: '20px', background: 'none', border: 'none', color: '#666', textDecoration: 'underline', cursor: 'pointer', width: '100%' }}>
          Cancelar / Escanear otro
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
