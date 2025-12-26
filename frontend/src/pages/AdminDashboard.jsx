import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBicicleteros } from '../services/bicicletero.service.js';
import { getPersonal } from '../services/user.service.js';
import Sidebar from '../components/admin/Sidebar';
import PersonalManager from '../components/admin/PersonalManager';
import BicicleteroManager from '../components/admin/BicicleteroManager';
import './AdminDashboard.css';

function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('bicicleteros');
  
  // --- Estado Global de Datos ---
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

  return (
    <div className="admin-layout">
      {/* Sidebar Component */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
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
        
      </main>
    </div>
  );
}

export default AdminDashboard;