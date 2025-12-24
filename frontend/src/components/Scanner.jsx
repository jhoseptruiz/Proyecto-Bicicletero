import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { getMisBicicletas } from '../services/bicicleta.service';
import { scanQr } from '../services/checkin.service';

function Scanner() {
  const [bicicletas, setBicicletas] = useState([]);
  const [selectedBicicleta, setSelectedBicicleta] = useState('');
  const [mensaje, setMensaje] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  
  const scannerRef = useRef(null);

  useEffect(() => {
    cargarBicicletas();
    
    // Cleanup al demostrar
    return () => {
        if (scannerRef.current) {
            scannerRef.current.clear().catch(err => console.error("Error cleaning scanner", err));
        }
    };
  }, []);

  const cargarBicicletas = async () => {
    try {
      const resp = await getMisBicicletas();
      const lista = resp.data || resp; 
      setBicicletas(lista);
      if (lista.length > 0) {
        setSelectedBicicleta(lista[0].id);
      }
    } catch (error) {
      console.error("Error cargando bicis", error);
    }
  };

  const startScanner = () => {
    if (!selectedBicicleta) {
      alert("Por favor selecciona una bicicleta primero.");
      return;
    }
    setMensaje(null);
    setScanning(true);

    // Pequeño timeout para asegurar que el div exista
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

  const onScanSuccess = (decodedText) => {
    // Detener scanner al tener éxito
    if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
    }
    setScanning(false);
    procesarCheckin(decodedText);
  };

  const onScanFailure = (error) => {
    // No hacer nada ruidoso, es común mientras busca
    // console.warn(`Code scan error = ${ error } `);
  };

  const procesarCheckin = (qrCodeContent) => {
    setLoading(true);
    setMensaje({ tipo: 'info', texto: "QR Detectado. Obteniendo ubicación..." });

    if (!navigator.geolocation) {
      setMensaje({ tipo: 'error', texto: "Navegador sin soporte GPS." });
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
            setMensaje({ tipo: 'info', texto: `Ubicación: ${ latitude.toFixed(5) }, ${ longitude.toFixed(5) }. Enviando...` });
            const respuesta = await scanQr(qrCodeContent, latitude, longitude, selectedBicicleta);
            setMensaje({ tipo: 'success', texto: respuesta.message });
        } catch (error) {
            setMensaje({ tipo: 'error', texto: error.message || "Error al procesar" });
        } finally {
            setLoading(false);
        }
      },
      (error) => {
        setMensaje({ tipo: 'error', texto: "Error GPS: " + error.message });
        setLoading(false);
      },
      { enableHighAccuracy: true }
    );
  };

  return (
    <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '8px', marginTop: '20px' }}>
      <h2>Escanear QR (Cámara)</h2>
      
      {mensaje && (
        <div style={{ 
          padding: '10px', 
          marginBottom: '15px', 
          backgroundColor: mensaje.tipo === 'error' ? '#ffeeee' : (mensaje.tipo === 'success' ? '#eeffee' : '#eef9ff'),
          color: mensaje.tipo === 'error' ? 'red' : (mensaje.tipo === 'success' ? 'green' : '#0055aa'),
          borderRadius: '4px'
        }}>
          {mensaje.texto}
        </div>
      )}

      {/* Selector de Bicicleta */}
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Selecciona tu Bicicleta:</label>
        {bicicletas.length === 0 ? (
          <p style={{color: 'gray'}}>Cargando bicicletas...</p>
        ) : (
            <select 
              value={selectedBicicleta} 
              onChange={(e) => setSelectedBicicleta(e.target.value)}
              disabled={scanning || loading}
              style={{ padding: '8px', width: '100%' }}
            >
              {bicicletas.map(b => (
                <option key={b.id} value={b.id}>
                   {b.marca}
                </option>
              ))}
            </select>
        )}
      </div>

      {/* Área del Scanner */}
      {scanning ? (
        <div id="reader" width="100%"></div>
      ) : (
         !loading && (
            <button 
                onClick={startScanner} 
                className="btn-primary"
                disabled={bicicletas.length === 0}
                style={{
                    padding: '10px 20px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    width: '100%',
                    cursor: 'pointer'
                }}
            >
                Abrir Cámara
            </button>
         )
      )}

      {loading && <p style={{textAlign: 'center'}}>Procesando...</p>}
      
    </div>
  );
}

export default Scanner;
