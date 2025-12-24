/**
 * Calcula la distancia en metros entre dos coordenadas geográficas.
 * Utiliza la fórmula de Haversine.
 * 
 * Esta fórmula es estándar para medir distancias en una esfera (la Tierra).
 * Se usa para verificar si el alumno está físicamente cerca del bicicletero (ej: < 50 metros).
 * 
 * @param {number} lat1 Latitud punto 1 (Usuario)
 * @param {number} lon1 Longitud punto 1 (Usuario)
 * @param {number} lat2 Latitud punto 2 (Bicicletero)
 * @param {number} lon2 Longitud punto 2 (Bicicletero)
 * @returns {number} Distancia en metros
 */
export function calcularDistancia(lat1, lon1, lat2, lon2) {
    // Radio de la tierra en metros
    const R = 6371e3;

    // Convertir grados a radianes
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
        Math.cos(phi1) * Math.cos(phi2) *
        Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distancia = R * c;

    // Retornamos la distancia redondeada en metros
    return Math.round(distancia);
}
