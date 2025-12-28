import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { getMisBicicletas } from '../../services/bicicleta.service';
import { scanQr } from '../../services/checkin.service'; // Asegúrate que scanQr acepte el 5to parámetro (accion)
import { useLocation } from 'react-router-dom';

function Scanner({ alCerrar, alIrAlPerfil }) {
  // Estados de Flujo
  const [step, setStep] = useState('WAITING');
  const [bicicletas, setBicicletas] = useState([]);
  const [contextData, setContextData] = useState(null);
  const [selectedBicicleta, setSelectedBicicleta] = useState('');
  const [mensaje, setMensaje] = useState(null);
  const [expectedId, setExpectedId] = useState(null);

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
      const lista = resp.data || resp || [];
      console.log("🚲 Bicicletas cargadas:", lista); // <--- DEPURACIÓN: Mira esto en la consola (F12)
      setBicicletas(lista);
    } catch (error) {
      console.error("Error cargando bicis", error);
      setMensaje({ tipo: 'error', texto: "Error al cargar tus bicicletas. Revisa tu conexión." });
    }
  };

  const startScanner = () => {
    setStep('SCANNING');
    setContextData(null);
    setTimeout(() => {
      if (!document.getElementById("reader")) return;
      const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: { width: 250, height: 250 } }, false);
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
    setMensaje({ tipo: 'info', texto: "Verificando QR y Ubicación..." });

    try {
      let datosQr;
      try {
        datosQr = JSON.parse(decodedText);
      } catch (e) {
        // Soporte retrocompatibilidad si el QR es solo un número ID
        if (!isNaN(decodedText)) {
            datosQr = { id: decodedText, tipo: 'bicicletero_ubicacion' };
        } else {
            throw new Error("Formato de QR inválido.");
        }
      }

      if (!datosQr.id) throw new Error("QR sin ID válido.");
      if (expectedId && parseInt(datosQr.id) !== parseInt(expectedId)) {
        throw new Error("El QR no corresponde al bicicletero seleccionado.");
      }

      if (!navigator.geolocation) throw new Error("GPS no soportado.");

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          setContextData({
            qrRaw: decodedText,
            id: datosQr.id,
            ubicacion: datosQr.ubicacion || `Bicicletero #${datosQr.id}`,
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setStep('DECIDING'); // <--- Pasamos a la pantalla de decisión
          setMensaje(null);
        },
        (err) => {
          console.error(err);
          setMensaje({ tipo: 'error', texto: "Activa tu GPS para continuar." });
          setStep('WAITING');
        },
        { timeout: 10000, enableHighAccuracy: true }
      );

    } catch (error) {
      console.error(error);
      setMensaje({ tipo: 'error', texto: error.message });
      setStep('WAITING');
    }
  };

  const onScanFailure = (error) => {};

  // 1. FUNCIÓN QUE RECIBE EL TIPO DE ACCIÓN ('ingreso' o 'salida')
  const ejecutarAccion = async (tipoAccion) => {
    if (!selectedBicicleta) {
      alert("Selecciona una bicicleta primero");
      return;
    }

    setStep('PROCESSING');
    setMensaje({ tipo: 'info', texto: `Procesando ${tipoAccion}...` });

    try {
      const { id, lat, lng } = contextData;
      // Enviamos 'tipoAccion' al backend
      const res = await scanQr(id, lat, lng, selectedBicicleta, tipoAccion);
      
      setMensaje({ tipo: 'success', texto: res.message || "Operación exitosa" });
      setStep('RESULT');
      cargarBicicletas(); // Recargar para actualizar estados
    } catch (error) {
      setMensaje({ tipo: 'error', texto: error.message || "Error al procesar" });
      setStep('DECIDING'); 
    }
  };

  // 2. RENDERIZADO DE LA PANTALLA DE DECISIÓN
  const renderDeciding = () => {
    if (!contextData) return null;

    // A. FILTRO PARA BICICLETAS QUE ESTÁN ADENTRO DE ESTE BICICLETERO
    const bicisAdentro = bicicletas.filter(b =>
      b.estadoActual?.estaAdentro &&
      parseInt(b.estadoActual?.bicicleteroId) === parseInt(contextData.id)
    );

    // B. FILTRO PARA BICICLETAS QUE ESTÁN AFUERA (Disponibles para ingresar)
    // Nota: Si tus bicis aparecen como 'estaAdentro: true' por error, no saldrán aquí.
    const bicisAfuera = bicicletas.filter(b => !b.estadoActual?.estaAdentro);

    return (
      <div>
        <h3 style={{ marginBottom: '5px' }}>📍 {contextData.ubicacion}</h3>
        <p style={{ fontSize: '0.9em', color: '#666', marginBottom: '15px' }}>
            Selecciona la acción para tus bicicletas:
        </p>

        {/* --- SECCIÓN DE RETIRO --- */}
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
            <button 
                onClick={() => ejecutarAccion('salida')} 
                disabled={!selectedBicicleta} 
                className="btn-primary" 
                style={{ backgroundColor: '#17a2b8', width: '100%', color: 'white', padding: '10px', border: 'none', borderRadius: '4px' }}
            >
              Confirmar Retiro
            </button>
          </div>
        )}

        {/* --- SECCIÓN DE INGRESO --- */}
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
              <button 
                onClick={() => ejecutarAccion('ingreso')} 
                disabled={!selectedBicicleta} 
                className="btn-primary" 
                style={{ backgroundColor: '#28a745', width: '100%', color: 'white', padding: '10px', border: 'none', borderRadius: '4px' }}
              >
                Confirmar Ingreso
              </button>
            </>
          ) : (
            <div style={{textAlign: 'center'}}>
                <p style={{ fontStyle: 'italic', color: '#666' }}>
                    No tienes bicicletas disponibles "Afuera".
                </p>
                <small style={{color:'#999'}}>
                    (Si tu bici está aquí pero el sistema dice que está adentro, contacta al guardia).
                </small>
            </div>
          )}

          <div style={{ marginTop: '15px', borderTop: '1px solid #ccc', paddingTop: '10px' }}>
            <button
              onClick={() => { if (alIrAlPerfil) alIrAlPerfil(); }}
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
          Cancelar
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
            📷 Activar Cámara
          </button>
        </div>
      )}

      {step === 'SCANNING' && (
        <div>
          <h3>Escaneando...</h3>
          <div id="reader" width="100%"></div>
          <button onClick={() => { stopScanner(); setStep('WAITING'); }} style={{ marginTop: '10px', width: '100%', padding: '10px' }}>Cancelar</button>
        </div>
      )}

      {step === 'DECIDING' && renderDeciding()}

      {step === 'RESULT' && (
        <div style={{ textAlign: 'center' }}>
          <h3>¡Listo!</h3>
          <p>{mensaje?.texto}</p>
          <button onClick={() => { if (alCerrar) alCerrar(); else setStep('WAITING'); }} style={{ marginTop: '10px', padding: '10px 20px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px' }}>Finalizar</button>
        </div>
      )}

      {step === 'PROCESSING' && <p style={{ textAlign: 'center' }}>Procesando...</p>}
    </div>
  );
}

export default Scanner;