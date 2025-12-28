import React from 'react';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, isDanger = false }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}> {/* Z-Index mayor para estar encima de otros modales */}
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <h2 style={{ fontSize: '1.3rem', marginBottom: '10px' }}>{title}</h2>
        <p style={{ fontSize: '1rem', color: '#555', marginBottom: '25px' }}>{message}</p>
        
        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
          <button className="btn-close-modal" onClick={onClose} style={{ flex: 1 }}>
            Cancelar
          </button>
          
          <button 
            className={`btn-action ${isDanger ? 'btn-reject' : 'btn-approve'}`} 
            onClick={() => {
              onConfirm();
              onClose();
            }}
            style={{ flex: 1, color: 'white' }}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;