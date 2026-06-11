import React from 'react';
import '../styles/Modal.css';

const Modal = ({ 
  isOpen, 
  title, 
  children, 
  onClose, 
  onSubmit,
  submitText = 'Save',
  cancelText = 'Cancel',
  loading = false,
  size = 'default',
  zIndex = 1000
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex }}>
      <div className={`modal-content modal-${size}`} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {children}
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose} disabled={loading}>
            {cancelText}
          </button>
          {onSubmit && (
            <button 
              className="btn-submit" 
              onClick={onSubmit}
              disabled={loading}
            >
              {loading ? 'Loading...' : submitText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;
