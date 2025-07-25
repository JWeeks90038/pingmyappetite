import React from 'react';
import logoPng from '../assets/logo.png'; // Adjust the path if needed
import '../assets/logo.css'; // Optional for styling

const Logo = () => {
  return (
    <div className="logo-wrapper">
      <img
        src={logoPng}
        alt="Grubana Logo"
        className="logo-img"
      />
    </div>
  );
};

export default Logo;