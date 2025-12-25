// frontend/src/App.jsx

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import ProtectedRoute from './components/ProtectedRoute';

import AuthPage from './pages/AuthPage';
import AdminDashboard from './pages/AdminDashboard';
import GuardiaPanel from './pages/GuardiaPanel';
import AlumnoHome from './pages/AlumnoHome';
import PerfilPage from './pages/PerfilPage.jsx';
import Scanner from './components/Scanner.jsx';

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

        {/* --- RUTAS PROTEGIDAS (Alumno) --- */}
        <Route
          path="/alumno"
          element={
            <ProtectedRoute allowedRoles={['alumno']}>
              <AlumnoHome />
            </ProtectedRoute>
          }
        />
        <Route
          path="/perfil"
          element={
            <ProtectedRoute allowedRoles={['alumno']}>
              <PerfilPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/scan"
          element={
            <ProtectedRoute allowedRoles={['alumno']}>
              <div style={{ padding: '20px' }}>
                <a href="/alumno" style={{ marginBottom: '20px', display: 'block' }}>← Volver al Inicio</a>
                <Scanner />
              </div>
            </ProtectedRoute>
          }
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;