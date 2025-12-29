import React, { useState, useEffect } from 'react';
import { getMisBicicletas, crearBicicleta, updateBicicleta, deleteBicicleta } from '../services/bicicleta.service.js';
import './GestionBicicletas.css';

const API_BASE_URL = import.meta.env.VITE_BASE_URL.replace('/api', '');

function GestionBicicletas() {
  const [bicicletas, setBicicletas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Estados para el formulario de creación
  const [marca, setMarca] = useState('');
  const [fotoFile, setFotoFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [formError, setFormError] = useState('');

  // Estados para el modal de edición
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingBike, setEditingBike] = useState(null);
  const [editMarca, setEditMarca] = useState('');
  const [editFotoFile, setEditFotoFile] = useState(null);
  const [editPreviewUrl, setEditPreviewUrl] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getMisBicicletas();
      setBicicletas(data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Lógica de Creación
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFotoFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!marca || !fotoFile) {
      setFormError('La marca y la foto son obligatorias.');
      return;
    }
    const formData = new FormData();

    // Validaciones Frontend
    const marcaRegex = /^[a-zA-Z0-9\sñÑáéíóúÁÉÍÓÚ\-\.]+$/;
    if (!marcaRegex.test(marca)) {
      setFormError('La marca contiene caracteres inválidos. Solo letras, números y guiones.');
      return;
    }
    if (marca.length > 50) {
      setFormError('El nombre de la marca es muy largo (máx 50 caracteres).');
      return;
    }

    // Validar archivo
    if (fotoFile.size > 5 * 1024 * 1024) { // 5MB
      setFormError('La imagen es muy pesada (máx 5MB).');
      return;
    }

    formData.append('marca', marca.trim());
    formData.append('foto', fotoFile);
    try {
      await crearBicicleta(formData);
      setMarca('');
      setFotoFile(null);
      setPreviewUrl('');
      if (document.getElementById('fotoInput')) document.getElementById('fotoInput').value = null;
      fetchData();
    } catch (err) {
      setFormError(err.message);
    }
  };

  // Lógica de Eliminación
  const handleDelete = async (bicicletaId) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar esta bicicleta? Esta acción no se puede deshacer.")) {
      try {
        await deleteBicicleta(bicicletaId);
        fetchData(); // Recargar la lista
      } catch (err) {
        alert("Error al eliminar la bicicleta: " + err.message);
      }
    }
  };

  // Lógica de Edición
  const openEditModal = (bicicleta) => {
    setEditingBike(bicicleta);
    setEditMarca(bicicleta.marca);
    setEditPreviewUrl(`${API_BASE_URL}/${bicicleta.fotoUrl}`);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingBike(null);
    setEditMarca('');
    setEditFotoFile(null);
    setEditPreviewUrl('');
  };

  const handleEditFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setEditFotoFile(file);
      setEditPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('marca', editMarca);
    if (editFotoFile) {
      formData.append('foto', editFotoFile);
    }

    try {
      await updateBicicleta(editingBike.id, formData);
      closeEditModal();
      fetchData();
    } catch (err) {
      alert("Error al actualizar: " + err.message);
    }
  };

  if (loading) return <p>Cargando bicicletas...</p>;
  if (error) return <p style={{ color: 'red' }}>Error al cargar: {error}</p>;

  return (
    <div style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '8px' }}>
      <h2>Administrar Bicicletas</h2>
      <p>Administra las bicicletas de tu perfil.</p>
      <hr style={{ margin: '20px 0' }} />
      <div className="add-bike-section">
        <h3>Registrar Nueva Bicicleta</h3>
        <form onSubmit={handleSubmit} className="add-bike-form">
          <div className="form-group">
            <label>Marca / Modelo:</label>
            <input type="text" value={marca} onChange={(e) => setMarca(e.target.value)} required placeholder="Ej: Trek Marlin 5" />
          </div>
          <div className="form-group">
            <label>Foto:</label>
            <div className="file-input-wrapper">
              <input id="fotoInput" type="file" accept="image/*" onChange={handleFileChange} required />
              <button type="button" className="btn-upload" onClick={() => document.getElementById('fotoInput').click()}>
                {fotoFile ? 'Foto Seleccionada ✅' : '📸 Subir Foto'}
              </button>
            </div>
          </div>

          {previewUrl && (
            <div className="preview-container">
              <img src={previewUrl} alt="Vista previa" className="preview-image" />
            </div>
          )}

          <button type="submit" className="btn-primary-add">Agregar Bicicleta</button>
          {formError && <p className="error-msg">{formError}</p>}
        </form>
      </div>

      <hr style={{ margin: '20px 0', border: '0', borderTop: '1px solid #eee' }} />

      <h3>Mis Bicicletas</h3>

      {bicicletas.length === 0 ? (
        <div className="empty-state">
          <p>No tienes bicicletas registradas aún.</p>
        </div>
      ) : (
        <div className="bikes-grid">
          {bicicletas.map(b => {
            const enUso = b.estadoActual?.estaAdentro;
            return (
              <div key={b.id} className="bike-card">
                <div className="bike-card-image">
                  {b.fotoUrl ? (
                    <img src={`${API_BASE_URL}/${b.fotoUrl}`} alt={b.marca} />
                  ) : (
                    <div className="placeholder-image">🚲</div>
                  )}
                  {enUso && (
                    <div style={{
                      position: 'absolute', top: '8px', right: '8px',
                      background: '#ffc107', padding: '4px 8px', borderRadius: '4px',
                      fontSize: '0.75rem', fontWeight: 'bold', color: '#333'
                    }}>
                      En Uso
                    </div>
                  )}
                </div>
                <div className="bike-card-content">
                  <h4>{b.marca}</h4>
                  <div className="bike-card-actions">
                    <button
                      className="btn-icon edit"
                      onClick={() => !enUso && openEditModal(b)}
                      disabled={enUso}
                      title={enUso ? "No puedes editar una bicicleta en uso" : "Editar"}
                      style={{ opacity: enUso ? 0.4 : 1, cursor: enUso ? 'not-allowed' : 'pointer' }}
                    >
                      ✏️
                    </button>
                    <button
                      className="btn-icon delete"
                      onClick={() => !enUso && handleDelete(b.id)}
                      disabled={enUso}
                      title={enUso ? "No puedes eliminar una bicicleta en uso" : "Eliminar"}
                      style={{ opacity: enUso ? 0.4 : 1, cursor: enUso ? 'not-allowed' : 'pointer' }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isEditModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Editar Bicicleta</h2>
            <form onSubmit={handleUpdate}>
              <div style={{ marginBottom: '10px' }}>
                <label>Marca:</label>
                <input type="text" value={editMarca} onChange={(e) => setEditMarca(e.target.value)} required />
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label>Cambiar Foto (Opcional):</label>
                <input type="file" accept="image/*" onChange={handleEditFileChange} />
              </div>
              {editPreviewUrl && <img src={editPreviewUrl} alt="Vista previa" style={{ width: '150px', height: '150px', objectFit: 'cover', marginBottom: '10px' }} />}
              <div className="modal-actions">
                <button type="submit">Guardar Cambios</button>
                <button type="button" onClick={closeEditModal}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default GestionBicicletas;