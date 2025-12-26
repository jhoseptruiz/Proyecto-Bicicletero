import React from 'react';

function Sidebar({ activeTab, setActiveTab, onLogout }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>Admin Panel</h2>
      </div>
      
      <nav className="sidebar-menu">
        <button 
          className={`menu-item ${activeTab === 'bicicleteros' ? 'active' : ''}`}
          onClick={() => setActiveTab('bicicleteros')}
        >
          🚲 Bicicleteros
        </button>
        <button 
          className={`menu-item ${activeTab === 'Personal' ? 'active' : ''}`}
          onClick={() => setActiveTab('Personal')}
        >
          👮 Personal
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

export default Sidebar;