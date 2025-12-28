import React from 'react';

function SidebarGuardia({ activeTab, setActiveTab, onLogout }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>Panel Guardia</h2>
      </div>
      
      <nav className="sidebar-menu">
        <button 
          className={`menu-item ${activeTab === 'solicitudes' ? 'active' : ''}`}
          onClick={() => setActiveTab('solicitudes')}
        >
          🔔 Solicitudes
        </button>
        <button 
          className={`menu-item ${activeTab === 'custodia' ? 'active' : ''}`}
          onClick={() => setActiveTab('custodia')}
        >
          🚲 En Custodia
        </button>
      </nav>

      <div className="sidebar-footer">
        <button onClick={onLogout} className="logout-btn">
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}

// ESTA LÍNEA ES LA QUE TE FALTABA O ESTABA MAL:
export default SidebarGuardia;