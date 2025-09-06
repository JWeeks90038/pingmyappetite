import React from 'react';
import Modal from './Modal';

const Confirm = ({ isOpen, onClose, onConfirm, message, title, confirmText = 'Confirm', cancelText = 'Cancel', type = 'warning' }) => {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const getConfirmButtonStyle = () => {
    switch (type) {
      case 'danger':
        return { backgroundColor: '#dc3545' };
      case 'success':
        return { backgroundColor: '#28a745' };
      default:
        return { backgroundColor: '#ffc107', color: '#212529' };
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div style={{ marginBottom: '20px' }}>
        <p style={{ margin: 0, color: '#333' }}>{message}</p>
      </div>
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <button
          onClick={onClose}
          style={{
            padding: '8px 16px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          {cancelText}
        </button>
        <button
          onClick={handleConfirm}
          style={{
            padding: '8px 16px',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            ...getConfirmButtonStyle(),
          }}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
};

export default Confirm;
