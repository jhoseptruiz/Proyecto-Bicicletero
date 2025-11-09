// frontend/src/App.jsx (¡Corregido!)

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Importamos el guardia
import ProtectedRoute from './components/ProtectedRoute'; 

// Importamos todas las páginas
import LoginPage from './pages/LoginPage';
import PaginaRegistro from './pages/PaginaRegistro';
import AdminDashboard from './pages/AdminDashboard';
import GuardiaPanel from './pages/GuardiaPanel';
import AlumnoHome from './pages/AlumnoHome';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* --- RUTAS PÚBLICAS (Sin guardia) --- */}
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<LoginPage />} />

        <Route path= "/register" element={<PaginaRegistro/>}/>
        
        {/* --- RUTAS PROTEGIDAS (Ahora EXCLUSIVAS) --- */}

        {/* Ruta de Administrador:
            Solo los roles ['admin'] pueden entrar.
        */}
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
        
        {/* Ruta de Guardia:
            Solo los roles ['guardia'] pueden entrar.
            (Podríamos añadir 'admin' si queremos que el admin también vea esto)
        */}
        <Route 
          path="/guardia" 
          element={
            <ProtectedRoute allowedRoles={['guardia']}>
              <GuardiaPanel />
            </ProtectedRoute>
          } 
        />

        {/* Ruta de Alumno:
            ¡AQUÍ ESTÁ EL CAMBIO!
            Solo los roles ['alumno'] pueden entrar.
        */}
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