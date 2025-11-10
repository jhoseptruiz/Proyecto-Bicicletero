// frontend/src/App.jsx (¡Modificado!)

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Importamos el guardia
import ProtectedRoute from './components/ProtectedRoute'; 

// --- Importaciones de Páginas actualizadas ---
import AuthPage from './pages/AuthPage'; // ¡NUEVO!
// Ya no necesitamos LoginPage ni PaginaRegistro
// import LoginPage from './pages/LoginPage';
// import PaginaRegistro from './pages/PaginaRegistro';
        
import AdminDashboard from './pages/AdminDashboard';
import GuardiaPanel from './pages/GuardiaPanel';
import AlumnoHome from './pages/AlumnoHome';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* --- RUTAS PÚBLICAS (Ahora unificadas) --- */}
        
        {/* La ruta raíz redirige a la página de autenticación */}
        <Route path="/" element={<Navigate to="/auth" />} />
        
        {/* La nueva página de autenticación que contiene Login y Registro */}
        <Route path="/auth" element={<AuthPage />} />

        {/* Redirección por si alguien entra a las rutas viejas */}
        <Route path="/login" element={<Navigate to="/auth" />} />
        <Route path="/register" element={<Navigate to="/auth" />} />
        
        {/* --- RUTAS PROTEGIDAS (Siguen igual) --- */}

        <Route 
          path="/admin" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/guardia" 
          element={
            <ProtectedRoute allowedRoles={['guardia']}>
              <GuardiaPanel />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/alumno" 
          element={
            <ProtectedRoute allowedRoles={['alumno']}>
              <AlumnoHome />
            </ProtectedRoute>
          } 
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;