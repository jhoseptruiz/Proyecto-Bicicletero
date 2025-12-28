import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { getMisBicicletas } from '../../services/bicicleta.service';
import { scanQr, validateQr } from '../../services/checkin.service';
import { useLocation } from 'react-router-dom';

function Scanner({ alCerrar, alIrAlPerfil }) {
  // Estados de Flujo: 'WAITING' (Esperando) | 'SCANNING' (Escaneando) | 'DECIDING' (Decidiendo) | 'PROCESSING' (Procesando) | 'RESULT' (Resultado)
  const [step, setStep] = useState('WAITING');

  const [bicicletas, setBicicletas] = useState([]);
  const [contextData, setContextData] = useState(null); // Datos del bicicletero escaneado
  const [selectedBicicleta, setSelectedBicicleta] = useState('');
  const [mensaje, setMensaje] = useState(null);
  const [expectedQr, setExpectedQr] = useState(null); // Validación de seguridad: QR esperado

  const scannerRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    cargarBicicletas();

    if (location.state?.preSelectedBicicletero) {
      // Flujo estricto: Si viene del mapa, iniciamos escaneo esperando SOLO ese QR
      handlePreSelected(location.state.preSelectedBicicletero);
    } else {
      // Limpieza normal si no hay preselección
      return () => stopScanner();
    }
  }, []);

  const handlePreSelected = (bicicletero) => {
    setExpectedQr(bicicletero.codigoQr);
    setMensaje({ tipo: 'info', texto: `Por favor escanea el QR de: ${bicicletero.ubicacion}` });
    startScanner(); // Iniciamos camara forzosamente
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
    setMensaje({ tipo: 'info', texto: "Verificando QR y Ubicación..." });

    try {
      if (expectedQr && decodedText !== expectedQr) {
        throw new Error("El QR escaneado no corresponde al bicicletero seleccionado en el mapa.");
      }

      if (!navigator.geolocation) throw new Error("GPS no soportado");

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          setContextData({
            qr: decodedText,
            ...bicicletero,
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setStep('DECIDING');
          setMensaje(null);
        },
        (err) => {
          setMensaje({ tipo: 'error', texto: "Error GPS: " + err.message });
          setStep('WAITING');
        }
      );

    } catch (error) {
      setMensaje({ tipo: 'error', texto: error.message || "QR Inválido" });
      setStep('WAITING'); // Volver a permitir intento si falla
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
    setMensaje({ tipo: 'info', texto: "Procesando solicitud..." });

    try {
      const { qr, lat, lng } = contextData;
      const res = await scanQr(qr, lat, lng, selectedBicicleta);
      setMensaje({ tipo: 'success', texto: res.message });
      setStep('RESULT');
      cargarBicicletas(); // Recargar estado para ver cambio
    } catch (error) {
      setMensaje({ tipo: 'error', texto: error.message || "Error al procesar" });
      setStep('DECIDING'); // Dejar intentar de nuevo
    }
  };



  const renderDeciding = () => {
    if (!contextData) return null;

    // Filtros Inteligentes
    const bicisAdentro = bicicletas.filter(b => b.estadoActual?.estaAdentro && b.estadoActual?.bicicleteroId == contextData.id);

    // Bicicletas disponibles (afuera de cualquier lado)
    const bicisAfuera = bicicletas.filter(b => !b.estadoActual?.estaAdentro);

    return (
      <div>
        <h3 style={{ marginBottom: '5px' }}>📍 {contextData.ubicacion}</h3>
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
            <button onClick={ejecutarAccion} disabled={!selectedBicicleta || !bicisAdentro.find(b => b.id == selectedBicicleta)} className="btn-primary" style={{ backgroundColor: '#17a2b8', width: '100%', color: 'white', padding: '10px', border: 'none', borderRadius: '4px' }}>
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
              <button onClick={ejecutarAccion} disabled={!selectedBicicleta || !bicisAfuera.find(b => b.id == selectedBicicleta)} className="btn-primary" style={{ backgroundColor: '#28a745', width: '100%', color: 'white', padding: '10px', border: 'none', borderRadius: '4px' }}>
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

      {/* HEADER STATUS */}
      {mensaje && (
        <div style={{
          padding: '10px', marginBottom: '15px', borderRadius: '4px',
          backgroundColor: mensaje.tipo === 'error' ? '#ffeeee' : (mensaje.tipo === 'success' ? '#eeffee' : '#eef9ff'),
          color: mensaje.tipo === 'error' ? 'red' : (mensaje.tipo === 'success' ? 'green' : '#0055aa'),
        }}>
          {mensaje.texto}
        </div>
      )}

      {/* VIEW SWITCHER */}
      {step === 'WAITING' && (
        <div style={{ textAlign: 'center' }}>
          <h2>¿Listo para chequear?</h2>
          <p>Escanea el código QR del bicicletero para identificarlo.</p>
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
