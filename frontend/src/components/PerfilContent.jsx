import React from 'react';
import GestionBicicletas from './GestionBicicletas.jsx';

function PerfilContent() {
    const userString = localStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : {};

    return (
        <div className="admin-form card-container fade-in">
            <h1>Mi Perfil</h1>

            {/* Sección de Información del Usuario */}
            <div style={{ marginBottom: '20px' }}>
                <h3>Información Personal</h3>
                <p><strong>RUT:</strong> {user.sub || user.rut || 'N/A'}</p>
                <p><strong>Email:</strong> {user.email || 'N/A'}</p>
                <p><strong>Rol:</strong> {user.role || 'N/A'}</p>
            </div>

            <hr style={{ margin: '20px 0', border: '0', borderTop: '1px solid #eee' }} />

            <GestionBicicletas />
        </div>
    );
}

export default PerfilContent;
