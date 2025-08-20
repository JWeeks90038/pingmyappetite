// src/components/LogoutLink.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { logoutUser } from '../utils/firebaseUtils';

const LogoutLink = () => {
  const navigate = useNavigate();

  const handleLogout = async (e) => {
    e.preventDefault();
    console.log('🚪 LogoutLink: Logout initiated');
    
    try {
      // Use the updated logoutUser function that handles truck cleanup
      await logoutUser();
      console.log('🚪 LogoutLink: Logout completed successfully');
      navigate('/login');
    } catch (error) {
      console.error('🚪 LogoutLink: Logout failed:', error.message);
    }
  };

  return (
    <a href="/login" onClick={handleLogout} className="logout-link">
      Logout
    </a>
  );
};

export default LogoutLink;
