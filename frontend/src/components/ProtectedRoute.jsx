// frontend/src/components/ProtectedRoute.jsx (¡Corregido!)

import React from 'react';
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ allowedRoles, children }) {
  
  const token = localStorage.getItem('token');
  const userString = localStorage.getItem('user');
  
  // 1. CANDADO 1: ¿No está logueado?
  // Si no hay token, lo echamos al login.
  if (!token || !userString) {
    return <Navigate to="/login" replace />;
  }

  // 2. CANDADO 2: ¿Está logueado pero no tiene el rol?
  const user = JSON.parse(userString);
  const userRole = user.role;

  // Si su rol SÍ está en la lista de permitidos, lo dejamos pasar.
  if (allowedRoles.includes(userRole)) {
    return children;
  } 
  
  // 3. ¡ROL INCORRECTO!
  // Está logueado, pero intenta entrar a donde no debe.
  // (Ej: un 'admin' intentando entrar a '/alumno').
  // Lo redirigimos a SU PROPIA página de inicio.
  
  if (userRole === 'admin') {
    return <Navigate to="/admin" replace />;
  } else if (userRole === 'guardia') {
    return <Navigate to="/guardia" replace />;
  } else {
    // Por defecto, lo mandamos al home de alumno
    return <Navigate to="/alumno" replace />;
  }
}

export default ProtectedRoute;