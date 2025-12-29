import React from 'react';
import PropTypes from 'prop-types';

const ROLE_CONFIG = {
    admin: {
        title: 'Admin Panel',
        items: [
            { id: 'bicicleteros', icon: '🚲', label: 'Zonas' },
            { id: 'Personal', icon: '👮', label: 'Personal' },
            { id: 'ir_a_alumno', icon: '🚲', label: 'Modo User' }
        ]
    },
    guardia: {
        title: 'Panel Guardia',
        items: [
            { id: 'solicitudes', icon: '🔔', label: 'Solicit.' },
            { id: 'custodia', icon: '🚲', label: 'Custodia' },
            { id: 'ir_a_alumno', icon: '🚲', label: 'Modo User' }
        ]
    },
    alumno: {
        title: 'Panel Alumno',
        items: [
            { id: 'dashboard', icon: '🏠', label: 'Inicio' }
        ]
    }
};

function Sidebar({ role, activeTab, setActiveTab, onLogout }) {
    const config = ROLE_CONFIG[role];

    if (!config) {
        return null;
    }

    const isStudentMode = role === 'alumno' || activeTab === 'ir_a_alumno';
    const isProfileMode = activeTab === 'perfil';

    return (
        <div className="mobile-nav-wrapper">

            <aside className="sidebar">
                <div className="sidebar-header">
                    <h2>{config.title}</h2>
                    <button
                        onClick={() => setActiveTab('perfil')}
                        className={`menu-item profile-menu-item ${activeTab === 'perfil' ? 'active' : ''}`}
                        title="Mi Perfil"
                    >
                        <span className="menu-icon">👤</span>
                        <span className="menu-label">Perfil</span>
                    </button>
                </div>

                <nav className="sidebar-menu">
                    {config.items.map((item) => (
                        <button
                            key={item.id}
                            className={`menu-item ${activeTab === item.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(item.id)}
                        >
                            <span className="menu-icon">{item.icon}</span>
                            <span className="menu-label">{item.label}</span>
                        </button>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <button onClick={onLogout} className="logout-btn">
                        <span>Cerrar sesión</span>
                    </button>
                </div>
            </aside>
            <div id="mobile-action-slot"></div>

            {isProfileMode && (
                <button className="mobile-logout-fab" onClick={onLogout}>
                    Salir
                </button>
            )}
        </div>
    );
}

Sidebar.propTypes = {
    role: PropTypes.oneOf(['admin', 'guardia', 'alumno']).isRequired,
    activeTab: PropTypes.string.isRequired,
    setActiveTab: PropTypes.func.isRequired,
    onLogout: PropTypes.func.isRequired
};

export default Sidebar;
