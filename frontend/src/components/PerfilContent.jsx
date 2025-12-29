import React from 'react';
import GestionBicicletas from './GestionBicicletas.jsx';

function PerfilContent() {
    const userString = localStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : {};

    return (
        <div className="admin-form card-container fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>Mi Perfil</h1>

            {/* Sección de Información del Usuario - DISEÑO CARD */}
            <div style={{
                background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                padding: '25px',
                borderRadius: '16px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                marginBottom: '30px',
                flexWrap: 'wrap'
            }}>
                {/* Avatar Placeholder */}
                <div style={{
                    width: '70px',
                    height: '70px',
                    borderRadius: '50%',
                    background: '#007bff',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2rem',
                    fontWeight: 'bold',
                    boxShadow: '0 4px 10px rgba(0,123,255,0.3)'
                }}>
                    {user.email ? user.email[0].toUpperCase() : 'U'}
                </div>

                <div style={{ flex: 1, minWidth: '200px' }}>
                    <h3 style={{ margin: '0 0 5px 0', fontSize: '1.4rem' }}>Bienvenido/a</h3>
                    <p style={{ margin: '0', color: '#666' }}>{user.email || 'Usuario'}</p>
                </div>

                <div style={{
                    display: 'flex',
                    gap: '15px',
                    flexWrap: 'wrap',
                    background: 'white',
                    padding: '10px 20px',
                    borderRadius: '10px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                }}>
                    <div style={{ textAlign: 'center' }}>
                        <span style={{ display: 'block', fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>RUT</span>
                        <span style={{ fontWeight: '600', color: '#333' }}>{user.sub || user.rut || 'N/A'}</span>
                    </div>
                    <div style={{ width: '1px', background: '#eee' }}></div>
                    <div style={{ textAlign: 'center' }}>
                        <span style={{ display: 'block', fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>ROL</span>
                        <span style={{ fontWeight: '600', color: '#007bff' }}>{user.role || 'N/A'}</span>
                    </div>
                </div>
            </div>

            <GestionBicicletas />
        </div>
    );
}

export default PerfilContent;
