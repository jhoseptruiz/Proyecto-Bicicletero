import React, { useState } from 'react';
import { createPersonal, updatePersonal, deletePersonal } from '../../services/user.service.js';

function PersonalManager({ personalList, onRefresh }) {
    const [filtroRol, setFiltroRol] = useState('todos');
    
    // --- ESTADO PARA MODAL DE ERROR ---
    const [errorModal, setErrorModal] = useState({ isOpen: false, message: '' });

    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- Estado Formulario Personal ---
    const [editarPersonalRut, setEditarPersonalRut] = useState(null);
    const [pRut, setpRut] = useState('');
    const [pNombre, setpNombre] = useState('');
    const [pApellido, setpApellido] = useState('');
    const [pGmail, setpGmail] = useState('');
    const [pPassword, setpPassword] = useState('');
    const [pRole, setpRole] = useState('guardia');

    // --- Helper Pop Up Error ---
    const showError = (msg) => {
        setErrorModal({ isOpen: true, message: msg });
    };

    const closeError = () => {
        setErrorModal({ isOpen: false, message: '' });
    };

    // --- Lógica Personal ---
    const resetFormularioPersonal = () => {
        setEditarPersonalRut(null);
        setpRut('');
        setpNombre('');
        setpApellido('');
        setpGmail('');
        setpPassword('');
        setpRole('guardia');
    };

    const handleEditPersonalClick = (usuario) => {
        // Validación Frontend (Bloqueo lógico actualizado a AM/PM)
        // Revisamos si tiene asignaciones en la mañana O en la tarde
        const ocupado = (usuario.bicicleterosAM && usuario.bicicleterosAM.length > 0) || 
                        (usuario.bicicleterosPM && usuario.bicicleterosPM.length > 0);

        if (ocupado) {
            showError("No se puede modificar un guardia que tiene bicicleteros asignados.");
            return;
        }

        setEditarPersonalRut(usuario.rut);
        setpRut(usuario.rut);
        setpNombre(usuario.nombre);
        setpApellido(usuario.apellido);
        setpGmail(usuario.email);
        setpRole(usuario.role || 'guardia');
        setpPassword('');
    };

    const handlePersonalSubmit = async (e) => {
        e.preventDefault();
        const currentUser = JSON.parse(localStorage.getItem('user'));

        if (editarPersonalRut === currentUser.rut && pRole !== 'admin') {
            showError("No puedes quitarte el rol de administrador a ti mismo.");
            return;
        }

        setIsSubmitting(true);

        try {
            const personalData = {
                rut: pRut,
                nombre: pNombre,
                apellido: pApellido,
                email: pGmail,
                password: pPassword,
                role: pRole
            };

            if (editarPersonalRut) {
                await updatePersonal(editarPersonalRut, personalData);
                alert('Usuario actualizado');
            } else {
                if (!pPassword) throw new Error("La contraseña es obligatoria para crear un nuevo Usuario.");
                await createPersonal(personalData);
                alert('Usuario creado');
            }

            resetFormularioPersonal();
            onRefresh(); 
        } catch (err) {
            showError(err.message || "Error al procesar solicitud");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeletePersonal = async (usuario) => {
        // Validación Frontend (Bloqueo lógico actualizado a AM/PM)
        const ocupado = (usuario.bicicleterosAM && usuario.bicicleterosAM.length > 0) || 
                        (usuario.bicicleterosPM && usuario.bicicleterosPM.length > 0);

        if (ocupado) {
            showError("No se puede eliminar un guardia que tiene bicicleteros asignados.");
            return;
        }

        const currentUser = JSON.parse(localStorage.getItem('user'));
        if (usuario.rut === currentUser.rut) {
            showError("No puedes eliminar tu propio usuario.");
            return;
        }

        if (!window.confirm("¿Estás seguro de eliminar este usuario?")) return;
        try {
            await deletePersonal(usuario.rut);
            alert('Usuario eliminado');
            onRefresh(); 
        } catch (err) {
            showError(err.message || "Error al eliminar");
        }
    };

    const personalFiltrado = personalList.filter(p => {
        if (filtroRol === 'todos') return true;
        return p.role === filtroRol;
    });

    return (
        <div className="content-section fade-in">
            <div className="section-header">
                <h2>Gestión de Personal</h2>
            </div>

            <div className="card-container">
                <form onSubmit={handlePersonalSubmit} className="admin-form grid-2-col">
                    <div>
                        <label>RUT:</label>
                        <input
                            type="text"
                            value={pRut}
                            onChange={e => setpRut(e.target.value)}
                            disabled={!!editarPersonalRut}
                            required
                            placeholder="Ej: 12345678-9"
                        />
                    </div>
                    <div>
                        <label>Email:</label>
                        <input type="email" value={pGmail} onChange={e => setpGmail(e.target.value)} required />
                    </div>
                    <div>
                        <label>Nombre:</label>
                        <input type="text" value={pNombre} onChange={e => setpNombre(e.target.value)} required />
                    </div>
                    <div>
                        <label>Apellido:</label>
                        <input type="text" value={pApellido} onChange={e => setpApellido(e.target.value)} required />
                    </div>
                    <div>
                        <label>Rol:</label>
                        <select value={pRole} onChange={e => setpRole(e.target.value)}>
                            <option value="guardia">Guardia</option>
                            <option value="admin">Administrador</option>
                        </select>
                    </div>
                    <div>
                        <label>Contraseña:</label>
                        <input
                            type="password"
                            value={pPassword}
                            onChange={e => setpPassword(e.target.value)}
                            placeholder={editarPersonalRut ? "(Dejar en blanco para mantener)" : "Requerida"}
                        />
                    </div>
                    <div className="full-width actions">
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={isSubmitting} 
                        >
                            {isSubmitting ? 'Guardando...' : (editarPersonalRut ? 'Actualizar Personal' : 'Crear Personal')}
                        </button>

                        <button
                            type="button"
                            onClick={resetFormularioPersonal}
                            className="btn-secondary"
                            disabled={isSubmitting}
                        >
                            Cancelar
                        </button>
                    </div>
                </form>
            </div>

            <div className="table-container">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h3>Lista de Personal</h3>
                    <div>
                        <label style={{ marginRight: '10px' }}>Filtrar por:</label>
                        <select value={filtroRol} onChange={e => setFiltroRol(e.target.value)}>
                            <option value="todos">Todos</option>
                            <option value="guardia">Guardia</option>
                            <option value="admin">Administrador</option>
                        </select>
                    </div>
                </div>

                <table className="data-table">
                    <thead>
                        <tr>
                            <th>RUT</th>
                            <th>Nombre</th>
                            <th>Apellido</th>
                            <th>Email</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {personalFiltrado.length > 0 ? (
                            personalFiltrado.map(p => {
                                // VERIFICAR SI TIENE ASIGNACIONES (AM o PM)
                                const tieneAsignacion = (p.bicicleterosAM && p.bicicleterosAM.length > 0) || 
                                                        (p.bicicleterosPM && p.bicicleterosPM.length > 0);
                                
                                return (
                                    <tr key={p.rut}>
                                        <td>{p.rut}</td>
                                        <td>{p.nombre}</td>
                                        <td>{p.apellido}</td>
                                        <td>{p.email}</td>
                                        <td>
                                            <span style={{
                                                padding: '4px 8px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 'bold',
                                                backgroundColor: p.role === 'admin' ? '#e3f2fd' : '#fff3e0',
                                                color: p.role === 'admin' ? '#1565c0' : '#e65100'
                                            }}>
                                                {p.role === 'admin' ? 'Administrador' : 'Guardia'}
                                            </span>
                                        </td>
                                        <td>
                                            <button 
                                                className="btn-edit" 
                                                onClick={() => handleEditPersonalClick(p)}
                                                disabled={tieneAsignacion}
                                                style={tieneAsignacion ? { opacity: 0.5, cursor: 'not-allowed', backgroundColor: '#ccc' } : {}}
                                                title={tieneAsignacion ? "Tiene bicicleteros asignados" : "Editar"}
                                            >
                                                Editar
                                            </button>
                                            
                                            <button 
                                                className="btn-delete" 
                                                onClick={() => handleDeletePersonal(p)}
                                                disabled={tieneAsignacion}
                                                style={tieneAsignacion ? { marginLeft: '5px', opacity: 0.5, cursor: 'not-allowed', backgroundColor: '#ccc' } : { marginLeft: '5px' }}
                                                title={tieneAsignacion ? "Tiene bicicleteros asignados" : "Eliminar"}
                                            >
                                                Eliminar
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr><td colSpan="5">No hay usuarios registrados</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* --- MODAL DE ERROR (POP UP) --- */}
            {errorModal.isOpen && (
                <div className="modal-overlay" onClick={closeError}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', borderTop: '5px solid #e74c3c' }}>
                        <button className="btn-close" onClick={closeError}>×</button>
                        
                        <div style={{ textAlign: 'center', padding: '20px 0' }}>
                            <div style={{ fontSize: '50px', marginBottom: '15px' }}>⚠️</div>
                            <h3 style={{ color: '#e74c3c', margin: '0 0 10px 0' }}>Acción Denegada</h3>
                            <p style={{ fontSize: '1.1rem', color: '#555', lineHeight: '1.5' }}>
                                {errorModal.message}
                            </p>
                        </div>

                        <div className="modal-actions">
                            <button 
                                className="btn-secondary" 
                                onClick={closeError}
                                style={{ backgroundColor: '#e74c3c', color: 'white', border: 'none' }}
                            >
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default PersonalManager;