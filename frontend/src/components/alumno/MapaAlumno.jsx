import React, { useState, useEffect, useRef } from 'react';
import Map, { Marker, NavigationControl } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { getMapData } from '../../services/checkin.service';
import { useNavigate } from 'react-router-dom';
import mapboxgl from 'mapbox-gl'; // Need LngLatBounds

const MAPBOX_TOKEN = "pk.eyJ1IjoibWlsZW5ja2FhIiwiYSI6ImNtamxxZDAzYjJxNTIza3B5OXZmcmk1cXMifQ.xW3QubyrM10uSbt08RlAPA";

const MapaAlumno = ({ onMarkerClick }) => {
    const navigate = useNavigate();
    const mapRef = useRef(null);
    const [bicicleteros, setBicicleteros] = useState([]);
    const [selectedBicicletero, setSelectedBicicletero] = useState(null);
    const [viewState, setViewState] = useState({
        longitude: -73.0134,
        latitude: -36.8222,
        zoom: 16
    });

    useEffect(() => {
        async function fetchData() {
            try {
                const response = await getMapData();
                if (response.data) {
                    // --- CAMBIO AQUÍ: FILTRAR ---
                    // Excluimos los que estén en MANTENIMIENTO (que incluye "Fuera de Servicio")
                    const bicicleterosVisibles = response.data.filter(b => b.estado !== 'MANTENIMIENTO');

                    setBicicleteros(bicicleterosVisibles);

                    // Ajuste automático de límites (Usando solo los visibles)
                    if (bicicleterosVisibles.length > 0) {
                        const bounds = new mapboxgl.LngLatBounds();
                        bicicleterosVisibles.forEach(b => {
                            if (b.longitud && b.latitud) {
                                bounds.extend([parseFloat(b.longitud), parseFloat(b.latitud)]);
                            }
                        });

                        // Lógica de Contexto: Si todos los puntos están dentro del campus UBB,
                        // forzamos la vista centrada institucional.
                        // Bounds aprox: Lng -73.020~-73.005, Lat -36.830~-36.815
                        const UBB_CENTER = [-73.0134, -36.8222]; // Biblioteca Central
                        const isInsideCampus = (
                            bounds.getWest() > -73.020 && bounds.getEast() < -73.005 &&
                            bounds.getSouth() > -36.830 && bounds.getNorth() < -36.815
                        );

                        if (isInsideCampus && mapRef.current) {
                            // Vista Perfecta Campus
                            mapRef.current.flyTo({
                                center: UBB_CENTER,
                                zoom: 16,
                                duration: 1000
                            });
                        } else if (!bounds.isEmpty() && mapRef.current) {
                            // Si hay puntos lejanos, ajustamos para que entren todos
                            mapRef.current.fitBounds(bounds, {
                                padding: 100,
                                maxZoom: 16,
                                duration: 1000
                            });
                        }
                    }
                }
            } catch (error) {
                console.error("Error cargando mapa:", error);
            }
        }
        fetchData();
    }, []);

    const getColorEstado = (estado) => {
        switch (estado) {
            case 'DISPONIBLE': return '#28a745'; // Green
            case 'LLENO': return '#dc3545'; // Red
            case 'MANTENIMIENTO': return '#6c757d'; // Gray
            default: return '#007bff';
        }
    };

    return (
        <div className="map-wrapper" style={{ height: '100%' }}>
            <Map
                ref={mapRef}
                {...viewState}
                onMove={evt => setViewState(evt.viewState)}
                style={{ width: '100%', height: '100%' }}
                mapStyle="mapbox://styles/mapbox/streets-v11"
                mapboxAccessToken={MAPBOX_TOKEN}
                minZoom={13} // Restricción relajada: Permite ver el contexto si es necesario
            >
                <NavigationControl />

                {bicicleteros.map(b => (
                    b.latitud && b.longitud && (
                        <Marker
                            key={b.id}
                            longitude={parseFloat(b.longitud)}
                            latitude={parseFloat(b.latitud)}
                            anchor="center"
                            onClick={(e) => {
                                e.originalEvent.stopPropagation();
                                if (onMarkerClick) {
                                    onMarkerClick(b);
                                } else {
                                    navigate('/scan', { state: { preSelectedBicicletero: b } });
                                }
                            }}
                            style={{ cursor: 'pointer' }}
                        >
                            <div style={{
                                backgroundColor: 'rgba(255, 255, 255, 0.7)', // Mayor transparencia (efecto glass)
                                padding: '5px 10px',
                                borderRadius: '20px',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                border: `2px solid ${getColorEstado(b.estado)}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                cursor: 'pointer',
                                backdropFilter: 'blur(2px)' // Desenfoque de fondo
                            }}>
                                <span style={{ fontSize: '14px' }}>🚲</span>
                                <span style={{
                                    fontSize: '11px',
                                    fontWeight: 'bold',
                                    color: getColorEstado(b.estado)
                                }}>
                                    {b.disponibles} Disp.
                                </span>
                            </div>
                        </Marker>
                    )
                ))}
            </Map>
        </div>
    );
};

export default MapaAlumno;