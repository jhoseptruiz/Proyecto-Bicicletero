// frontend/src/App.jsx

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import RutaProtegida from './components/RutaProtegida';

import AuthPage from './pages/AuthPage';
import AdminDashboard from './pages/AdminDashboard';
import GuardiaPanel from './pages/GuardiaPanel';
import AlumnoHome from './pages/AlumnoHome';
import PerfilPage from './pages/PerfilPage.jsx';
import Scanner from './components/alumno/Scanner.jsx';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* --- RUTAS PÚBLICAS --- */}
        <Route path="/" element={<Navigate to="/auth" />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/login" element={<Navigate to="/auth" />} />
        <Route path="/register" element={<Navigate to="/auth" />} />

        {/* --- RUTAS PROTEGIDAS (Admin y Guardia) --- */}
        <Route
          path="/admin"
          element={
            <RutaProtegida allowedRoles={['admin']}>
              <AdminDashboard />
            </RutaProtegida>
          }
        />
        <Route
          path="/guardia"
          element={
            <RutaProtegida allowedRoles={['guardia']}>
              <GuardiaPanel />
            </RutaProtegida>
          }
        />

        {/* --- RUTAS PROTEGIDAS (Roles: Alumno y Staff) --- */}
        <Route
          path="/alumno"
          element={
            <RutaProtegida allowedRoles={['alumno', 'admin', 'guardia']}>
              <AlumnoHome />
            </RutaProtegida>
          }
        />
        <Route
          path="/perfil"
          element={
            <RutaProtegida allowedRoles={['alumno', 'admin', 'guardia']}>
              <PerfilPage />
            </RutaProtegida>
          }
        />
        <Route
          path="/scan"
          element={
            <RutaProtegida allowedRoles={['alumno', 'admin', 'guardia']}>
              <div style={{ padding: '20px' }}>
                <a href="/alumno" style={{ marginBottom: '20px', display: 'block' }}>← Volver al Inicio</a>
                <Scanner />
              </div>
            </RutaProtegida>
          }
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;