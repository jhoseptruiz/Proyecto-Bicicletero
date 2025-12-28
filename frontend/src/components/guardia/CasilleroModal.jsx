import React from 'react';

const CasilleroModal = ({ isOpen, onClose, capacidad, ocupados, onSeleccionar, titulo, accion }) => {
  if (!isOpen) return null;

  // Lógica para generar los grupos (A, B, C...)
  const renderMapa = () => {
    const grupos = [];
    
    for (let i = 0; i < capacidad; i++) {
      const grupoIndex = Math.floor(i / 5);
      const numeroEnGrupo = (i % 5) + 1;
      const letraGrupo = String.fromCharCode(65 + grupoIndex); // 65 es 'A'
      const idCasillero = `${letraGrupo}-${numeroEnGrupo}`; 

      if (!grupos[grupoIndex]) grupos[grupoIndex] = { letra: letraGrupo, slots: [] };
      
      const isOcupado = ocupados.has(idCasillero);

      grupos[grupoIndex].slots.push(
        <button
          key={idCasillero}
          className={`slot-btn ${isOcupado ? 'slot-ocupado' : 'slot-libre'}`}
          disabled={isOcupado}
          onClick={() => !isOcupado && onSeleccionar(idCasillero)}
          title={isOcupado ? 'Ocupado' : 'Disponible'}
        >
          {numeroEnGrupo}
        </button>
      );
    }

    return grupos.map((grupo) => (
      <div key={grupo.letra} className="grupo-container">
        <div className="grupo-title">Grupo {grupo.letra}</div>
        <div className="grupo-slots">{grupo.slots}</div>
      </div>
    ));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>{titulo}</h2>
        <p>Selecciona una ubicación <strong>azul</strong> para {accion}.</p>
        
        <div className="leyenda">
          <span><span className="dot" style={{background:'#3498db'}}></span>Disponible</span>
          <span><span className="dot" style={{background:'#e74c3c'}}></span>Ocupado</span>
        </div>

        <div className="casilleros-grid">
          {renderMapa()}
        </div>

        <button className="btn-close-modal" onClick={onClose}>Cancelar</button>
      </div>
    </div>
  );
};

export default CasilleroModal;