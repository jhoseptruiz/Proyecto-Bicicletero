import React from 'react';

function SidebarAlumno({ activeTab, setActiveTab, onLogout }) {
    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <h2>Panel Alumno</h2>
            </div>

            <nav className="sidebar-menu">
                <button
                    className={`menu-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                    onClick={() => setActiveTab('dashboard')}
                >
                    🏠 Inicio
                </button>
                <button
                    className={`menu-item ${activeTab === 'perfil' ? 'active' : ''}`}
                    onClick={() => setActiveTab('perfil')}
                >
                    👤 Mi Perfil
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

export default SidebarAlumno;
