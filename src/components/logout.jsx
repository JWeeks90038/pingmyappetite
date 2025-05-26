// src/components/LogoutLink.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { logoutUser } from '../utils/firebaseUtils';

const LogoutLink = () => {
  const navigate = useNavigate();

  const handleLogout = async (e) => {
    e.preventDefault();
    try {
      await logoutUser();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error.message);
    }
  };

  return (
    <a href="/login" onClick={handleLogout} className="logout-link">
      Logout
    </a>
  );
};

export default LogoutLink;
