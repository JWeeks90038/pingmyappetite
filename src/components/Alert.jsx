import React from 'react';
import Modal from './Modal';

const Alert = ({ isOpen, onClose, message, type = 'info', title }) => {
  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return { color: '#155724', backgroundColor: '#d4edda', borderColor: '#c3e6cb' };
      case 'error':
        return { color: '#721c24', backgroundColor: '#f8d7da', borderColor: '#f5c6cb' };
      case 'warning':
        return { color: '#856404', backgroundColor: '#fff3cd', borderColor: '#ffeaa7' };
      default:
        return { color: '#0c5460', backgroundColor: '#d1ecf1', borderColor: '#bee5eb' };
    }
  };

  const typeStyles = getTypeStyles();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div style={{
        padding: '12px 16px',
        border: '1px solid',
        borderRadius: '4px',
        marginBottom: '20px',
        ...typeStyles,
      }}>
        {message}
      </div>
      <div style={{ textAlign: 'right' }}>
        <button
          onClick={onClose}
          style={{
            padding: '8px 16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          OK
        </button>
      </div>
    </Modal>
  );
};

export default Alert;
