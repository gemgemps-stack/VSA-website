import React from 'react';
import Modal from './Modal';

const ConfirmModal = ({
  isOpen,
  title = 'Confirm Delete',
  message,
  confirmText = 'Delete',
  onConfirm,
  onCancel,
  loading = false,
}) => (
  <Modal
    isOpen={isOpen}
    title={title}
    onClose={onCancel}
    onSubmit={onConfirm}
    submitText={confirmText}
    cancelText="Cancel"
    loading={loading}
    submitClass="btn-danger"
  >
    <p className="confirm-modal-message">{message}</p>
  </Modal>
);

export default ConfirmModal;
