import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBicicleteros } from '../services/bicicletero.service.js';
import { getPersonal } from '../services/user.service.js';
import Sidebar from '../components/Sidebar';
import PersonalManager from '../components/admin/PersonalManager';
import BicicleteroManager from '../components/admin/BicicleteroManager';
import ContenidoAlumno from '../components/ContenidoAlumno';
import PerfilContent from '../components/PerfilContent';
import './AdminDashboard.css';

function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('bicicleteros');

  // Estado Global
  const [bicicleteros, setBicicleteros] = useState([]);
  const [personal, setPersonal] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      const [bicicleterosData, personalData] = await Promise.all([
        getBicicleteros(),
        getPersonal()
      ]);

      setBicicleteros(bicicleterosData.data || []);
      setPersonal(personalData.data || []);
    } catch (err) {
      setError(err.message);
      if (err.message.includes("401")) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (loading) return <div>Cargando panel...</div>;
  if (error) return <div style={{ color: 'red' }}>Error global: {error}</div>;

  // Navegación Sidebar
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
  };

  return (
    <div className="admin-layout">
      {/* Sidebar Component */}
      <Sidebar
        role="admin"
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <main className="main-content">

        {activeTab === 'Personal' && (
          <PersonalManager
            personalList={personal}
            onRefresh={fetchData}
          />
        )}

        {activeTab === 'bicicleteros' && (
          <BicicleteroManager
            bicicleterosList={bicicleteros}
            personalList={personal}
            onRefresh={fetchData}
          />
        )}

        {activeTab === 'perfil' && <PerfilContent />}
        {activeTab === 'ir_a_alumno' && (
          <ContenidoAlumno alIrAlPerfil={() => setActiveTab('perfil')} />
        )}

      </main>
    </div>
  );
}

export default AdminDashboard;