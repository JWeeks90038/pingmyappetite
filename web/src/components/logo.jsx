import React from 'react';
import logoPng from '../assets/grubana-logo-1.png'; // Adjust the path if needed
import '../assets/logo.css'; // Optional for styling

const Logo = () => {
  return (
    <div className="logo-wrapper">
      <img
        src={logoPng}
        alt="Grubana Logo"
        className="logo-image" // Add a class for better control in CSS
      />
    </div>
  );
};

export default Logo;