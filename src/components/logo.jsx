import React from 'react';
import '../assets/logo.css'; // Optional for styling

const Logo = () => {
  return (
    <div className="logo-wrapper">
      <svg viewBox="50 90 1330 460" xmlns="http://www.w3.org/2000/svg" className="logo-svg">
  <defs>
    <linearGradient id="textGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#ffb84d"/> 
      <stop offset="50%" stopColor="#2a9d8f"/> 
      <stop offset="100%" stopColor="#ffb84d"/> 
    </linearGradient>
  </defs>

  {/* Ping shape */}
  <g transform="translate(718, 90) scale(0.6)">
    <path d="M150 0C90 0 40 50 40 120c0 70 50 120 80 190s30 90 30 90 0-30 30-90c30-70 80-120 80-190C260 50 210 0 150 0z" fill="#b22222"/>
  </g>
  
  {/* Circles */}
  <g transform="translate(810, 160) scale(0.6)">
    <circle r="18" fill="none" stroke="white" strokeWidth="5"/>
    <circle r="34" fill="none" stroke="white" strokeWidth="3.5"/>
    <circle r="50" fill="none" stroke="white" strokeWidth="2"/>
  </g>

  {/* Ellipses */}
  <g transform="translate(810, 310)">
    <ellipse rx="40" ry="6" fill="none" stroke="#000" strokeWidth="2"/>
    <ellipse rx="25" ry="4" fill="none" stroke="#000" strokeWidth="1.5" transform="translate(0, 8)"/>
    <ellipse rx="12" ry="2" fill="none" stroke="#000" strokeWidth="1" transform="translate(0, 14)"/>
  </g>

  {/* Logo Text */}
  <text x="700" y="370" textAnchor="middle" fontSize="290" fontFamily="Arial, sans-serif" fill="url(#textGradient)" letterSpacing="0.05em">
    Grubana
  </text>
</svg>
    </div>
  );
};

export default Logo;
